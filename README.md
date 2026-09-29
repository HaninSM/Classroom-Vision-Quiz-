# Classroom Vision Quiz (CVQ)

Aplikasi kuis interaktif kelas berbasis **Computer Vision** dan lembar jawaban fisik **QR Code 4 sisi**. CVQ dirancang untuk menyelesaikan tantangan larangan penggunaan smartphone oleh siswa di sekolah dengan memanfaatkan pemindaian kamera satu arah dari guru.

---

## 🛠️ Arsitektur & Teknologi
- **Frontend:** HTML5, TailwindCSS, JavaScript Modern (DOM dinamis & Camera/QR Reader).
- **Backend:** Node.js, Express.js (Modular MVC Pattern).
- **Database:** MySQL (dengan library `mysql2/promise` & transaksi ACID).

---

## 📂 Struktur Proyek
```text
d:/QUIZ INTERAKTIF/
├── config/
│   └── database.js            # Koneksi pool MySQL & auto-check schema
├── controllers/
│   └── class_controller.js    # Logika bisnis kelas & validasi batas 25 siswa
├── models/
│   ├── class_model.js         # Abstraksi query tabel classes
│   └── student_model.js       # Abstraksi query tabel students
├── routes/
│   ├── api_routes.js          # Agregator route API
│   └── class_routes.js        # Route endpoint /api/classes
├── sql/
│   └── schema.sql             # Skrip DDL skema database MySQL
├── public/                    # Frontend assets
│   ├── index.html             # Antarmuka form input kelas & siswa
│   ├── print_cards.html       # Halaman cetak lembar jawaban QR 4 sisi
│   ├── questions.html         # Manajemen bank soal pilihan ganda
│   ├── tv_quiz.html           # Layar kuis TV / proyektor kelas
│   ├── scanner.html           # Pemindai live Computer Vision (AR)
│   ├── dokumentasi.html       # Panduan lengkap sistem & visualisasi per form
│   └── js/                    # Logika frontend per halaman
├── PRD.md                     # Product Requirements Document (PRD) resmi
├── .env.example               # Panduan environment variables
├── .env                       # File konfigurasi lokal
├── app.js                     # Inisialisasi Express & konfigurasi middleware
├── server.js                  # Entry point server HTTP
├── package.json               # Konfigurasi dependensi npm
└── README.md                  # Dokumentasi proyek
```

---

## 🚀 Panduan Memulai (Setup & Menjalankan)

### 1. Prasyarat
- **Node.js** (v18+ direkomendasikan).
- **MySQL Server** (XAMPP / Laragon / Docker / MySQL Service bawaan).

### 2. Konfigurasi Database
1. Buat database atau pastikan MySQL sedang berjalan pada port default (3306).
2. Salin `.env.example` ke `.env` (jika belum ada) dan sesuaikan kredensial:
   ```env
   PORT=3000
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=cvq_db
   ```
3. Skrip tabel dapat di-import langsung dari `sql/schema.sql` atau akan dibuat otomatis saat server pertama kali dijalankan dan terhubung ke MySQL.

### 3. Instalasi Dependensi
```bash
npm install
```

### 4. Menjalankan Server
Mode produksi:
```bash
npm start
```
Mode pengembangan (auto-reload):
```bash
npm run dev
```

Buka peramban (browser) di: `http://localhost:3000`.

---

## 🌐 Pengaturan Akses Smartphone & HTTPS via Tunnel Nirkabel

Jika server CVQ dijalankan pada laptop/PC Windows dan guru ingin memindai menggunakan **kamera smartphone Android langsung melalui peramban (Chrome Mobile)**:

### ⚠️ Mengapa Memerlukan HTTPS?
Peramban Google Chrome di Android menerapkan aturan keamanan *Secure Context*: API kamera (`navigator.mediaDevices.getUserMedia`) **hanya diizinkan** pada protokol `https://` atau domain `localhost`. Jika smartphone membuka alamat IP lokal laptop via HTTP biasa (misalnya: `http://192.168.x.x:3000`), peramban Android akan memblokir akses kamera.

Ada dua opsi solusi mudah untuk mengatasinya:

---

### Opsi 1: Menggunakan Tunnel HTTPS Nirkabel (Rekomendasi Paling Praktis)
Tunneling memberikan tautan publik resmi berprotokol HTTPS secara instan tanpa perlu pengaturan sertifikat SSL yang rumit.

#### Cara A: Menggunakan LocalTunnel (1 Perintah Saja)
Jalankan perintah berikut di terminal komputer Windows Anda:
```bash
npm run tunnel
```
*(Atau jalankan: `npx localtunnel --port 3000`)*

Terminal akan menghasilkan URL HTTPS resmi, misalnya:
```text
your url is: https://cvq-vision-smart.loca.lt
```
1. Buka URL HTTPS tersebut dari Chrome Android di HP Anda.
2. Jika muncul halaman *friendly reminder* dari Localtunnel, masukkan IP publik server Anda lalu klik *Click to Submit*.
3. Buka halaman pemindai: `/scanner.html`. Dialog izin kamera akan langsung muncul dan kamera ponsel langsung aktif!

