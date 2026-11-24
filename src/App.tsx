import { useMemo, useState, type FormEvent } from 'react'
import {
  Archive, ArrowLeft, Check, CheckCheck, ChevronDown, CircleHelp,
  Filter, Headphones, Image, MessageCircle, MoreVertical, Paperclip, Plus, Search,
  Send, Settings, Smile, Users, Video, Phone,
} from 'lucide-react'
import { mockAccounts, mockConversations } from './data/mockData'
import type { Conversation } from './types'

function App() {
  const [activeAccountId, setActiveAccountId] = useState(mockAccounts[0].id)
  const [conversations, setConversations] = useState(mockConversations)
  const [activeChatId, setActiveChatId] = useState<string | null>(mockConversations[0].id)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  const activeAccount = mockAccounts.find((account) => account.id === activeAccountId) ?? mockAccounts[0]
  const accountConversations = useMemo(
    () => conversations
      .filter((chat) => chat.accountId === activeAccountId)
      .filter((chat) => `${chat.name} ${chat.phone} ${chat.lastMessage}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.id.localeCompare(a.id)),
    [conversations, activeAccountId, search],
  )
  const activeChat = conversations.find((chat) => chat.id === activeChatId && chat.accountId === activeAccountId) ?? null

  function selectAccount(accountId: string) {
    setActiveAccountId(accountId)
    setActiveChatId(null)
    setMobileChatOpen(false)
    setShowAccountMenu(false)
  }

  function selectChat(chat: Conversation) {
    setActiveChatId(chat.id)
    setMobileChatOpen(true)
    setConversations((current) => current.map((item) => item.id === chat.id ? { ...item, unread: 0 } : item))
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = message.trim()
    if (!text || !activeChat) return
    const now = new Date()
    const timestamp = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    setConversations((current) => current.map((chat) => chat.id === activeChat.id
      ? {
          ...chat,
          lastMessage: text,
          lastMessageAt: timestamp,
          messages: [...chat.messages, { id: `local-${Date.now()}`, text, timestamp, direction: 'out', status: 'sent' }],
        }
      : chat))
    setMessage('')
  }

  return (
    <div className="app-shell">
      <div className="top-accent" />
      <main className="workspace">
        <aside className={`sidebar ${mobileChatOpen ? 'sidebar-hidden-mobile' : ''}`}>
          <header className="sidebar-header">
            <div className="brand-lockup">
              <div className="brand-icon"><MessageCircle size={20} strokeWidth={2.5} /></div>
              <div><strong>WhatsApp</strong><span>Business Inbox</span></div>
            </div>
            <div className="header-actions">
              <button className="icon-button" aria-label="Bantuan"><CircleHelp size={19} /></button>
              <button className="icon-button" aria-label="Pengaturan"><Settings size={19} /></button>
            </div>
          </header>

          <div className="account-wrap">
            <button className="account-switcher" onClick={() => setShowAccountMenu((value) => !value)} aria-expanded={showAccountMenu}>
              <span className="account-avatar" style={{ background: activeAccount.color }}><MessageCircle size={17} /></span>
              <span className="account-meta"><strong>{activeAccount.name}</strong><small>{activeAccount.phoneNumber}</small></span>
              <ChevronDown size={17} className={showAccountMenu ? 'rotate' : ''} />
            </button>
            {showAccountMenu && (
              <div className="account-menu">
                <span className="menu-label">PILIH AKUN WHATSAPP</span>
                {mockAccounts.map((account) => (
                  <button key={account.id} className={`account-option ${account.id === activeAccountId ? 'selected' : ''}`} onClick={() => selectAccount(account.id)}>
                    <span className="account-avatar small" style={{ background: account.color }}><MessageCircle size={14} /></span>
                    <span><strong>{account.name}</strong><small>{account.phoneNumber}</small></span>
                    {account.id === activeAccountId && <Check size={16} />}
                  </button>
                ))}
                <div className="menu-footnote">Akun demo · data lokal</div>
              </div>
            )}
          </div>

          <section className="inbox-heading">
            <div><h1>Inbox</h1><span>{accountConversations.length} percakapan</span></div>
            <button className="new-chat-button" aria-label="Percakapan baru"><Plus size={18} /></button>
          </section>

          <div className="search-row">
            <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari atau mulai chat baru" /></div>
            <button className="filter-button" aria-label="Filter"><Filter size={17} /></button>
          </div>

          <div className="inbox-tabs"><button className="active">Semua <span>{accountConversations.length}</span></button><button>Belum dibaca</button><button>Favorit</button></div>

          <section className="conversation-list" aria-label="Daftar percakapan">
            {accountConversations.length === 0 ? (
              <div className="empty-search"><Search size={22} /><strong>Tidak ada percakapan</strong><span>Coba kata kunci lain.</span></div>
            ) : accountConversations.map((chat) => (
              <button key={chat.id} className={`conversation-item ${activeChatId === chat.id ? 'conversation-active' : ''}`} onClick={() => selectChat(chat)}>
                <div className="contact-avatar" style={{ background: chat.color }}>{chat.avatar}{chat.online && <i />}</div>
                <div className="conversation-copy">
                  <div className="conversation-top"><strong>{chat.name}</strong><time>{chat.lastMessageAt}</time></div>
                  <div className="conversation-bottom"><span>{chat.lastMessage}</span>{chat.unread > 0 && <b>{chat.unread}</b>}</div>
                </div>
              </button>
            ))}
          </section>

          <footer className="sidebar-footer"><div className="demo-indicator"><i /> Mode demo aktif</div><span>WhatsApp Inbox <b>v1.0</b></span></footer>
        </aside>

        <section className={`chat-panel ${mobileChatOpen ? 'chat-visible-mobile' : ''}`}>
          {activeChat ? (
            <>
              <header className="chat-header">
                <button className="icon-button mobile-back" onClick={() => setMobileChatOpen(false)} aria-label="Kembali ke inbox"><ArrowLeft size={20} /></button>
                <div className="contact-avatar header-avatar" style={{ background: activeChat.color }}>{activeChat.avatar}</div>
                <div className="chat-contact"><strong>{activeChat.name}</strong><span>{activeChat.online ? 'online' : activeChat.phone}</span></div>
                <div className="chat-actions"><button className="icon-button" aria-label="Panggilan suara"><Phone size={19} /></button><button className="icon-button" aria-label="Panggilan video"><Video size={20} /></button><button className="icon-button" aria-label="Cari dalam chat"><Search size={19} /></button><button className="icon-button" aria-label="Menu"><MoreVertical size={20} /></button></div>
              </header>

              <div className="chat-context"><span>🔒</span> Pesan dan panggilan terenkripsi secara end-to-end.</div>
              <div className="message-scroll">
                <div className="date-divider"><span>HARI INI</span></div>
                {activeChat.messages.map((item) => (
                  <div key={item.id} className={`message-row ${item.direction === 'out' ? 'outgoing' : 'incoming'}`}>
                    <div className="message-bubble">
                      <p>{item.text}</p>
                      <div className="message-meta"><time>{item.timestamp}</time>{item.direction === 'out' && <CheckCheck size={14} className={item.status === 'read' ? 'read-check' : ''} />}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form className="composer" onSubmit={sendMessage}>
                <button type="button" className="icon-button composer-tool" aria-label="Emoji"><Smile size={22} /></button>
                <button type="button" className="icon-button composer-tool attach-button" aria-label="Lampiran"><Paperclip size={21} /></button>
                <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ketik pesan..." aria-label="Ketik pesan" />
                {message.trim() ? <button type="submit" className="send-button" aria-label="Kirim pesan"><Send size={18} /></button> : <button type="button" className="icon-button composer-tool" aria-label="Kirim gambar"><Image size={21} /></button>}
              </form>
              <div className="composer-note">Balasan tersimpan sebagai simulasi lokal, belum dikirim ke WhatsApp.</div>
            </>
          ) : (
            <div className="welcome-panel">
              <div className="welcome-art"><div className="welcome-orbit orbit-one" /><div className="welcome-orbit orbit-two" /><div className="welcome-icon"><MessageCircle size={54} strokeWidth={1.5} /></div><span className="float-dot dot-one" /><span className="float-dot dot-two" /></div>
              <h2>Selamat datang di WhatsApp Inbox</h2>
              <p>Pilih percakapan dari daftar untuk mulai membaca dan membalas pesan pelanggan.</p>
              <div className="welcome-hint"><Headphones size={16} /> Semua percakapan akun terpilih tampil di sini</div>
              <span className="welcome-version">WHATSAPP BUSINESS INBOX · DEMO</span>
            </div>
          )}
        </section>
      </main>
      <div className="mobile-bottom-bar"><button className="active"><MessageCircle size={19} /><span>Chat</span></button><button><Users size={19} /><span>Kontak</span></button><button><Archive size={19} /><span>Arsip</span></button><button><Settings size={19} /><span>Setelan</span></button></div>
    </div>
  )
}

export default App