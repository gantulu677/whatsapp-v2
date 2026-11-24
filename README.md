# WhatsApp Business Inbox

Frontend for a WhatsApp-style customer support inbox, built with React, Vite, TypeScript, and Tailwind CSS v4.

## Features

- Mobile-first responsive inbox and chat layout.
- WhatsApp account selector.
- Conversation search and unread indicators.
- Incoming/outgoing message bubbles.
- Local simulated replies (no message is sent to WhatsApp).
- Demo data isolated in `src/data/mockData.ts`.

## Requirements

- Node.js 20.19+ or 22.12+
- npm

## Run locally

```bash
npm install
npm run dev
```

## Validate

```bash
npm run typecheck
npm run build
```

## Supabase integration

The browser client is initialized in `src/lib/supabase.ts` using hardcoded project URL and publishable key. Both values are public client configuration; the publishable key is not a secret. Never place a Supabase secret/service-role key or WhatsApp/Meta credentials in frontend code.

### Current backend contract and safety boundary

- Supabase project: `bkyqbbigfvfaobblxziu` (`ap-southeast-1`).
- WhatsApp tables already exist: `whatsapp_settings`, `whatsapp_contacts`, `whatsapp_messages`, `whatsapp_message_statuses`, and `whatsapp_message_media`.
- Row Level Security is enabled on the WhatsApp tables. The frontend must not query these tables directly unless a deliberate, least-privilege client access policy is designed and reviewed.
- `whatsapp-webhook` is a server-to-server Meta webhook. It must not be called by the browser.
- `whatsapp-send-message` currently has JWT verification disabled. Do not invoke it from this public frontend until caller authentication/authorization and abuse controls have been reviewed.
- There is currently no dedicated inbox/read Edge Function. The UI therefore continues to use local mock data.
- Message sending in the UI remains a local simulation. It does not send a real WhatsApp message.

## Security rules

- The hardcoded publishable key is public by design; protect data with RLS and server-side authorization.
- Never expose `service_role` / secret keys or WhatsApp/Meta credentials in browser code or repository files.
- Do not bypass RLS by adding broad public policies just to make the UI work.
- Keep webhook processing and WhatsApp Graph API calls server-side.
- Keep the UI in demo mode until a secure inbox-read contract and authenticated send contract are available.

## Structure

```
src/
  data/mockData.ts
  lib/supabase.ts
  App.tsx
  main.tsx
  styles.css
  types.ts
```
