/**
 * @file scanner.js
 * @description Engine Computer Vision untuk pemindaian live webcam dan pembacaan rotasi 4 sisi QR Code siswa.
 */

// State Scanner & Ujian
let media_stream = null;
let is_scanning = false;
let barcode_detector_engine = null;
let current_session_id = 'session_cvq_live';
let current_question_index = 0;
let questions_data = [];
let students_data = [];
let current_class_id = null;
let detected_answers_map = new Map(); // qr_token -> { token, option, timestamp, student_name }
let last_sync_timestamp = 0;
let fps_last_time = performance.now();
let fps_frames = 0;

// Elemen DOM Kamera & Kanvas AR
const webcam_video = document.getElementById('webcam_video');
const ar_overlay_canvas = document.getElementById('ar_overlay_canvas');
const ar_ctx = ar_overlay_canvas.getContext('2d');
const camera_device_select = document.getElementById('camera_device_select');
const btn_toggle_camera = document.getElementById('btn_toggle_camera');
const camera_placeholder = document.getElementById('camera_placeholder');
const detection_engine_badge = document.getElementById('detection_engine_badge');
const fps_counter = document.getElementById('fps_counter');

// Elemen Tab & Kontrol IP Webcam (HP Android)
const tab_webcam_mode = document.getElementById('tab_webcam_mode');
const tab_ip_mode = document.getElementById('tab_ip_mode');
const controls_webcam_box = document.getElementById('controls_webcam_box');
const controls_ip_box = document.getElementById('controls_ip_box');
const ip_webcam_url_input = document.getElementById('ip_webcam_url_input');
const ip_stream_mode_select = document.getElementById('ip_stream_mode_select');
const btn_connect_ip_camera = document.getElementById('btn_connect_ip_camera');
const ip_connection_status = document.getElementById('ip_connection_status');
let is_ip_camera_active = false;
let ip_stream_img_element = null;
let ip_polling_timer_id = null;

// Elemen & State Mode Cermin Kamera Depan (Selfie)
const mirror_mode_checkbox = document.getElementById('mirror_mode_checkbox');
const ip_mirror_mode_checkbox = document.getElementById('ip_mirror_mode_checkbox');
let is_mirror_mode = false;

/**
 * Mengatur status mode cermin (apakah kamera depan atau belakang).
 * @param {boolean} enabled 
 */
function set_mirror_mode(enabled) {
    is_mirror_mode = Boolean(enabled);
    if (mirror_mode_checkbox) mirror_mode_checkbox.checked = is_mirror_mode;
    if (ip_mirror_mode_checkbox) ip_mirror_mode_checkbox.checked = is_mirror_mode;
    localStorage.setItem('cvq_mirror_mode', is_mirror_mode ? 'true' : 'false');
}

// Elemen DOM Soal & Hasil
const active_question_num_badge = document.getElementById('active_question_num_badge');
const active_question_text_preview = document.getElementById('active_question_text_preview');
const btn_scanner_prev_q = document.getElementById('btn_scanner_prev_q');
const btn_scanner_next_q = document.getElementById('btn_scanner_next_q');
const live_responded_ratio = document.getElementById('live_responded_ratio');
const active_class_name_tag = document.getElementById('active_class_name_tag');
const students_checklist_container = document.getElementById('students_checklist_container');

// Bar Distribusi
const count_label_a = document.getElementById('count_label_a');
const count_label_b = document.getElementById('count_label_b');
const count_label_c = document.getElementById('count_label_c');
const count_label_d = document.getElementById('count_label_d');
const bar_a = document.getElementById('bar_a');
const bar_b = document.getElementById('bar_b');
const bar_c = document.getElementById('bar_c');
const bar_d = document.getElementById('bar_d');

/**
 * Menghitung orientasi rotasi 4 sisi dari titik sudut QR Code.
 * @param {Array<{x: number, y: number}>} corners - 4 titik sudut [TL, TR, BR, BL]
 * @returns {'A'|'B'|'C'|'D'} Opsi pilihan jawaban
 */
function calculate_qr_orientation_option(corners) {
    if (!corners || corners.length < 4) return 'A';

    const p0 = corners[0]; // Top-Left
    const p1 = corners[1]; // Top-Right

    const delta_x = p1.x - p0.x;
    const delta_y = p1.y - p0.y;

    // Hitung sudut rotasi dalam derajat [0, 360)
    let degrees = (Math.atan2(delta_y, delta_x) * 180 / Math.PI + 360) % 360;

    // Jika mode cermin aktif (kamera depan HP / selfie), orientasi horizontal terbalik secara optik:
    // Sudut 90 deg (B) terbalik menjadi 270 deg (D), dan sebaliknya.
    if (is_mirror_mode) {
        degrees = (360 - degrees) % 360;
    }

    // Toleransi sudut rentang 90 derajat per sisi
    if (degrees >= 315 || degrees < 45) {
        return 'A'; // Posisi tegak standar (0 deg)
    } else if (degrees >= 45 && degrees < 135) {
        return 'B'; // Sisi kanan di atas (90 deg)
    } else if (degrees >= 135 && degrees < 225) {
        return 'C'; // Sisi bawah di atas (180 deg)
    } else {
        return 'D'; // Sisi kiri di atas (270 deg)
    }
}

