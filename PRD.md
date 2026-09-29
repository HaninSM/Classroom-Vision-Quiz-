# Product Requirements Document (PRD)
# Classroom Vision Quiz (CVQ)

**Versi Dokumen:** 1.1  
**Status Pengembangan:** Aktif (Spec-Driven Development)  
**Terakhir Diperbarui:** 2026-09-28  

---

## 1. Ringkasan Eksekutif & Latar Belakang (Overview)
Di banyak institusi pendidikan, kebijakan larangan membawa atau menggunakan *smartphone* bagi siswa diterapkan untuk menjaga fokus belajar. Namun, hal ini sering kali membatasi guru dalam memanfaatkan aplikasi kuis interaktif modern (seperti Kahoot atau Quizizz) yang memerlukan gawai di tangan masing-masing murid.

**Classroom Vision Quiz (CVQ)** memecahkan paradoks ini dengan menghadirkan sistem kuis interaktif tanpa gawai murid:
- Murid hanya menggunakan **1 lembar kertas fisik QR Code 4 sisi**.
- Pilihan jawaban (**A, B, C, D**) ditentukan oleh sisi kertas yang dihadapkan ke atas.
- Guru menggunakan **1 kamera laptop / webcam / HP dari depan kelas** untuk menyorot seisi kelas.
- Sistem **Computer Vision** mendeteksi hingga 25 QR code secara simultan dan membaca orientasi rotasinya secara *real-time*.

---

## 2. Target Pengguna (User Personas)
1. **Guru / Fasilitator Kelas:**
   - Membutuhkan cara cepat membuat kelas dan menginput daftar siswa (maksimal 25 murid).
   - Membutuhkan lembar jawaban siap cetak (*print-ready*).
   - Membutuhkan tampilan soal proyektor/TV berukuran besar yang terbaca dari jarak jauh.
   - Mengoperasikan pemindai kamera live dan melihat distribusi suara secara langsung.
2. **Siswa:**
   - Cukup memutar kartu fisik sesuai jawaban yang diinginkan lalu mengangkatnya.
   - Tidak memerlukan baterai, kuota internet, atau smartphone.

---

## 3. Arsitektur Teknologi & Standar Rekayasa
- **Frontend:** HTML5, TailwindCSS, Vanilla JavaScript Modern.
- **Computer Vision Engine:** Native Web `BarcodeDetector` API (Hardware Accelerated Multi-QR) dengan fallback `jsQR`.
- **Backend:** Node.js, Express.js (Modular MVC Pattern).
- **Database:** MySQL dengan `mysql2/promise` (ACID Transactions & Upsert Logic).
- **Gaya Penulisan Kode (Coding Guidelines):**
  - `snake_case` untuk nama variabel dan fungsi (contoh: `create_class_with_students`, `calculate_qr_orientation_option`).
  - `CamelCase` untuk nama class (contoh: `ClassModel`, `StudentModel`, `QuestionModel`, `ExamResultModel`).
  - Validasi ketat di sisi klien maupun server.

---

## 4. Checklist Iterasi & Definition of Done (DoD)
Setiap kali iterasi modul selesai, checklist berikut wajib dipenuhi dan diperbarui:

| Item Checklist | Kriteria Kesiapan | Status |
| :--- | :--- | :---: |
| **1. Standard Coding Style** | Mengikuti `snake_case` untuk variabel/fungsi dan `CamelCase` untuk class | ✅ Selesai |
| **2. Modularitas Arsitektur** | Struktur direktori MVC terpisah (config, controllers, models, routes, public) | ✅ Selesai |
| **3. Integritas Database** | Skema tabel MySQL teruji, mendukung relasi Foreign Key dan transaksi | ✅ Selesai |
| **4. Validasi Masukan** | Pengecekan input nama kelas, batas 25 siswa, dan format 4 opsi soal | ✅ Selesai |
| **5. Algoritma Vision & Rotasi** | Akurasi pembacaan sudut putar QR code ($\theta = 0^\circ, 90^\circ, 180^\circ, 270^\circ \pm 45^\circ$) | ✅ Selesai |
| **6. Uji Coba Lintas Perangkat** | Web camera live scanner mendukung fallback resolusi & unggah file foto | ✅ Selesai |
| **7. Pembaruan Dokumen PRD** | File `PRD.md` selalu diperbarui mencatat riwayat dan status modul | ✅ Selesai |
| **8. Dokumentasi Visual** | Halaman `dokumentasi.html` menyajikan panduan dan visualisasi per form | ✅ Selesai |

