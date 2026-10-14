# 🤝 Pembuatan -Platform Donasi Digital & GIS

Platform ini menggabungkan sistem **penggalangan dana, pemetaan lokasi bencana berbasis GIS, pembayaran digital, verifikasi kampanye, serta pelaporan penggunaan dana** untuk membantu menciptakan proses donasi yang lebih mudah, transparan, dan terorganisir.

---

## 🎯 Tujuan

Platform ini dikembangkan untuk membantu mengatasi beberapa permasalahan dalam penanganan bencana dan penyaluran bantuan sosial, terutama:

* Lambatnya penyampaian informasi lokasi bencana.
* Kesulitan masyarakat dalam menemukan kampanye bantuan.
* Kebutuhan transparansi dalam penyaluran dana.
* Kebutuhan proses verifikasi kampanye untuk mengurangi risiko penipuan.
* Kebutuhan informasi perkembangan penyaluran bantuan secara berkala.

---

## ✨ Fitur Utama

### 🗺️ 1. Peta Bencana (GIS)

Menampilkan informasi lokasi bencana melalui peta interaktif.

Fitur meliputi:

* Titik lokasi bencana.
* Status kedaruratan.
* Informasi kebutuhan logistik.
* Pemetaan wilayah bencana.
* Integrasi peta menggunakan **Leaflet/Mapbox**.

---

### ❤️ 2. Kampanye Donasi

Pengguna dapat melihat dan mengelola kampanye donasi.

Fitur meliputi:

* Pendaftaran kampanye.
* Kategori kampanye.
* Target donasi.
* Progress donasi.
* Sisa waktu kampanye.
* Informasi kampanye.

Kategori yang direncanakan:

* Bencana
* Pendidikan
* Kesehatan

---

### 💳 3. Payment Gateway

Platform menyediakan sistem pembayaran donasi secara digital.

Integrasi yang direncanakan menggunakan:

* Midtrans / Xendit
* QRIS
* Virtual Account
* Credit Card

Sistem pembayaran dirancang agar transaksi donasi dapat diproses secara otomatis.

---

### 🔎 4. Sistem Verifikasi

Setiap kampanye akan melalui proses verifikasi sebelum dipublikasikan.

Admin/Verifikator dapat:

* Memeriksa data penggalang dana.
* Memeriksa dokumen pendukung.
* Menyetujui kampanye.
* Menolak kampanye.
* Memeriksa legalitas penggalang dana.

Sistem ini bertujuan untuk meningkatkan keamanan dan kepercayaan pengguna.

---

### 📰 5. Portal Berita & Update

Portal berita digunakan untuk memberikan informasi perkembangan kegiatan sosial dan penyaluran bantuan.

Fitur:

* Berita.
* Pengumuman.
* Update lapangan.
* Informasi progres penyaluran bantuan.

---

### 📊 6. Panel Akun & Laporan

Pengguna dapat melihat aktivitas donasi dan informasi laporan.

Fitur:

* Riwayat donasi.
* Kuitansi digital.
* Laporan pencairan dana.
* Laporan penggunaan dana.
* Informasi transparansi dana.

---

## 👥 Tim Pengembang

| Nama                      | Peran               |
| ------------------------- | ------------------- |
| **Farand Altaf Emian**    | Database Specialist |
| **Mhd Fathan Al Aziz**    | Backend Engineer    |
| **Ibnu Halim Lase**       | Frontend Developer  |
| **Fathin Aznar Al Hanif** | Project Manager     |

---

## 🏗️ Struktur Pengembangan

Pengembangan Platform dibagi menjadi beberapa bagian utama:

```text
Web
│
├── Frontend
│   ├── Homepage
│   ├── Kampanye Donasi
│   ├── Detail Kampanye
│   ├── Peta Bencana
│   ├── Berita & Update
│   └── Panel Akun
│
├── Backend
│   ├── Authentication
│   ├── Kampanye
│   ├── Donasi
│   ├── Payment Gateway
│   ├── Verifikasi
│   ├── GIS
│   └── Laporan
│
└── Database
    ├── Users
    ├── Campaigns
    ├── Donations
    ├── Payments
    ├── Verification
    ├── Disasters
    ├── News
    └── Reports
```