/**
 * Inisialisasi engine Computer Vision (BarcodeDetector API bawaan atau fallback jsQR).
 */
async function initialize_vision_engine() {
    if ('BarcodeDetector' in window) {
        try {
            const formats = await BarcodeDetector.getSupportedFormats();
            if (formats.includes('qr_code')) {
                barcode_detector_engine = new BarcodeDetector({ formats: ['qr_code'] });
                detection_engine_badge.textContent = 'Engine: Native BarcodeDetector (Multi-QR)';
                detection_engine_badge.className = 'px-2.5 py-1 bg-emerald-950/80 text-emerald-300 rounded-full font-mono text-[11px] border border-emerald-800';
                return;
            }
        } catch (e) {
            console.warn('[BarcodeDetector warning]:', e);
        }
    }

    // Fallback ke jsQR jika BarcodeDetector belum didukung di browser ini
    detection_engine_badge.textContent = 'Engine: jsQR Vision Fallback';
    detection_engine_badge.className = 'px-2.5 py-1 bg-amber-950/80 text-amber-300 rounded-full font-mono text-[11px] border border-amber-800';
}

/**
 * Mengisi daftar kamera yang tersedia di perangkat guru.
 */
async function enumerate_camera_devices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const video_devices = devices.filter(d => d.kind === 'videoinput');

        camera_device_select.innerHTML = '';
        if (video_devices.length === 0) {
            camera_device_select.innerHTML = '<option value="">Kamera tidak ditemukan</option>';
            return;
        }

        video_devices.forEach((device, index) => {
            const opt = document.createElement('option');
            opt.value = device.deviceId;
            opt.textContent = device.label || `Kamera ${index + 1}`;
            camera_device_select.appendChild(opt);
        });

        // Sinkronkan nilai pilihan dengan kamera yang sedang streaming aktif
        if (media_stream) {
            const active_track = media_stream.getVideoTracks()[0];
            if (active_track) {
                const settings = active_track.getSettings();
                if (settings && settings.deviceId) {
                    camera_device_select.value = settings.deviceId;
                }
            }
        }
    } catch (error) {
        console.error('[ERROR enumerate_camera_devices]:', error);
    }
}

/**
 * Menyalakan streaming kamera web.
 * @param {string} [device_id=null] - ID device kamera pilihan
 */
async function start_webcam_stream(device_id = null) {
    if (media_stream) {
        stop_webcam_stream();
    }

    try {
        let stream = null;
        // Prioritaskan kamera belakang jika di smartphone dan belum memilih device spesifik
        const video_constraints = device_id
            ? { deviceId: { exact: device_id } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: video_constraints
            });
        } catch (e1) {
            console.warn('[Camera try 1 failed]:', e1.message);
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: device_id ? { deviceId: { exact: device_id } } : true
                });
            } catch (e2) {
                // Fallback resolusi standar 640x480 (paling kompatibel dengan EasyCamera)
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480 }
                });
            }
        }

        media_stream = stream;
        webcam_video.srcObject = media_stream;

        try {
            await webcam_video.play();
        } catch (play_err) {
            console.warn('[Video play promise warning]:', play_err);
        }

        // Deteksi otomatis apakah kamera aktif adalah kamera depan atau belakang
        const video_track = stream.getVideoTracks()[0];
        if (video_track) {
            const track_settings = video_track.getSettings();
            const track_label = (video_track.label || '').toLowerCase();
            const is_front = track_settings.facingMode === 'user' || track_label.includes('front') || track_label.includes('depan');
            const is_back = track_settings.facingMode === 'environment' || track_label.includes('back') || track_label.includes('belakang') || track_label.includes('rear');

            if (is_front) {
                set_mirror_mode(true);
            } else if (is_back) {
                set_mirror_mode(false);
            }
        }

        camera_placeholder.classList.add('hidden');
        btn_toggle_camera.textContent = 'Matikan Kamera';
        btn_toggle_camera.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
        btn_toggle_camera.classList.add('bg-rose-600', 'hover:bg-rose-500');

        is_scanning = true;
        await enumerate_camera_devices();
        requestAnimationFrame(process_video_frame_loop);

    } catch (error) {
        console.error('[Webcam start error]:', error);
        camera_placeholder.classList.remove('hidden');
        camera_placeholder.innerHTML = `
            <div class="p-6 bg-slate-900 border border-amber-600/50 rounded-2xl max-w-md text-center space-y-3">
                <span class="text-3xl">🔒</span>
                <h4 class="text-sm font-bold text-amber-400">Kamera Terkunci oleh Sistem (${error.message})</h4>
                <div class="text-xs text-slate-300 text-left space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <p><strong>Penyebab umum pada laptop (EasyCamera):</strong></p>
                    <p>&bull; <strong>Penutup Fisik Kamera:</strong> Periksa apakah ada slider penutup fisik di atas lensa kamera laptop Anda (buka slider).</p>
                    <p>&bull; <strong>Tombol Fn Kamera:</strong> Tekan tombol Fn kamera (misal Fn+F8 atau Fn+F10 pada laptop Lenovo/Asus).</p>
                    <p>&bull; <strong>Izin Privasi Windows:</strong> Buka <em>Windows Settings &rarr; Privacy & security &rarr; Camera</em> &rarr; Aktifkan <em>"Let desktop apps access your camera"</em>.</p>
                </div>
                <button type="button" onclick="document.getElementById('image_file_input').click()" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                    📁 Uji Pindai Menggunakan File Foto Kartu Saja &rarr;
                </button>
            </div>
        `;
    }
}

