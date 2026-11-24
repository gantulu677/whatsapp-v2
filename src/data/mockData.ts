import type { Conversation, WhatsAppAccount } from '../types'

export const mockAccounts: WhatsAppAccount[] = [
  { id: 'account-1', name: 'Toko Gantulu', phoneNumber: '+62 812-3456-7890', phoneNumberId: 'demo-phone-number-001', color: '#00a884' },
  { id: 'account-2', name: 'Customer Care', phoneNumber: '+62 811-2222-3333', phoneNumberId: 'demo-phone-number-002', color: '#6478d3' },
]

export const mockConversations: Conversation[] = [
  {
    id: 'chat-1', accountId: 'account-1', name: 'Alya Putri', phone: '+62 812-1111-2222', avatar: 'AP', color: '#e8b4a0', lastMessage: 'Baik kak, saya tunggu ya 🙏', lastMessageAt: '10:42', unread: 2, online: true,
    messages: [
      { id: 'm1', text: 'Halo kak, saya mau tanya produk yang kemarin.', timestamp: '10:31', direction: 'in' },
      { id: 'm2', text: 'Halo Kak Alya! Tentu, ada yang bisa kami bantu?', timestamp: '10:33', direction: 'out', status: 'read' },
      { id: 'm3', text: 'Untuk warna hitam masih tersedia?', timestamp: '10:40', direction: 'in' },
      { id: 'm4', text: 'Masih tersedia kak. Mau kami bantu buatkan pesanan?', timestamp: '10:41', direction: 'out', status: 'read' },
      { id: 'm5', text: 'Baik kak, saya tunggu ya 🙏', timestamp: '10:42', direction: 'in' },
    ],
  },
  {
    id: 'chat-2', accountId: 'account-1', name: 'Budi Santoso', phone: '+62 813-5555-6666', avatar: 'BS', color: '#8eb9a6', lastMessage: 'Oke, terima kasih informasinya.', lastMessageAt: '09:18', unread: 0,
    messages: [
      { id: 'm6', text: 'Apakah bisa dikirim hari ini?', timestamp: '09:10', direction: 'in' },
      { id: 'm7', text: 'Bisa, pesanan sebelum pukul 14.00 akan kami proses hari ini.', timestamp: '09:13', direction: 'out', status: 'read' },
      { id: 'm8', text: 'Oke, terima kasih informasinya.', timestamp: '09:18', direction: 'in' },
    ],
  },
  {
    id: 'chat-3', accountId: 'account-1', name: 'Nadia Rahma', phone: '+62 857-1234-5678', avatar: 'NR', color: '#c7a5d8', lastMessage: 'Boleh minta katalog produknya?', lastMessageAt: 'Kemarin', unread: 1,
    messages: [{ id: 'm9', text: 'Boleh minta katalog produknya?', timestamp: 'Kemarin', direction: 'in' }],
  },
  {
    id: 'chat-4', accountId: 'account-2', name: 'Rizky Pratama', phone: '+62 878-9876-5432', avatar: 'RP', color: '#d4b17e', lastMessage: 'Paket sudah saya terima.', lastMessageAt: '08:05', unread: 0,
    messages: [
      { id: 'm10', text: 'Paket sudah saya terima.', timestamp: '08:05', direction: 'in' },
      { id: 'm11', text: 'Terima kasih sudah berbelanja! 😊', timestamp: '08:07', direction: 'out', status: 'read' },
    ],
  },
]