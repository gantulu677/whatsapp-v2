# WhatsApp Business Inbox

Frontend inbox WhatsApp Business berbasis React, Vite, TypeScript, dan Tailwind CSS v4.

## Fitur

- Inbox multi-akun dari tabel `whatsapp_settings`.
- Daftar kontak dan percakapan dari Supabase.
- Riwayat pesan masuk dan keluar dari Supabase.
- Status pesan dari `whatsapp_message_statuses`.
- Metadata lampiran dari `whatsapp_message_media`.
- Pembaruan inbox otomatis melalui Supabase Realtime pada kelima tabel.
- Pencarian kontak dan isi pesan.
- Tampilan responsif untuk desktop dan mobile.

## Menjalankan aplikasi

Persyaratan: Node.js 20.19+ atau 22.12+ dan npm.

```bash
npm install
npm run dev
```

## Validasi

```bash
npm run typecheck
npm run build
```

## Integrasi Supabase

Browser client berada di `src/lib/supabase.ts`. Project URL dan publishable key menggunakan konfigurasi hardcoded. Publishable key memang boleh berada di browser; jangan pernah menaruh Supabase secret/service-role key atau kredensial WhatsApp/Meta di frontend.

Project Supabase: `bkyqbbigfvfaobblxziu`.

### Lima tabel sebagai sumber data

| Tabel | Penggunaan di aplikasi |
|---|---|
| `whatsapp_settings` | Daftar akun WhatsApp dan nomor bisnis |
| `whatsapp_contacts` | Identitas kontak dan pengelompokan percakapan |
| `whatsapp_messages` | Isi, arah, dan waktu pesan |
| `whatsapp_message_statuses` | Status pengiriman pesan |
| `whatsapp_message_media` | Metadata lampiran pesan |

Pengambilan data dilakukan di `src/lib/whatsapp.ts`. Aplikasi berlangganan ke event `postgres_changes` (INSERT, UPDATE, DELETE) pada kelima tabel melalui satu channel. Ketika event diterima, inbox dimuat ulang agar relasi kontak, pesan, status, dan media tetap konsisten. Event yang datang berdekatan dikelompokkan dengan debounce singkat. Aplikasi tidak lagi menggunakan `src/data/mockData.ts` sebagai sumber inbox.

Kelima tabel harus terdaftar pada publication `supabase_realtime`. Kelima tabel pada proyek saat ini sudah terdaftar dan diverifikasi.

### Kebijakan akses database

Kelima tabel tersebut memiliki RLS aktif dan policy public access yang memberikan akses CRUD kepada role `anon` dan `authenticated`, sesuai konfigurasi Supabase proyek saat ini. Karena akses tersebut bersifat publik, data di kelima tabel dapat dibaca dan diubah oleh klien yang memiliki project URL dan publishable key. Repository ini mengikuti konfigurasi yang sudah ada dan tidak mengubah skema, RLS, maupun policy Supabase.

### Batas integrasi pengiriman pesan

- `whatsapp-webhook` adalah endpoint server-to-server untuk menerima webhook Meta dan tidak dipanggil dari browser.
- `whatsapp-send-message` belum dihubungkan ke UI. Pengiriman pesan tetap nonaktif sampai tersedia kontrak backend dengan autentikasi, otorisasi, dan kontrol penyalahgunaan yang sesuai.
- UI saat ini merupakan inbox baca dari data Supabase. Menulis baris langsung ke `whatsapp_messages` tidak sama dengan mengirim pesan ke WhatsApp.

## Struktur utama

```text
src/
  App.tsx
  types.ts
  data/
    mockData.ts       # data demo lama; tidak digunakan oleh inbox aktif
  lib/
    supabase.ts       # inisialisasi Supabase client
    whatsapp.ts       # query dan pemetaan lima tabel Supabase
  main.tsx
  styles.css
```