#### Cara B: Menggunakan Cloudflare Tunnel (Cepat & Stabil)
Jika Anda memiliki `cloudflared`, jalankan:
```bash
cloudflared tunnel --url http://localhost:3000
```
Salin tautan `https://xxxx.trycloudflare.com` yang diberikan dan buka di ponsel Android.

#### Cara C: Menggunakan Ngrok
```bash
ngrok http 3000
```
Salin tautan `https://xxxx.ngrok-free.app` dan buka di ponsel Android.

---

### Opsi 2: Mengaktifkan Flag di Chrome Android (Offline / Tanpa Kuota Internet)
Jika kelas Anda berada di ruangan tanpa koneksi internet (hanya menggunakan Wi-Fi lokal atau Hotspot HP dari ponsel):

1. Di smartphone Android, buka Google Chrome dan ketik pada bilah alamat:
   ```text
   chrome://flags/#unsafely-treat-insecure-origin-as-secure
   ```
2. Pada kolom **Insecure origins treated as secure**, masukkan alamat IP laptop server Anda, contoh:
   ```text
   http://192.168.18.6:3000
   ```
   *(Sesuaikan dengan IP laptop Windows Anda)*
3. Ubah status dropdown dari **Disabled** menjadi **Enabled**.
4. Tekan tombol **Relaunch** di pojok kanan bawah Chrome untuk memulai ulang browser.
5. Buka `http://<IP-Laptop>:3000/scanner.html`. Chrome Android sekarang memperlakukan server Anda aman layaknya HTTPS, dan kamera HP langsung dapat dinyalakan.

---

### 🪞 Fitur Khusus Pemindaian Kamera Ponsel
* **Prioritas Otomatis Kamera Belakang:** Sistem otomatis memilih kamera belakang (*rear/environment camera*) agar guru dapat menyorot seluruh siswa di kelas dengan sudut pandang lebar.
* **Mode Cermin Kamera Depan (*Selfie*):** Jika menggunakan kamera depan, centang opsi **"🪞 Kamera Depan (Cermin)"**. Sistem secara otomatis menginversi sudut rotasi horizontal $\theta_{\text{koreksi}} = (360^\circ - \theta) \pmod{360}$ sehingga kartu jawaban **B** dan **D** tidak pernah tertukar akibat pantulan optik cermin.
* **Mode Nirkabel IP Webcam (Aplikasi HP):** Jika tidak ingin membuka browser di HP, guru cukup memasang aplikasi gratis **"IP Webcam"** di Android, klik *Start server*, lalu hubungkan ke laptop melalui tab *📱 IP Webcam (HP Android)* di `scanner.html`. Sistem menggunakan **Anti-CORS Proxy** (`/api/exam/proxy-shot`) bawaan.

---

## 📡 Dokumentasi Endpoint API

### 1. Inisialisasi & Health Check
- **`GET /api/health`**
  - Mengembalikan status kesehatan server.

### 2. Pembuatan Kelas & Siswa
- **`POST /api/classes`**
  - **Deskripsi:** Membuat kelas baru beserta daftar siswa (maksimal 25 murid per kelas). Setiap murid otomatis diberikan token unik `qr_token`.
  - **Payload Body (JSON):**
    ```json
    {
      "class_name": "Kelas 10 IPA 1",
      "students": [
        { "name": "Ahmad Dani" },
        { "name": "Budi Santoso" }
      ]
    }
    ```
  - **Respon Sukses (201 Created):**
    ```json
    {
      "success": true,
      "message": "Kelas dan daftar siswa berhasil dibuat.",
      "data": {
        "class_id": 1,
        "class_name": "Kelas 10 IPA 1",
        "total_students": 2,
        "students": [
          { "id": 1, "class_id": 1, "student_name": "Ahmad Dani", "qr_token": "qr_3f9a7b..." },
          { "id": 2, "class_id": 1, "student_name": "Budi Santoso", "qr_token": "qr_8c1e2d..." }
        ]
      }
    }
    ```

### 3. Mengambil Seluruh Kelas
- **`GET /api/classes`**
  - Mengambil daftar semua kelas beserta agregat jumlah siswa yang terdaftar.

### 4. Detail Kelas & Siswa
- **`GET /api/classes/:id`**
  - Mengambil detail satu kelas beserta seluruh daftar nama siswa dan token QR masing-masing.

### 5. Lembar Jawaban & QR Code Siap Cetak (Modul 2)
- **`GET /api/classes/:id/cards`**
  - Mengambil data seluruh siswa pada kelas tersebut yang diperkaya dengan gambar QR Code beresolusi tinggi (*Error Correction High*) dalam format Data URL base64.
  - Digunakan oleh halaman `public/print_cards.html` untuk merender lembar jawaban 4 sisi (A, B, C, D) yang siap cetak (A4 / 2-kartu per lembar) untuk keperluan pemindaian Computer Vision.