/**
 * Memproses pemindaian Computer Vision dari file gambar/foto statis.
 * @param {HTMLImageElement} img_element 
 */
async function process_static_image_scan(img_element) {
    const detected_items = [];

    if (barcode_detector_engine) {
        try {
            const barcodes = await barcode_detector_engine.detect(img_element);
            barcodes.forEach((barcode) => {
                if (barcode.rawValue && barcode.cornerPoints && barcode.cornerPoints.length >= 4) {
                    const detected_option = calculate_qr_orientation_option(barcode.cornerPoints);
                    detected_items.push({
                        raw_value: barcode.rawValue,
                        corners: barcode.cornerPoints,
                        option: detected_option
                    });
                }
            });
        } catch (e) {
            console.warn('[BarcodeDetector image scan error]:', e);
        }
    }

    if (detected_items.length === 0 && typeof jsQR !== 'undefined') {
        const offscreen_canvas = document.createElement('canvas');
        offscreen_canvas.width = img_element.naturalWidth || 800;
        offscreen_canvas.height = img_element.naturalHeight || 600;
        const off_ctx = offscreen_canvas.getContext('2d');
        off_ctx.drawImage(img_element, 0, 0, offscreen_canvas.width, offscreen_canvas.height);
        const image_data = off_ctx.getImageData(0, 0, offscreen_canvas.width, offscreen_canvas.height);
        const code = jsQR(image_data.data, image_data.width, image_data.height);

        if (code && code.data && code.location) {
            const corners = [
                code.location.topLeftCorner,
                code.location.topRightCorner,
                code.location.bottomRightCorner,
                code.location.bottomLeftCorner
            ];
            const detected_option = calculate_qr_orientation_option(corners);
            detected_items.push({
                raw_value: code.data,
                corners: corners,
                option: detected_option
            });
        }
    }

    if (detected_items.length === 0) {
        alert('Tidak ditemukan QR code pada gambar ini. Pastikan gambar jelas dan kontras.');
        return;
    }

    // Render AR overlays pada gambar statis
    detected_items.forEach((item) => {
        const matched_student = students_data.find(s => s.qr_token === item.raw_value);
        const student_name = matched_student ? matched_student.student_name : 'Siswa';

        draw_ar_student_badge(ar_ctx, item.corners, student_name, item.option);

        detected_answers_map.set(item.raw_value, {
            qr_token: item.raw_value,
            detected_option: item.option,
            student_name: student_name,
            timestamp: Date.now()
        });
    });

    sync_detected_answers_to_server();
    update_live_ui_analytics();
}

/**
 * Menghentikan streaming kamera web.
 */
function stop_webcam_stream() {
    is_scanning = false;
    if (media_stream) {
        media_stream.getTracks().forEach(track => track.stop());
        media_stream = null;
    }
    webcam_video.srcObject = null;
    camera_placeholder.classList.remove('hidden');
    btn_toggle_camera.textContent = 'Nyalakan Kamera';
    btn_toggle_camera.classList.remove('bg-rose-600', 'hover:bg-rose-500');
    btn_toggle_camera.classList.add('bg-emerald-600', 'hover:bg-emerald-500');

    // Bersihkan kanvas AR
    ar_ctx.clearRect(0, 0, ar_overlay_canvas.width, ar_overlay_canvas.height);
}

/**
 * Loop pemrosesan frame video Computer Vision real-time (30-60 FPS).
 */