---

## 🔄 Alur Sistem

```text
Pengguna
   │
   ▼
Website 
   │
   ├──────────────► Melihat Kampanye
   │                     │
   │                     ▼
   │                 Detail Kampanye
   │                     │
   │                     ▼
   │                   Donasi
   │                     │
   │                     ▼
   │              Payment Gateway
   │                     │
   │                     ▼
   │              Status Pembayaran
   │
   └──────────────► Melihat Peta Bencana
                         │
                         ▼
                   Lokasi Bencana
                         │
                         ▼
                  Informasi Kebutuhan
```

---

## 🔐 Sistem Verifikasi Kampanye

Alur verifikasi:

```text
Penggalang Dana
      │
      ▼
Membuat Kampanye
      │
      ▼
Upload Dokumen
      │
      ▼
Verifikator
      │
      ├──► Ditolak
      │
      └──► Disetujui
                │
                ▼
        Kampanye Dipublikasikan
```

---

## 💰 Transparansi Donasi

Platform Merancang untuk memberikan informasi mengenai penggunaan dan pencairan dana.

```text
Donatur
   │
   ▼
Donasi
   │
   ▼
Payment Gateway
   │
   ▼
Dana Terkumpul
   │
   ▼
Penyaluran Bantuan
   │
   ▼
Laporan Penggunaan Dana
```

---

## 🗺️ GIS / Pemetaan Bencana

Peta bencana digunakan untuk membantu pengguna mengetahui lokasi dan kondisi bencana.

Informasi yang ditampilkan meliputi:

* Lokasi bencana.
* Status kedaruratan.
* Kebutuhan logistik.
* Informasi terkait kampanye bantuan.

Teknologi pemetaan yang direncanakan adalah **Leaflet/Mapbox**.

---

## 🖥️ Dashboard Admin

Dashboard admin digunakan untuk mengelola dan memantau sistem.

Ruang lingkup pengelolaan meliputi:

* Pengguna.
* Kampanye.
* Verifikasi.
* Donasi.
* Pembayaran.
* Berita.
* Laporan.
* Data bencana.

---

## 🛠️ Infrastruktur

Proposal mencantumkan infrastruktur berikut:

| Infrastruktur | Spesifikasi                        |
| ------------- | ---------------------------------- |
| Web Server    | LiteSpeed Web Server + LSCache     |
| Storage       | NVMe High-Speed SSD                |
| Security      | Imunify360 + SSL/HTTPS             |
| Backup        | Automatic Off-site Backup mingguan |
| Availability  | 99.9% Server Uptime                |

---

## 📌 Status Project

> 🚧 **Dalam Pengembangan**

Pengembangan dilakukan secara bertahap mulai dari perencanaan sistem, database, backend, frontend, integrasi GIS, payment gateway, testing, hingga deployment.

---

## 📋 Project Management

Pengembangan proyek menggunakan **GitHub Issues dan GitHub Projects (Kanban)** untuk mengatur pekerjaan tim.

Alur pekerjaan:

```text
📥 Backlog
    ↓
📝 To Do
    ↓
🔨 In Progress
    ↓
👀 Review
    ↓
🧪 Testing
    ↓
✅ Done
```

Setiap anggota memiliki task sesuai dengan tanggung jawab masing-masing.

---

## 📄 Dokumentasi

Dokumentasi proyek mencakup:

* Analisis kebutuhan.
* Perancangan sistem.
* Database / ERD.
* API.
* UI/UX.
* GIS.
* Payment Gateway.
* Testing.
* Deployment.

---

## 📞 Kontak

**Tim PatOpen**

📍 SMKN 9 Medan, Sumatera Utara

📱 WhatsApp: 0821-8472-6657

📧 Email:

* [pantopensupport@gmail.com](mailto:pantopensupport@gmail.com)

---

## 📜 License

Pengembangan sebagai bagian dari proyek **Tim PatOpen – 2026**.