### 6. Bank Soal Kuis Pilihan Ganda (Modul 3)
- **`GET /api/questions`**: Mengambil daftar seluruh soal kuis yang tersimpan.
- **`POST /api/questions`**: Menambahkan soal pilihan ganda baru (wajib mengisi `question_text`, 4 pilihan `option_a` s/d `option_d`, dan `correct_answer` bernilai salah satu dari `'A'`, `'B'`, `'C'`, atau `'D'`).
- **`GET /api/questions/:id`**: Mengambil detail satu soal kuis.
- **`DELETE /api/questions/:id`**: Menghapus soal kuis dari database.

### 7. Pemindaian Live & Hasil Ujian (Modul 4)
- **`POST /api/exam/submit-answers`**: Menerima batch jawaban terdeteksi dari kamera (`session_id`, `question_id`, `detected_answers: [{ qr_token, detected_option }]`), mencocokkan ke database, dan melakukan upsert status benar/salah.
- **`GET /api/exam/live-stats`**: Mengambil agregat statistik kuis langsung (jumlah siswa yang menjawab dan distribusi opsi A, B, C, D).
- **`GET /api/exam/summary/:session_id`**: Mengambil rekapitulasi nilai akhir kuis per siswa.

---

## 📷 Pemindai Kamera Live Computer Vision (Modul 4)
- Halaman `public/scanner.html` menggunakan web camera guru di depan kelas untuk memindai seluruh siswa sekaligus.
- **Mesin Deteksi Multi-QR:** Menggunakan akselerasi hardware peramban (`BarcodeDetector` API) dengan fallback `jsQR` beresolusi tinggi.
- **Kalkulasi Sudut Rotasi Real-time:** Menghitung sudut vektor orientasi $\theta = \text{atan2}(\Delta y, \Delta x)$ dari titik sudut QR Code untuk mendeteksi pilihan jawaban siswa secara instan:
  - $0^\circ \pm 45^\circ \to$ **Opsi A**
  - $90^\circ \pm 45^\circ \to$ **Opsi B**
  - $180^\circ \pm 45^\circ \to$ **Opsi C**
  - $270^\circ \pm 45^\circ \to$ **Opsi D**
- **Overlay Augmented Reality (AR):** Menampilkan garis bounding box hijau di atas lembar jawaban setiap siswa beserta pill label melayang (contoh: `Ahmad: [ B ]`).
- **Sinkronisasi Otomatis:** Mengirim batch jawaban ke database setiap ~500ms dan memperbarui diagram distribusi suara live.

---

## 📺 Layar TV Proyektor & Presenter Kontrol (Modul 3)
- Halaman `public/tv_quiz.html` dirancang untuk ditampilkan di layar besar kelas / proyektor InFocus.
- Tipografi ekstra besar, high-contrast, dan kartu 4 opsi berwarna:
  - 🔴 **Opsi A (Merah)**
  - 🔵 **Opsi B (Biru)**
  - 🟡 **Opsi C (Kuning / Oranye)**
  - 🟢 **Opsi D (Hijau)**
- Mendukung kontrol presenter:
  - **Tombol Next / Prev Soal** (atau tombol keyboard panah kanan/kiri, PageDown/PageUp).
  - **Tampilkan Kunci Jawaban** (atau tombol spasi/enter pada keyboard remote presenter) dengan efek highlight hijau menyala.
  - **Mode Layar Penuh (Fullscreen)**.

---

## 🖨️ Spesifikasi Lembar Jawaban 4 Sisi (Card Orientation)
- **Sisi Atas (Top):** Opsi **A** (Posisi standar tegak $0^\circ$).
- **Sisi Kanan (Right):** Opsi **B** (Diputar $90^\circ$ searah jarum jam sehingga sisi B tegak di atas).
- **Sisi Bawah (Bottom):** Opsi **C** (Diputar $180^\circ$ sehingga sisi C tegak di atas).
- **Sisi Kiri (Left):** Opsi **D** (Diputar $270^\circ$ searah jarum jam sehingga sisi D tegak di atas).
Siswa menjawab pertanyaan dengan memutar sisi huruf pilihan ke atas dan mengarahkan kartu ke kamera guru di depan kelas.

---

## 📐 Standar Penulisan Kode (Coding Guidelines)
- `snake_case` untuk nama variabel dan fungsi (contoh: `create_class_with_students`, `generate_qr_data_url`).
- `CamelCase` untuk nama class (contoh: `ClassModel`, `StudentModel`).
- Setiap fungsi dilengkapi JSDoc dan penanganan error terstruktur.
- Pembatasan maksimal 25 siswa divalidasi ganda: di sisi antarmuka pengguna (Frontend) dan logika server (Backend).