---

## 5. Rincian Modul & Status Implementasi

### Modul 1: Manajemen Kelas & Pendaftaran Siswa
- **Status:** Selesai (Verified)
- **Kebutuhan:**
  - Input nama kelas.
  - Form dinamis pendaftaran siswa (1 s/d maksimal 25 siswa).
  - Generator baris cepat & fitur *Bulk Paste* dari Excel/Word.
  - Pembuatan token unik `qr_token` acak non-duplikat.
- **Tabel MySQL Terkait:** `classes`, `students`.
- **Endpoints:** `POST /api/classes`, `GET /api/classes`, `GET /api/classes/:id`.

### Modul 2: Generasi QR Code & Lembar Jawaban 4 Sisi
- **Status:** Selesai (Verified)
- **Kebutuhan:**
  - Generator gambar QR Code resolusi tinggi (Data URL base64) dengan Error Correction Level High (`H`).
  - Desain lembar jawaban cetak fisik (Print CSS `@media print`):
    - **Sisi Atas:** Huruf **A** (Tegak normal $0^\circ$).
    - **Sisi Kanan:** Huruf **B** (Diputar $90^\circ$).
    - **Sisi Bawah:** Huruf **C** (Diputar $180^\circ$).
    - **Sisi Kiri:** Huruf **D** (Diputar $270^\circ$).
  - Opsi layout 1 lembar A4 penuh atau 2 kartu per lembar (hemat kertas).
- **Endpoints:** `GET /api/classes/:id/cards`.

### Modul 3: Manajemen Bank Soal & Layar TV Proyektor
- **Status:** Selesai (Verified)
- **Kebutuhan:**
  - Bank soal pilihan ganda (Teks soal, Opsi A/B/C/D, dan Kunci Jawaban).
  - Tampilan layar proyektor / TV kelas layar penuh (*Dark Mode High Contrast*).
  - Kartu opsi berwarna ekstra besar (🔴 A, 🔵 B, 🟡 C, 🟢 D) terbaca dari jarak 10 meter.
  - Kontrol presenter: Navigasi soal, buka/tutup kunci jawaban, remote clicker keyboard (`Panah`, `Spasi`).
- **Tabel MySQL Terkait:** `questions`.
- **Endpoints:** `POST /api/questions`, `GET /api/questions`, `GET /api/questions/:id`, `DELETE /api/questions/:id`.

### Modul 4: Pemindaian Live Computer Vision & Manajemen Hasil
- **Status:** Selesai (Verified)
- **Kebutuhan:**
  - Streaming kamera web dengan pemilihan hardware (kamera laptop, USB webcam, kamera belakang).
  - Algoritma pembacaan sudut vektor orientasi $\theta = \text{atan2}(\Delta y, \Delta x) \pmod{360}$.
  - Deteksi multi-QR paralel hingga 25 kartu secara simultan.
  - Dukungan **Dual Camera Mode**: Webcam bawaan laptop/USB dan **IP Webcam nirkabel via HP Android** (Wi-Fi).
  - Mekanisme **Anti-CORS Stream Proxy** (`/api/exam/proxy-shot`) untuk memutar stream kamera HP tanpa terhalang kebijakan keamanan cross-origin browser.
  - Overlay kanvas **Augmented Reality (AR)** dengan garis batas hijau dan label nama siswa melayang.
  - Fallback pengujian menggunakan file foto/gambar.
  - Sinkronisasi jawaban real-time ke database menggunakan operasi *Upsert*.
  - Diagram distribusi suara live dan checklist respon kehadiran per siswa.
- **Tabel MySQL Terkait:** `exam_results`.
- **Endpoints:** `POST /api/exam/submit-answers`, `GET /api/exam/live-stats`, `GET /api/exam/summary/:session_id`, `GET /api/exam/proxy-shot`.

---

## 6. Rencana Iterasi Mendatang (Roadmap)
1. **Modul 5: Analisis Hasil & Ekspor Rekap:**
   - Ekspor nilai kuis ke format Excel (.xlsx) dan PDF rapor ringkas.
   - Grafik butir soal tersulit (analisis daya beda dan tingkat kesukaran).
2. **Audio & Gamifikasi:**
   - Efek suara saat soal dibuka, timer hitung mundur kuis, dan efek suara jawaban benar/salah.
3. **Penyimpanan Sesi Kuis:**
   - Riwayat ujian berdasarkan tanggal dan mata pelajaran yang dapat dibuka kembali.
