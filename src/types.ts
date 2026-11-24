export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface WhatsAppAccount {
  id: string
  name: string
  phoneNumber: string
  phoneNumberId: string
  color: string
}

export interface ChatMessage {
  id: string
  text: string
  timestamp: string
  direction: 'in' | 'out'
  status?: MessageStatus
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
  online?: boolean
  messages: ChatMessage[]
}