# AI Job Hunter - Automatic Job Search & Notification

Aplikasi otomatis untuk mencari lowongan kerja yang cocok dengan profil kandidat dari berbagai sumber (RemoteOK, LinkedIn, Twitter/X, GitHub) dan mengirim notifikasi via Telegram.

## ✨ Fitur Baru

- ✅ **Multi-source scraping**: RemoteOK API + LinkedIn + Twitter/X + GitHub
- ✅ **Smart filtering**: Filter otomatis berdasarkan tech stack, lokasi, dan requirement
- ✅ **AI Analysis**: Menggunakan 9Router (atau Gemini/Demo mode sebagai fallback)
- ✅ **Auto-run**: Berjalan otomatis setiap hari jam 09:00 pagi via Windows Task Scheduler
- ✅ **Telegram notification**: Kirim notifikasi job yang match ke Telegram

## 🚀 Cara Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Konfigurasi .env

Buat file `.env` dengan isi berikut:

```env
# AI Provider (pilih salah satu atau lebih)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_9router_api_key_here
OPENAI_API_BASE=http://localhost:20128/v1

# Telegram Bot (untuk notifikasi)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id

# Demo Mode (untuk testing tanpa API key)
DEMO_MODE=true
```

### 3. Jalankan Manual

```bash
npm start
```

### 4. Setup Auto-Run (Sudah Aktif!)

Program sudah dikonfigurasi untuk berjalan otomatis setiap hari jam **09:00 pagi** via Windows Task Scheduler.

**Untuk mengubah jadwal:**
1. Buka **Task Scheduler** (tekan Win + R, ketik `taskschd.msc`)
2. Cari task bernama **"AI Job Hunter"**
3. Klik kanan → Properties → Triggers → Edit
4. Ubah jadwal sesuai kebutuhan

**Untuk disable auto-run:**
```bash
schtasks /Change /TN "AI Job Hunter" /DISABLE
```

**Untuk enable kembali:**
```bash
schtasks /Change /TN "AI Job Hunter" /ENABLE
```

**Untuk hapus task:**
```bash
schtasks /Delete /TN "AI Job Hunter" /F
```

## 📊 Cara Kerja

1. **Fetch Jobs**: Mengambil data lowongan dari:
   - RemoteOK API
   - LinkedIn job postings
   - Twitter/X job hashtags
   - GitHub job aggregators

2. **Pre-filter**: Filter berdasarkan:
   - Tech stack (PHP, Laravel, Node.js, TypeScript, dll)
   - Lokasi kerja (Remote, WFO Jogja/Magelang)
   - Keywords relevan

3. **AI Analysis**: Setiap job dianalisa dengan AI untuk:
   - Match score (0-100%)
   - Work mode compatibility
   - Salary evaluation
   - English requirement check
   - Generate cover letter & chat template

4. **Notification**: Job dengan score >= 75% dikirim ke Telegram dengan:
   - Detail posisi & perusahaan
   - Match score & alasan cocok
   - Cover letter siap pakai
   - Template chat untuk recruiter
   - Link apply

## 🔧 Konfigurasi Kandidat

Edit file `src/config.ts` untuk menyesuaikan profil kandidat:

```typescript
export const CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Anastasia Kezia',
  roleTitle: 'Backend / Fullstack Developer',
  targetRoles: ['Full Stack Developer', 'Backend Developer', ...],
  techStack: ['PHP', 'Laravel', 'Node.js', 'TypeScript', ...],
  experienceYears: { min: 1, max: 3, ... },
  englishSkills: { ... },
  salaryRules: { ... }
};

export const MATCH_THRESHOLD = 75; // Minimum match score
```

## 📝 Log & Troubleshooting

**Cek apakah task sudah terdaftar:**
```bash
schtasks /Query /TN "AI Job Hunter"
```

**Test jalankan task secara manual:**
```bash
schtasks /Run /TN "AI Job Hunter"
```

**Cek last run status:**
```bash
schtasks /Query /TN "AI Job Hunter" /V /FO LIST
```

**Lihat log hasil eksekusi:**
- Console output akan muncul saat task berjalan
- Atau jalankan manual: `npm start` untuk lihat hasil real-time

## 🎯 Tips Optimasi

1. **Gunakan 9Router** untuk unlimited AI requests (sudah dikonfigurasi)
2. **Gemini API** sebagai fallback (gratis tapi ada rate limit)
3. **Demo Mode** untuk testing tanpa API key
4. **Adjust MATCH_THRESHOLD** di config.ts sesuai kebutuhan (default 75%)
5. **Sesuaikan jadwal** di Task Scheduler (bisa multiple times per day)

## 📱 Setup Telegram Bot

1. Chat dengan [@BotFather](https://t.me/botfather) di Telegram
2. Ketik `/newbot` dan ikuti instruksi
3. Copy **Bot Token** ke `.env`
4. Chat dengan bot Anda, kirim pesan apa saja
5. Akses `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
6. Copy **chat id** dari response ke `.env`

## 🔄 Update & Maintenance

**Update dependencies:**
```bash
npm update
```

**Rebuild setelah perubahan kode:**
```bash
npm start
```

Task scheduler akan otomatis menggunakan versi terbaru saat next run.

## 📌 Status Setup

- ✅ Dependencies installed
- ✅ Social media scraping active
- ✅ AI analysis configured (9Router/Gemini/Demo)
- ✅ Auto-run scheduled (Daily at 09:00)
- ✅ Telegram notification ready

**Program siap digunakan!** 🎉

---

**Developer:** Anastasia Kezia
**Last Updated:** 2026-08-13