async function process_video_frame_loop(now) {
    if (!is_scanning || !webcam_video.videoWidth) {
        return;
    }

    // Hitung FPS
    fps_frames++;
    if (now - fps_last_time >= 1000) {
        fps_counter.textContent = `${fps_frames} FPS`;
        fps_frames = 0;
        fps_last_time = now;
    }

    // Sinkronisasi resolusi canvas AR dengan resolusi asli video feed
    if (ar_overlay_canvas.width !== webcam_video.videoWidth || ar_overlay_canvas.height !== webcam_video.videoHeight) {
        ar_overlay_canvas.width = webcam_video.videoWidth;
        ar_overlay_canvas.height = webcam_video.videoHeight;
    }

    // Bersihkan overlay canvas untuk frame baru
    ar_ctx.clearRect(0, 0, ar_overlay_canvas.width, ar_overlay_canvas.height);

    const detected_items = [];

    // 1. Eksekusi deteksi QR Code
    if (barcode_detector_engine) {
        try {
            const barcodes = await barcode_detector_engine.detect(webcam_video);
            barcodes.forEach((barcode) => {
                if (barcode.rawValue && barcode.cornerPoints && barcode.cornerPoints.length >= 4) {
                    const detected_option = calculate_qr_orientation_option(barcode.cornerPoints);
                    detected_items.push({
                        raw_value: barcode.rawValue,
                        corners: barcode.cornerPoints,
                        option: detected_option
                    });
                }
            });
        } catch (err) {
            // Abaikan error transien antar frame
        }
    } else if (typeof jsQR !== 'undefined') {
        // Fallback jsQR
        const offscreen_canvas = document.createElement('canvas');
        offscreen_canvas.width = webcam_video.videoWidth;
        offscreen_canvas.height = webcam_video.videoHeight;
        const off_ctx = offscreen_canvas.getContext('2d');
        off_ctx.drawImage(webcam_video, 0, 0, offscreen_canvas.width, offscreen_canvas.height);
        const image_data = off_ctx.getImageData(0, 0, offscreen_canvas.width, offscreen_canvas.height);
        const code = jsQR(image_data.data, image_data.width, image_data.height);

        if (code && code.data && code.location) {
            const corners = [
                code.location.topLeftCorner,
                code.location.topRightCorner,
                code.location.bottomRightCorner,
                code.location.bottomLeftCorner
            ];
            const detected_option = calculate_qr_orientation_option(corners);
            detected_items.push({
                raw_value: code.data,
                corners: corners,
                option: detected_option
            });
        }
    }

    // 2. Render AR visual overlays & perbarui state jawaban
    let has_new_answers = false;

    detected_items.forEach((item) => {
        // Cari siswa yang cocok
        const matched_student = students_data.find(s => s.qr_token === item.raw_value);
        const student_name = matched_student ? matched_student.student_name : 'Siswa';

        // Render AR bounding box & label melayang
        draw_ar_student_badge(ar_ctx, item.corners, student_name, item.option);

        // Catat ke state
        if (matched_student) {
            const previous_entry = detected_answers_map.get(item.raw_value);
            if (!previous_entry || previous_entry.option !== item.option) {
                detected_answers_map.set(item.raw_value, {
                    qr_token: item.raw_value,
                    detected_option: item.option,
                    student_name: student_name,
                    timestamp: Date.now()
                });
                has_new_answers = true;
            }
        }
    });

    // 3. Sinkronisasi batch jawaban ke server backend (setiap ~500ms)
    if (has_new_answers || (Date.now() - last_sync_timestamp > 800 && detected_answers_map.size > 0)) {
        sync_detected_answers_to_server();
        update_live_ui_analytics();
    }

    if (is_scanning) {
        requestAnimationFrame(process_video_frame_loop);
    }
}

/**
 * Menggambar visualisasi Augmented Reality (AR) di atas canvas kamera.
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Array<{x: number, y: number}>} corners 
 * @param {string} student_name 
 * @param {'A'|'B'|'C'|'D'} option 
 */
function draw_ar_student_badge(ctx, corners, student_name, option) {
    if (!corners || corners.length < 4) return;

    // Warna berdasarkan opsi
    const color_map = {
        'A': '#f43f5e', // Rose
        'B': '#3b82f6', // Blue
        'C': '#f59e0b', // Amber
        'D': '#10b981'  // Emerald
    };
    const theme_color = color_map[option] || '#10b981';

    // 1. Gambar Bounding Box Poligon
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = theme_color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Fill semi-transparan
    ctx.fillStyle = theme_color + '22';
    ctx.fill();

    // 2. Gambar Indikator Titik Sudut Top-Left (Arah Atas)
    ctx.beginPath();
    ctx.arc(corners[0].x, corners[0].y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 3. Gambar Floating Badge Label di Atas QR
    const center_top_x = (corners[0].x + corners[1].x) / 2;
    const center_top_y = Math.min(corners[0].y, corners[1].y) - 14;

    const label_text = `${student_name}: [ ${option} ]`;
    ctx.font = 'bold 15px Plus Jakarta Sans, sans-serif';
    const text_metrics = ctx.measureText(label_text);
    const badge_width = text_metrics.width + 18;
    const badge_height = 28;

    // Background pill badge
    ctx.fillStyle = '#0f172a';
    round_rect(ctx, center_top_x - badge_width / 2, center_top_y - badge_height, badge_width, badge_height, 8, true);

    // Border pill badge
    ctx.strokeStyle = theme_color;
    ctx.lineWidth = 2;
    round_rect(ctx, center_top_x - badge_width / 2, center_top_y - badge_height, badge_width, badge_height, 8, false);

    // Teks label
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label_text, center_top_x, center_top_y - badge_height / 2);
}

