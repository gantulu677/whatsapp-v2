import { useEffect, useMemo, useState } from 'react'
import {
  Archive, ArrowLeft, CheckCheck, ChevronDown, CircleHelp, Filter,
  Headphones, Image, MessageCircle, MoreVertical, Paperclip, Plus,
  RefreshCw, Search, Settings, Smile, Users, Video, Phone,
} from 'lucide-react'
import { fetchWhatsAppInbox, subscribeToWhatsAppChanges } from './lib/whatsapp'
import type { Conversation, WhatsAppAccount } from './types'

function App() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeAccountId, setActiveAccountId] = useState('')
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  async function loadInbox(silent = false) {
    if (!silent) setLoading(true)
    setLoadError('')
    try {
      const result = await fetchWhatsAppInbox()
      setAccounts(result.accounts)
      setConversations(result.conversations)
      setActiveAccountId((current) =>
        result.accounts.some((account) => account.id === current)
          ? current
          : result.accounts[0]?.id ?? '',
      )
      setActiveChatId((current) =>
        result.conversations.some((chat) => chat.id === current)
          ? current
          : result.conversations[0]?.id ?? null,
      )
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat data Supabase.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadInbox()
  }, [])

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = subscribeToWhatsAppChanges(() => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        void loadInbox(true)
      }, 250)
    })

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      unsubscribe()
    }
  }, [])

  const activeAccount = accounts.find((account) => account.id === activeAccountId) ?? null
  const accountConversations = useMemo(
    () => conversations
      .filter((chat) => chat.accountId === activeAccountId)
      .filter((chat) => `${chat.name} ${chat.phone} ${chat.lastMessage}`.toLowerCase().includes(search.toLowerCase())),
    [conversations, activeAccountId, search],
  )
  const activeChat = conversations.find(
    (chat) => chat.id === activeChatId && chat.accountId === activeAccountId,
  ) ?? null

  function selectAccount(accountId: string) {
    setActiveAccountId(accountId)
    const firstChat = conversations.find((chat) => chat.accountId === accountId)
    setActiveChatId(firstChat?.id ?? null)
    setMobileChatOpen(false)
    setShowAccountMenu(false)
  }

  function selectChat(chat: Conversation) {
    setActiveChatId(chat.id)
    setMobileChatOpen(true)
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
              <button className="icon-button" aria-label="Muat ulang data" onClick={() => void loadInbox()} disabled={loading}>
                <RefreshCw size={18} />
              </button>
              <button className="icon-button" aria-label="Bantuan"><CircleHelp size={19} /></button>
              <button className="icon-button" aria-label="Pengaturan"><Settings size={19} /></button>
            </div>
          </header>

          <div className="account-wrap">
            <button className="account-switcher" onClick={() => setShowAccountMenu((value) => !value)} aria-expanded={showAccountMenu} disabled={!activeAccount}>
              <span className="account-avatar" style={{ background: activeAccount?.color ?? '#64748b' }}><MessageCircle size={17} /></span>
              <span className="account-meta">
                <strong>{activeAccount?.name ?? 'Belum ada akun WhatsApp'}</strong>
                <small>{activeAccount ? activeAccount.phoneNumber : 'Tambahkan data di whatsapp_settings'}</small>
              </span>
              <ChevronDown size={17} className={showAccountMenu ? 'rotate' : ''} />
            </button>
            {showAccountMenu && (
              <div className="account-menu">
                <span className="menu-label">PILIH AKUN WHATSAPP</span>
                {accounts.map((account) => (
                  <button key={account.id} className={`account-option ${account.id === activeAccountId ? 'selected' : ''}`} onClick={() => selectAccount(account.id)}>
                    <span className="account-avatar small" style={{ background: account.color }}><MessageCircle size={14} /></span>
                    <span><strong>{account.name}</strong><small>{account.phoneNumber}</small></span>
                    {account.id === activeAccountId && <CheckCheck size={16} />}
                  </button>
                ))}
                <div className="menu-footnote">Data akun dari whatsapp_settings</div>
              </div>
            )}
          </div>

          <section className="inbox-heading">
            <div><h1>Inbox</h1><span>{accountConversations.length} percakapan</span></div>
            <button className="new-chat-button" aria-label="Percakapan baru" disabled><Plus size={18} /></button>
          </section>

          <div className="search-row">
            <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kontak atau pesan" /></div>
            <button className="filter-button" aria-label="Filter" disabled><Filter size={17} /></button>
          </div>

          <div className="inbox-tabs"><button className="active">Semua <span>{accountConversations.length}</span></button><button disabled>Belum dibaca</button><button disabled>Favorit</button></div>

          <section className="conversation-list" aria-label="Daftar percakapan">
            {loading ? (
              <div className="empty-search"><RefreshCw size={22} /><strong>Memuat inbox...</strong><span>Mengambil data dari Supabase.</span></div>
            ) : loadError ? (
              <div className="empty-search"><CircleHelp size={22} /><strong>Gagal memuat inbox</strong><span>{loadError}</span><button onClick={() => void loadInbox()}>Coba lagi</button></div>
            ) : accountConversations.length === 0 ? (
              <div className="empty-search"><Search size={22} /><strong>Belum ada percakapan</strong><span>Kontak dan pesan akan tampil setelah tersedia di Supabase.</span></div>
            ) : accountConversations.map((chat) => (
              <button key={chat.id} className={`conversation-item ${activeChatId === chat.id ? 'conversation-active' : ''}`} onClick={() => selectChat(chat)}>
                <div className="contact-avatar" style={{ background: chat.color }}>{chat.avatar}</div>
                <div className="conversation-copy">
                  <div className="conversation-top"><strong>{chat.name}</strong><time>{chat.lastMessageAt}</time></div>
                  <div className="conversation-bottom"><span>{chat.lastMessage}</span></div>
                </div>
              </button>
            ))}
          </section>

          <footer className="sidebar-footer"><div className="demo-indicator"><i /> Terhubung ke Supabase</div><span>WhatsApp Inbox <b>v1.0</b></span></footer>
        </aside>

        <section className={`chat-panel ${mobileChatOpen ? 'chat-visible-mobile' : ''}`}>
          {loading ? (
            <div className="welcome-panel"><div className="welcome-icon"><RefreshCw size={42} /></div><h2>Memuat percakapan</h2><p>Mengambil akun, kontak, pesan, status, dan media dari Supabase.</p></div>
          ) : loadError ? (
            <div className="welcome-panel"><div className="welcome-icon"><CircleHelp size={42} /></div><h2>Koneksi Supabase gagal</h2><p>{loadError}</p><button onClick={() => void loadInbox()}>Coba lagi</button></div>
          ) : activeChat ? (
            <>
              <header className="chat-header">
                <button className="icon-button mobile-back" onClick={() => setMobileChatOpen(false)} aria-label="Kembali ke inbox"><ArrowLeft size={20} /></button>
                <div className="contact-avatar header-avatar" style={{ background: activeChat.color }}>{activeChat.avatar}</div>
                <div className="chat-contact"><strong>{activeChat.name}</strong><span>{activeChat.phone}</span></div>
                <div className="chat-actions"><button className="icon-button" aria-label="Panggilan suara" disabled><Phone size={19} /></button><button className="icon-button" aria-label="Panggilan video" disabled><Video size={20} /></button><button className="icon-button" aria-label="Cari dalam chat"><Search size={19} /></button><button className="icon-button" aria-label="Menu"><MoreVertical size={20} /></button></div>
              </header>

              <div className="chat-context"><span>●</span> Riwayat percakapan dimuat dari database Supabase.</div>
              <div className="message-scroll">
                <div className="date-divider"><span>RIWAYAT PESAN</span></div>
                {activeChat.messages.length === 0 ? (
                  <div className="empty-search"><MessageCircle size={22} /><strong>Belum ada pesan</strong><span>Pesan untuk kontak ini akan tampil di sini.</span></div>
                ) : activeChat.messages.map((item) => (
                  <div key={item.id} className={`message-row ${item.direction === 'out' ? 'outgoing' : 'incoming'}`}>
                    <div className="message-bubble">
                      {item.text && <p>{item.text}</p>}
                      {item.attachments?.map((attachment, index) => <p key={`${item.id}-media-${index}`} className="message-attachment"><Image size={14} /> {attachment}</p>)}
                      <div className="message-meta">
                        <time>{item.timestamp}</time>
                        {item.direction === 'out' && <CheckCheck size={14} className={item.status === 'read' ? 'read-check' : ''} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form className="composer" onSubmit={(event) => event.preventDefault()}>
                <button type="button" className="icon-button composer-tool" aria-label="Emoji" disabled><Smile size={22} /></button>
                <button type="button" className="icon-button composer-tool attach-button" aria-label="Lampiran" disabled><Paperclip size={21} /></button>
                <input disabled placeholder="Pengiriman pesan belum diaktifkan" aria-label="Ketik pesan" />
                <button type="button" className="icon-button composer-tool" aria-label="Kirim gambar" disabled><Image size={21} /></button>
              </form>
              <div className="composer-note">Mode baca aktif. Pengiriman pesan memerlukan endpoint backend yang aman dan belum dihubungkan.</div>
            </>
          ) : (
            <div className="welcome-panel">
              <div className="welcome-art"><div className="welcome-orbit orbit-one" /><div className="welcome-orbit orbit-two" /><div className="welcome-icon"><MessageCircle size={54} strokeWidth={1.5} /></div><span className="float-dot dot-one" /><span className="float-dot dot-two" /></div>
              <h2>Selamat datang di WhatsApp Inbox</h2>
              <p>Pilih percakapan dari daftar untuk membaca riwayat pesan yang tersimpan di Supabase.</p>
              <div className="welcome-hint"><Headphones size={16} /> Semua data inbox berasal dari lima tabel WhatsApp</div>
              <span className="welcome-version">WHATSAPP BUSINESS INBOX · SUPABASE</span>
            </div>
          )}
        </section>
      </main>
      <div className="mobile-bottom-bar"><button className="active"><MessageCircle size={19} /><span>Chat</span></button><button disabled><Users size={19} /><span>Kontak</span></button><button disabled><Archive size={19} /><span>Arsip</span></button><button disabled><Settings size={19} /><span>Setelan</span></button></div>
    </div>
  )
}

export default App
