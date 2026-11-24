export type MessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'received'
  | 'unknown'

export interface WhatsAppAccount {
  id: string
  name: string
  phoneNumber: string
  phoneNumberId: string
  isActive: boolean
  color: string
}

export interface ChatMessage {
  id: string
  text: string
  timestamp: string
  direction: 'in' | 'out'
  status?: MessageStatus
  attachments?: string[]
}

export interface Conversation {
  id: string
  accountId: string
  name: string
  phone: string
  avatar: string
  color: string
  lastMessage: string
  lastMessageAt: string
  unread: number
  messages: ChatMessage[]
}