/**
 * Utility helper untuk menggambar persegi panjang bersudut tumpul (rounded rectangle).
 */
function round_rect(ctx, x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

/**
 * Mengirim data jawaban yang terdeteksi ke endpoint server.
 */
async function sync_detected_answers_to_server() {
    if (!questions_data || questions_data.length === 0) return;
    const current_q = questions_data[current_question_index];
    if (!current_q) return;

    last_sync_timestamp = Date.now();

    const payload_answers = Array.from(detected_answers_map.values()).map(item => ({
        qr_token: item.qr_token,
        detected_option: item.detected_option
    }));

    if (payload_answers.length === 0) return;

    try {
        await fetch('/api/exam/submit-answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: current_session_id,
                question_id: current_q.id,
                detected_answers: payload_answers
            })
        });
    } catch (e) {
        console.warn('[Sync warning]:', e.message);
    }
}

/**
 * Memperbarui widget statistik live di panel kanan (diagram dan checklist kehadiran).
 */
function update_live_ui_analytics() {
    const total_students = students_data.length;
    const responded_count = detected_answers_map.size;

    live_responded_ratio.textContent = `${responded_count} / ${total_students} Siswa`;

    // Hitung frekuensi opsi A, B, C, D
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    detected_answers_map.forEach((val) => {
        if (counts[val.detected_option] !== undefined) {
            counts[val.detected_option]++;
        }
    });

    count_label_a.textContent = counts.A;
    count_label_b.textContent = counts.B;
    count_label_c.textContent = counts.C;
    count_label_d.textContent = counts.D;

    const base_total = Math.max(responded_count, 1);
    bar_a.style.width = `${(counts.A / base_total) * 100}%`;
    bar_b.style.width = `${(counts.B / base_total) * 100}%`;
    bar_c.style.width = `${(counts.C / base_total) * 100}%`;
    bar_d.style.width = `${(counts.D / base_total) * 100}%`;

    // Perbarui checklist siswa
    render_students_checklist();
}

/**
 * Merender daftar checklist respon masing-masing siswa di kelas aktif.
 */
function render_students_checklist() {
    if (students_data.length === 0) {
        students_checklist_container.innerHTML = '<p class="text-slate-500 italic text-[11px]">Belum ada siswa di kelas ini.</p>';
        return;
    }

    students_checklist_container.innerHTML = '';
    students_data.forEach((student) => {
        const detected = detected_answers_map.get(student.qr_token);
        const item_div = document.createElement('div');
        item_div.className = `p-2 rounded-lg flex items-center justify-between text-xs transition border ${
            detected 
                ? 'bg-slate-800/90 border-slate-700 text-slate-100' 
                : 'bg-slate-900/40 border-slate-800/60 text-slate-500'
        }`;

        item_div.innerHTML = `
            <div class="flex items-center gap-2 truncate">
                <span class="w-4 text-center font-bold text-[11px] ${detected ? 'text-emerald-400' : 'text-slate-600'}">
                    ${detected ? '✓' : '○'}
                </span>
                <span class="font-medium truncate">${escape_html(student.student_name)}</span>
            </div>
            ${detected ? `
                <span class="px-2 py-0.5 rounded font-black text-[11px] ${
                    detected.detected_option === 'A' ? 'bg-rose-500 text-white' :
                    detected.detected_option === 'B' ? 'bg-blue-500 text-white' :
                    detected.detected_option === 'C' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'
                }">
                    ${detected.detected_option}
                </span>
            ` : `
                <span class="text-[10px] text-slate-600 font-medium">Menunggu</span>
            `}
        `;

        students_checklist_container.appendChild(item_div);
    });
}

/**
 * Mengambil data soal kuis untuk navigasi scanner.
 */
async function fetch_quiz_questions() {
    try {
        const res = await fetch('/api/questions');
        const data = await res.json();
        if (res.ok && data.success) {
            questions_data = data.data || [];
            current_question_index = 0;
            render_scanner_active_question();
        }
    } catch (e) {
        console.error('[fetch_quiz_questions error]:', e);
    }
}

