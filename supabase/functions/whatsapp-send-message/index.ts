import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON" }, 400);
    }

    const body = payload as {
      phone_number_id?: unknown;
      to?: unknown;
      message?: unknown;
      client_request_id?: unknown;
    };

    const phoneNumberId = typeof body.phone_number_id === "string" ? body.phone_number_id.trim() : "";
    const to = typeof body.to === "string" ? body.to.replace(/\D/g, "") : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!/^\d{5,30}$/.test(phoneNumberId)) {
      return jsonResponse({ error: "Invalid phone_number_id" }, 400);
    }
    if (!/^\d{8,15}$/.test(to)) {
      return jsonResponse({ error: "Invalid recipient number", details: "Use international format with country code, digits only (8-15 digits)." }, 400);
    }
    if (!message) return jsonResponse({ error: "Message must not be empty" }, 400);
    if (message.length > 4096) return jsonResponse({ error: "Message exceeds the 4096 character limit" }, 400);

    // Optional for backward compatibility. Clients should generate one UUID per
    // logical send and reuse it for every retry of that same request.
    const suppliedRequestId = typeof body.client_request_id === "string" ? body.client_request_id.trim() : "";
    if (suppliedRequestId && !isUuid(suppliedRequestId)) {
      return jsonResponse({ error: "client_request_id must be a valid UUID" }, 400);
    }
    const clientRequestId = suppliedRequestId || crypto.randomUUID();

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    if (!supabaseUrl || !serviceRoleKey || !accessToken) {
      console.error("Required server environment variables are missing.");
      return jsonResponse({ error: "Server configuration incomplete" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: account, error: accountError } = await supabase
      .from("whatsapp_settings")
      .select("id, phone_number_id, business_account_id, api_version")
      .eq("phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .maybeSingle();

    if (accountError) {
      console.error("Failed to load WhatsApp account configuration:", accountError.message);
      return jsonResponse({ error: "Unable to load WhatsApp account configuration" }, 500);
    }
    if (!account) return jsonResponse({ error: "WhatsApp account not found or inactive" }, 404);
    if (!/^v\d+\.\d+$/.test(account.api_version)) {
      console.error("Invalid api_version configured for WhatsApp account.");
      return jsonResponse({ error: "WhatsApp account API version is invalid" }, 500);
    }

    // WhatsApp free-form text is allowed only within 24 hours of the latest
    // inbound customer message. Enforce the service window on the server.
    const serviceWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentInbound, error: windowError } = await supabase
      .from("whatsapp_messages")
      .select("id,message_timestamp")
      .eq("account_id", account.id)
      .eq("contact_wa_id", to)
      .eq("direction", "inbound")
      .gte("message_timestamp", serviceWindowStart)
      .order("message_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (windowError) {
      console.error("Failed to check WhatsApp customer service window:", windowError.message);
      return jsonResponse({ error: "Unable to verify the 24-hour customer service window" }, 500);
    }
    if (!recentInbound) {
      return jsonResponse({
        error: "The 24-hour customer service window has expired",
        details: "Send a free-form text reply only after the customer sends a new message. Template messages are not enabled in this application.",
      }, 403);
    }

    const now = new Date().toISOString();
    const { data: contact, error: contactError } = await supabase
      .from("whatsapp_contacts")
      .upsert({
        account_id: account.id,
        phone_number_id: account.phone_number_id,
        wa_id: to,
        last_seen_at: now,
        updated_at: now,
      }, { onConflict: "phone_number_id,wa_id" })
      .select("id")
      .single();

    if (contactError) {
      console.error("Failed to resolve WhatsApp contact:", contactError.message);
      return jsonResponse({ error: "Unable to resolve recipient contact" }, 500);
    }

    const requestPayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: message },
    };

    // Persist pending BEFORE calling Meta. The unique (account_id, client_request_id)
    // index prevents duplicate sends when the caller reuses the same request UUID.
    const { data: pendingMessage, error: pendingError } = await supabase
      .from("whatsapp_messages")
      .insert({
        contact_id: contact.id,
        account_id: account.id,
        waba_id: account.business_account_id,
        phone_number_id: account.phone_number_id,
        display_phone_number: null,
        sender_wa_id: to,
        contact_wa_id: to,
        direction: "outbound",
        status: "pending",
        client_request_id: clientRequestId,
        message_id: null,
        message_timestamp: now,
        message_type: "text",
        message_content: message,
        raw_message: {
          direction: "outgoing",
          recipient: { wa_id: to },
          request: requestPayload,
          client_request_id: clientRequestId,
        },
      })
      .select("id,message_id,status,client_request_id")
      .single();

    if (pendingError) {
      if (pendingError.code === "23505") {
        const { data: existing, error: existingError } = await supabase
          .from("whatsapp_messages")
          .select("id,message_id,status,client_request_id,contact_wa_id,message_content,phone_number_id")
          .eq("account_id", account.id)
          .eq("client_request_id", clientRequestId)
          .maybeSingle();

        if (existingError) throw existingError;
        if (!existing) throw pendingError;
        if (existing.phone_number_id !== phoneNumberId || existing.contact_wa_id !== to || existing.message_content !== message) {
          return jsonResponse({ error: "client_request_id has already been used for a different message" }, 409);
        }
        return jsonResponse({
          success: existing.status === "sent" || existing.status === "delivered" || existing.status === "read",
          idempotent_replay: true,
          client_request_id: clientRequestId,
          saved_message: { id: existing.id, message_id: existing.message_id, status: existing.status },
          message: "This client_request_id was already processed. No second WhatsApp send was attempted.",
        }, existing.status === "pending" ? 202 : 200);
      }
      console.error("Failed to create pending WhatsApp message:", pendingError.message);
      return jsonResponse({ error: "Unable to create pending message record" }, 500);
    }

    const graphUrl = "https://graph.facebook.com/" + account.api_version + "/" + account.phone_number_id + "/messages";
    let graphResponse: Response;
    let result: any;

    try {
      graphResponse = await fetch(graphUrl, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });
      result = await graphResponse.json().catch(() => ({}));
    } catch (networkError) {
      const reason = networkError instanceof Error ? networkError.message : "Unknown network error";
      await supabase.from("whatsapp_messages").update({
        error_message: "Delivery outcome is unknown: " + reason,
        raw_message: {
          direction: "outgoing",
          recipient: { wa_id: to },
          request: requestPayload,
          client_request_id: clientRequestId,
          transport_error: reason,
        },
      }).eq("id", pendingMessage.id);
      return jsonResponse({
        success: false,
        delivery_unknown: true,
        client_request_id: clientRequestId,
        saved_message: { id: pendingMessage.id, status: "pending" },
        error: "Network failure while calling WhatsApp. The message remains pending to prevent an unsafe automatic resend.",
      }, 502);
    }

    if (!graphResponse.ok) {
      const metaError = result?.error ?? {};
      const errorCode = metaError.code != null ? String(metaError.code) : null;
      const errorMessage = metaError.error_user_msg ?? metaError.message ?? "WhatsApp API request failed";
      const { error: updateError } = await supabase
        .from("whatsapp_messages")
        .update({
          status: "failed",
          status_updated_at: new Date().toISOString(),
          error_code: errorCode,
          error_message: String(errorMessage),
          raw_message: {
            direction: "outgoing",
            recipient: { wa_id: to },
            request: requestPayload,
            client_request_id: clientRequestId,
            api_error: result,
          },
        })
        .eq("id", pendingMessage.id);

      if (updateError) console.error("Failed to persist Meta send failure:", updateError.message);
      return jsonResponse({
        success: false,
        client_request_id: clientRequestId,
        saved_message: { id: pendingMessage.id, status: updateError ? "pending" : "failed" },
        error: "WhatsApp API request failed",
        details: result,
      }, graphResponse.status >= 400 && graphResponse.status < 600 ? graphResponse.status : 502);
    }

    const wamid = result?.messages?.[0]?.id;
    if (typeof wamid !== "string" || wamid.length === 0) {
      const { error: updateError } = await supabase
        .from("whatsapp_messages")
        .update({
          error_message: "Meta accepted the request but returned no message ID; delivery outcome requires reconciliation.",
          raw_message: {
            direction: "outgoing",
            recipient: { wa_id: to },
            request: requestPayload,
            client_request_id: clientRequestId,
            api_response: result,
          },
        })
        .eq("id", pendingMessage.id);
      if (updateError) console.error("Failed to persist incomplete Meta response:", updateError.message);
      return jsonResponse({
        success: true,
        delivery_unknown: true,
        client_request_id: clientRequestId,
        saved_message: { id: pendingMessage.id, status: "pending" },
        persistence_warning: "Meta accepted the request but returned no message ID. The pending row is retained; do not retry with a new request ID until reconciled.",
      }, 202);
    }

    const { data: savedMessage, error: saveError } = await supabase
      .from("whatsapp_messages")
      .update({
        message_id: wamid,
        status: "sent",
        status_updated_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
        raw_message: {
          direction: "outgoing",
          recipient: { wa_id: to },
          request: requestPayload,
          client_request_id: clientRequestId,
          api_response: result,
        },
      })
      .eq("id", pendingMessage.id)
      .select("id,message_id,status,client_request_id")
      .single();

    if (saveError) {
      console.error("WhatsApp accepted message but database update failed:", saveError.message);
      return jsonResponse({
        success: true,
        delivery_unknown: false,
        client_request_id: clientRequestId,
        saved_message: { id: pendingMessage.id, status: "pending" },
        persistence_warning: "WhatsApp accepted the message, but the wamid could not be saved. Reconcile this pending row before retrying.",
      }, 202);
    }

    return jsonResponse({
      success: true,
      phone_number_id: account.phone_number_id,
      messaging_product: result.messaging_product,
      contacts: result.contacts ?? [],
      messages: result.messages ?? [],
      client_request_id: clientRequestId,
      saved_message: savedMessage,
    });
  } catch (error) {
    console.error("whatsapp-send-message error:", error instanceof Error ? error.message : "Unknown error");
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});