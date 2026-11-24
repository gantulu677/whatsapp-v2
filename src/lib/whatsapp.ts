import { supabase } from './supabase'
import type { ChatMessage, Conversation, MessageStatus, WhatsAppAccount } from '../types'

type SettingRow = {
  id: string
  name: string
  phone_number_id: string
  business_account_id: string
  api_version: string
  is_active: boolean
}

type ContactRow = {
  id: string
  account_id: string
  phone_number_id: string
  wa_id: string
  profile_name: string | null
  last_seen_at: string
}

type MessageRow = {
  id: string
  contact_id: string
  account_id: string
  phone_number_id: string
  sender_wa_id: string
  contact_wa_id: string
  message_id: string | null
  message_timestamp: string
  message_type: string
  message_content: string | null
  direction: 'inbound' | 'outbound' | 'unknown'
  status: MessageStatus
  display_phone_number: string | null
}

type StatusRow = {
  whatsapp_message_id: string
  status: MessageStatus
  status_timestamp: string
}

type MediaRow = {
  whatsapp_message_id: string
  filename: string | null
  mime_type: string | null
  caption: string | null
}

const accountColors = ['#00a884', '#6478d3', '#b78ad5', '#d49a62']

function initials(name: string) {
  return name
    .trim()
    .split(/\\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function fetchWhatsAppInbox(): Promise<{
  accounts: WhatsAppAccount[]
  conversations: Conversation[]
}> {
  const [settingsResult, contactsResult, messagesResult, statusesResult, mediaResult] =
    await Promise.all([
      supabase
        .from('whatsapp_settings')
        .select('id,name,phone_number_id,business_account_id,api_version,is_active')
        .order('created_at', { ascending: true }),
      supabase
        .from('whatsapp_contacts')
        .select('id,account_id,phone_number_id,wa_id,profile_name,last_seen_at')
        .order('last_seen_at', { ascending: false }),
      supabase
        .from('whatsapp_messages')
        .select('id,contact_id,account_id,phone_number_id,sender_wa_id,contact_wa_id,message_id,message_timestamp,message_type,message_content,direction,status,display_phone_number')
        .order('message_timestamp', { ascending: true }),
      supabase
        .from('whatsapp_message_statuses')
        .select('whatsapp_message_id,status,status_timestamp')
        .order('status_timestamp', { ascending: false }),
      supabase
        .from('whatsapp_message_media')
        .select('whatsapp_message_id,filename,mime_type,caption'),
    ])

  const error =
    settingsResult.error ??
    contactsResult.error ??
    messagesResult.error ??
    statusesResult.error ??
    mediaResult.error

  if (error) throw error

  const settings = (settingsResult.data ?? []) as SettingRow[]
  const contacts = (contactsResult.data ?? []) as ContactRow[]
  const messages = (messagesResult.data ?? []) as MessageRow[]
  const statuses = (statusesResult.data ?? []) as StatusRow[]
  const media = (mediaResult.data ?? []) as MediaRow[]

  const latestStatusByMessage = new Map<string, MessageStatus>()
  for (const status of statuses) {
    if (!latestStatusByMessage.has(status.whatsapp_message_id)) {
      latestStatusByMessage.set(status.whatsapp_message_id, status.status)
    }
  }

  const mediaByMessage = new Map<string, string[]>()
  for (const item of media) {
    const label = item.filename || item.caption || item.mime_type || 'Lampiran'
    const current = mediaByMessage.get(item.whatsapp_message_id) ?? []
    current.push(label)
    mediaByMessage.set(item.whatsapp_message_id, current)
  }

  const displayPhoneByAccount = new Map<string, string>()
  for (const item of messages) {
    if (item.display_phone_number && !displayPhoneByAccount.has(item.account_id)) {
      displayPhoneByAccount.set(item.account_id, item.display_phone_number)
    }
  }

  const accounts: WhatsAppAccount[] = settings.map((setting, index) => ({
    id: setting.id,
    name: setting.name,
    phoneNumberId: setting.phone_number_id,
    phoneNumber: displayPhoneByAccount.get(setting.id) ?? setting.phone_number_id,
    isActive: setting.is_active,
    color: accountColors[index % accountColors.length],
  }))

  const messagesByContact = new Map<string, MessageRow[]>()
  for (const item of messages) {
    const current = messagesByContact.get(item.contact_id) ?? []
    current.push(item)
    messagesByContact.set(item.contact_id, current)
  }

  const conversations: Conversation[] = contacts.map((contact) => {
    const contactMessages = messagesByContact.get(contact.id) ?? []
    const chatMessages: ChatMessage[] = contactMessages.map((item) => {
      const attachments = mediaByMessage.get(item.id) ?? []
      return {
        id: item.id,
        text: item.message_content || (attachments.length ? '' : `[${item.message_type}]`),
        timestamp: formatTime(item.message_timestamp),
        direction: item.direction === 'outbound' ? 'out' : 'in',
        status: latestStatusByMessage.get(item.id) ?? item.status,
        attachments,
      }
    })
    const latestMessage = contactMessages[contactMessages.length - 1]
    const latestAttachments = latestMessage ? mediaByMessage.get(latestMessage.id) ?? [] : []
    return {
      id: contact.id,
      accountId: contact.account_id,
      name: contact.profile_name?.trim() || contact.wa_id,
      phone: contact.wa_id,
      avatar: initials(contact.profile_name || contact.wa_id),
      color: accountColors[Math.max(0, settings.findIndex((item) => item.id === contact.account_id)) % accountColors.length],
      lastMessage: latestMessage
        ? latestMessage.message_content || latestAttachments[0] || `[${latestMessage.message_type}]`
        : 'Belum ada pesan',
      lastMessageAt: latestMessage ? formatTime(latestMessage.message_timestamp) : formatTime(contact.last_seen_at),
      unread: 0,
      messages: chatMessages,
    }
  })

  return { accounts, conversations }
}


/**
 * Subscribe to row changes across all WhatsApp tables.
 * The callback refreshes the normalized inbox so foreign-key relationships
 * and related status/media rows stay consistent in the UI.
 */
export function subscribeToWhatsAppChanges(onChange: () => void) {
  const channel = supabase
    .channel('whatsapp-inbox-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_settings' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_contacts' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_message_statuses' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_message_media' }, onChange)
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('WhatsApp Realtime subscription:', status)
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}


export type SendWhatsAppTextResult = {
  success: boolean
  delivery_unknown?: boolean
  saved_message?: { id: string; message_id?: string | null; status: string }
}

export async function sendWhatsAppText(input: {
  phoneNumberId: string
  to: string
  message: string
}): Promise<SendWhatsAppTextResult> {
  const { data, error } = await supabase.functions.invoke('whatsapp-send-message', {
    body: {
      phone_number_id: input.phoneNumberId,
      to: input.to,
      message: input.message,
      client_request_id: crypto.randomUUID(),
    },
  })

  if (error) {
    const context = (error as { context?: Response }).context
    if (context) {
      const details = await context.clone().json().catch(() => null) as { error?: string; details?: string } | null
      if (details?.error) {
        throw new Error(details.details ? `${details.error}: ${details.details}` : details.error)
      }
    }
    throw new Error(error.message)
  }

  if (!data?.success) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'WhatsApp gagal menerima pesan.')
  }

  return data as SendWhatsAppTextResult
}