/**
 * Menampilkan pertanyaan yang sedang aktif di panel scanner.
 */
function render_scanner_active_question() {
    if (!questions_data || questions_data.length === 0) {
        active_question_num_badge.textContent = 'SOAL 0';
        active_question_text_preview.textContent = 'Belum ada soal dibuat di bank soal.';
        return;
    }

    const current_q = questions_data[current_question_index];
    active_question_num_badge.textContent = `SOAL ${current_question_index + 1} DARI ${questions_data.length}`;
    active_question_text_preview.textContent = current_q.question_text;

    btn_scanner_prev_q.disabled = current_question_index === 0;
    btn_scanner_next_q.disabled = current_question_index === questions_data.length - 1;

    // Reset jawaban untuk soal baru
    detected_answers_map.clear();
    update_live_ui_analytics();
}

/**
 * Mengambil data siswa kelas aktif.
 */
async function fetch_active_class_students() {
    try {
        const res_classes = await fetch('/api/classes');
        const classes_json = await res_classes.json();

        if (res_classes.ok && classes_json.success && classes_json.data.length > 0) {
            const first_class = classes_json.data[0];
            current_class_id = first_class.id;
            active_class_name_tag.textContent = `${first_class.class_name}`;

            const res_detail = await fetch(`/api/classes/${current_class_id}`);
            const detail_json = await res_detail.json();
            if (res_detail.ok && detail_json.success) {
                students_data = detail_json.data.students || [];
                render_students_checklist();
            }
        }
    } catch (e) {
        console.error('[fetch_active_class_students error]:', e);
    }
}

/**
 * Escape string HTML untuk keamanan XSS.
 */
function escape_html(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Event Listeners
btn_toggle_camera.addEventListener('click', () => {
    if (is_scanning) {
        stop_webcam_stream();
    } else {
        const selected_dev = camera_device_select.value;
        start_webcam_stream(selected_dev || null);
    }
});

camera_device_select.addEventListener('change', () => {
    const selected_opt = camera_device_select.options[camera_device_select.selectedIndex];
    const label = selected_opt ? selected_opt.textContent.toLowerCase() : '';
    if (label.includes('front') || label.includes('depan') || label.includes('user')) {
        set_mirror_mode(true);
    } else if (label.includes('back') || label.includes('belakang') || label.includes('rear') || label.includes('environment')) {
        set_mirror_mode(false);
    }
    if (is_scanning) {
        start_webcam_stream(camera_device_select.value);
    }
});

// Listener interaksi checkbox mode cermin kamera depan
if (mirror_mode_checkbox) {
    mirror_mode_checkbox.addEventListener('change', (e) => {
        set_mirror_mode(e.target.checked);
    });
}
if (ip_mirror_mode_checkbox) {
    ip_mirror_mode_checkbox.addEventListener('change', (e) => {
        set_mirror_mode(e.target.checked);
    });
}

btn_scanner_next_q.addEventListener('click', () => {
    if (current_question_index < questions_data.length - 1) {
        current_question_index++;
        render_scanner_active_question();
    }
});

btn_scanner_prev_q.addEventListener('click', () => {
    if (current_question_index > 0) {
        current_question_index--;
        render_scanner_active_question();
    }
});

// Event Tab Mode Switcher
if (tab_webcam_mode && tab_ip_mode) {
    tab_webcam_mode.addEventListener('click', () => {
        tab_webcam_mode.className = 'px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-sm transition flex items-center gap-1.5';
        tab_ip_mode.className = 'px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center gap-1.5';
        controls_webcam_box.classList.remove('hidden');
        controls_ip_box.classList.add('hidden');
        if (is_ip_camera_active) stop_ip_webcam();
    });

    tab_ip_mode.addEventListener('click', () => {
        tab_ip_mode.className = 'px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-sm transition flex items-center gap-1.5';
        tab_webcam_mode.className = 'px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition flex items-center gap-1.5';
        controls_ip_box.classList.remove('hidden');
        controls_webcam_box.classList.add('hidden');
        if (is_scanning) stop_webcam_stream();
    });
}

/**
 * Menghubungkan atau memutus koneksi streaming kamera dari HP (IP Webcam).
 */
async function toggle_ip_webcam_connection() {
    if (is_ip_camera_active) {
        stop_ip_webcam();
    } else {
        await start_ip_webcam();
    }
}

/**
 * Memulai streaming pemindaian dari IP Webcam HP Android.
 */
async function start_ip_webcam() {
    let raw_url = ip_webcam_url_input.value.trim();
    if (!raw_url) {
        alert('Silakan masukkan alamat URL IP Webcam (contoh: http://192.168.1.15:8080)');
        ip_webcam_url_input.focus();
        return;
    }

    // Normalisasi URL
    if (!raw_url.startsWith('http://') && !raw_url.startsWith('https://')) {
        raw_url = 'http://' + raw_url;
    }
    raw_url = raw_url.replace(/\/+$/, ''); // Hapus trailing slash
    localStorage.setItem('cvq_ip_webcam_url', raw_url);

    const stream_mode = ip_stream_mode_select.value; // 'proxy_shot' atau 'direct_mjpeg'
    is_ip_camera_active = true;

    btn_connect_ip_camera.textContent = 'Putuskan HP';
    btn_connect_ip_camera.className = 'px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition';
    ip_connection_status.textContent = 'Menghubungkan ke ' + raw_url + '...';
    ip_connection_status.className = 'font-bold text-amber-400';
    camera_placeholder.classList.add('hidden');

    if (stream_mode === 'proxy_shot') {
        // Mode 1: Polling snapshot via proxy backend anti-CORS (paling stabil & kompatibel)
        run_ip_camera_polling_loop(raw_url);
    } else {
        // Mode 2: Direct MJPEG stream
        run_direct_mjpeg_stream(raw_url);
    }
}

/**
 * Menghentikan koneksi streaming IP Webcam HP.
 */
function stop_ip_webcam() {
    is_ip_camera_active = false;
    if (ip_polling_timer_id) {
        clearTimeout(ip_polling_timer_id);
        ip_polling_timer_id = null;
    }
    if (ip_stream_img_element) {
        ip_stream_img_element.onload = null;
        ip_stream_img_element.onerror = null;
        ip_stream_img_element.src = '';
        ip_stream_img_element = null;
    }

    btn_connect_ip_camera.textContent = 'Hubungkan HP';
    btn_connect_ip_camera.className = 'px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition';
    ip_connection_status.textContent = 'Koneksi Terputus';
    ip_connection_status.className = 'font-bold text-slate-500';
    camera_placeholder.classList.remove('hidden');

    ar_ctx.clearRect(0, 0, ar_overlay_canvas.width, ar_overlay_canvas.height);
}

/**
 * Loop pengambilan frame berkecepatan tinggi via endpoint proxy anti-CORS backend.
 * @param {string} base_url 
 */
async function run_ip_camera_polling_loop(base_url) {
    if (!is_ip_camera_active) return;

    const shot_target = `${base_url}/shot.jpg`;
    const proxy_url = `/api/exam/proxy-shot?url=${encodeURIComponent(shot_target)}&_t=${Date.now()}`;

    try {
        const response = await fetch(proxy_url);
        if (!response.ok) {
            throw new Error(`Gagal fetch frame (Status ${response.status})`);
        }

        const blob = await response.blob();
        const img = new Image();

        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(e);
            img.src = URL.createObjectURL(blob);
        });

        // Update status terkoneksi hijau
        ip_connection_status.textContent = 'Terhubung (Anti-CORS Stream Aktif)';
        ip_connection_status.className = 'font-bold text-emerald-400';

        // Sesuaikan ukuran kanvas AR dengan resolusi frame kamera HP
        if (ar_overlay_canvas.width !== img.naturalWidth || ar_overlay_canvas.height !== img.naturalHeight) {
            ar_overlay_canvas.width = img.naturalWidth;
            ar_overlay_canvas.height = img.naturalHeight;
        }

        // Gambar frame kamera HP ke kanvas
        ar_ctx.drawImage(img, 0, 0, ar_overlay_canvas.width, ar_overlay_canvas.height);
        URL.revokeObjectURL(img.src);

        // Eksekusi Computer Vision QR 4 Sisi pada frame ini
        await execute_frame_vision_detection(ar_overlay_canvas);

    } catch (err) {
        ip_connection_status.textContent = 'Koneksi Gagal: ' + err.message;
        ip_connection_status.className = 'font-bold text-rose-400';
    }

    if (is_ip_camera_active) {
        // Interval refresh frame ~50ms (~15-20 FPS real-time)
        ip_polling_timer_id = setTimeout(() => run_ip_camera_polling_loop(base_url), 50);
    }
}

/**
 * Menjalankan streaming langsung MJPEG via tag Image.
 * @param {string} base_url 
 */
function run_direct_mjpeg_stream(base_url) {
    ip_stream_img_element = new Image();
    ip_stream_img_element.crossOrigin = 'anonymous';

    ip_stream_img_element.onload = () => {
        ip_connection_status.textContent = 'Terhubung (Direct MJPEG Stream)';
        ip_connection_status.className = 'font-bold text-emerald-400';
        requestAnimationFrame(direct_mjpeg_render_loop);
    };

    ip_stream_img_element.onerror = () => {
        ip_connection_status.textContent = 'CORS Terhalang. Disarankan pilih mode "Anti-CORS Proxy".';
        ip_connection_status.className = 'font-bold text-rose-400';
    };

    ip_stream_img_element.src = `${base_url}/video`;
}

/**
 * Loop render untuk direct MJPEG stream.
 */
async function direct_mjpeg_render_loop() {
    if (!is_ip_camera_active || !ip_stream_img_element) return;

    if (ip_stream_img_element.naturalWidth) {
        if (ar_overlay_canvas.width !== ip_stream_img_element.naturalWidth || ar_overlay_canvas.height !== ip_stream_img_element.naturalHeight) {
            ar_overlay_canvas.width = ip_stream_img_element.naturalWidth;
            ar_overlay_canvas.height = ip_stream_img_element.naturalHeight;
        }
        ar_ctx.drawImage(ip_stream_img_element, 0, 0, ar_overlay_canvas.width, ar_overlay_canvas.height);
        await execute_frame_vision_detection(ar_overlay_canvas);
    }

    if (is_ip_camera_active) {
        requestAnimationFrame(direct_mjpeg_render_loop);
    }
}

/**
 * Menjalankan deteksi barcode dan kalkulasi orientasi 4 sisi pada canvas target.
 * @param {HTMLCanvasElement} canvas_element 
 */
async function execute_frame_vision_detection(canvas_element) {
    const detected_items = [];

    if (barcode_detector_engine) {
        try {
            const barcodes = await barcode_detector_engine.detect(canvas_element);
            barcodes.forEach((barcode) => {
                if (barcode.rawValue && barcode.cornerPoints && barcode.cornerPoints.length >= 4) {
                    const detected_option = calculate_qr_orientation_option(barcode.cornerPoints);
                    detected_items.push({
                        raw_value: barcode.rawValue,
                        corners: barcode.cornerPoints,
                        option: detected_option
                    });
                }
            });
        } catch (e) {
            // Abaikan error transien antar frame
        }
    } else if (typeof jsQR !== 'undefined') {
        const off_ctx = canvas_element.getContext('2d');
        const img_data = off_ctx.getImageData(0, 0, canvas_element.width, canvas_element.height);
        const code = jsQR(img_data.data, img_data.width, img_data.height);
        if (code && code.data && code.location) {
            const corners = [
                code.location.topLeftCorner,
                code.location.topRightCorner,
                code.location.bottomRightCorner,
                code.location.bottomLeftCorner
            ];
            const detected_option = calculate_qr_orientation_option(corners);
            detected_items.push({
                raw_value: code.data,
                corners: corners,
                option: detected_option
            });
        }
    }

    let has_new_answers = false;

    detected_items.forEach((item) => {
        const matched_student = students_data.find(s => s.qr_token === item.raw_value);
        const student_name = matched_student ? matched_student.student_name : 'Siswa';

        draw_ar_student_badge(ar_ctx, item.corners, student_name, item.option);

        if (matched_student) {
            const previous_entry = detected_answers_map.get(item.raw_value);
            if (!previous_entry || previous_entry.option !== item.option) {
                detected_answers_map.set(item.raw_value, {
                    qr_token: item.raw_value,
                    detected_option: item.option,
                    student_name: student_name,
                    timestamp: Date.now()
                });
                has_new_answers = true;
            }
        }
    });

    if (has_new_answers || (Date.now() - last_sync_timestamp > 800 && detected_answers_map.size > 0)) {
        sync_detected_answers_to_server();
        update_live_ui_analytics();
    }
}

if (btn_connect_ip_camera) {
    btn_connect_ip_camera.addEventListener('click', toggle_ip_webcam_connection);
}

// Event Listener Pengujian via Unggah File Gambar
const btn_upload_file_trigger = document.getElementById('btn_upload_file_trigger');
const image_file_input = document.getElementById('image_file_input');

if (btn_upload_file_trigger && image_file_input) {
    btn_upload_file_trigger.addEventListener('click', () => {
        image_file_input.click();
    });

    image_file_input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = async () => {
            camera_placeholder.classList.add('hidden');
            ar_overlay_canvas.width = img.naturalWidth || 800;
            ar_overlay_canvas.height = img.naturalHeight || 600;
            ar_ctx.drawImage(img, 0, 0, ar_overlay_canvas.width, ar_overlay_canvas.height);

            await process_static_image_scan(img);
        };
        img.src = URL.createObjectURL(file);
    });
}

// Inisialisasi awal saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    const saved_ip = localStorage.getItem('cvq_ip_webcam_url');
    if (saved_ip && ip_webcam_url_input) {
        ip_webcam_url_input.value = saved_ip;
    }

    const saved_mirror = localStorage.getItem('cvq_mirror_mode');
    if (saved_mirror !== null) {
        set_mirror_mode(saved_mirror === 'true');
    }

    await initialize_vision_engine();
    await enumerate_camera_devices();
    await fetch_quiz_questions();
    await fetch_active_class_students();
});
