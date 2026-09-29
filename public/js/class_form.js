/**
 * @file class_form.js
 * @description Logika interaktif antarmuka form dinamis pembuatan kelas dan siswa (maksimal 25 murid).
 */

// Konstanta batas maksimum siswa
const MAX_ALLOWED_STUDENTS = 25;

// Elemen DOM
const class_name_input = document.getElementById('class_name_input');
const quick_amount_input = document.getElementById('quick_amount_input');
const btn_generate_rows = document.getElementById('btn_generate_rows');
const btn_add_one_row = document.getElementById('btn_add_one_row');
const student_inputs_container = document.getElementById('student_inputs_container');
const student_count_badge = document.getElementById('student_count_badge');
const btn_submit_class = document.getElementById('btn_submit_class');
const btn_reset_form = document.getElementById('btn_reset_form');
const btn_toggle_paste = document.getElementById('btn_toggle_paste');
const paste_box_container = document.getElementById('paste_box_container');
const paste_names_textarea = document.getElementById('paste_names_textarea');
const btn_apply_paste = document.getElementById('btn_apply_paste');
const btn_cancel_paste = document.getElementById('btn_cancel_paste');

// Elemen Notifikasi & Hasil
const status_alert_box = document.getElementById('status_alert_box');
const alert_icon = document.getElementById('alert_icon');
const alert_title = document.getElementById('alert_title');
const alert_message = document.getElementById('alert_message');
const created_class_result_card = document.getElementById('created_class_result_card');
const result_class_title = document.getElementById('result_class_title');
const result_class_id = document.getElementById('result_class_id');
const result_student_count = document.getElementById('result_student_count');
const result_student_list = document.getElementById('result_student_list');
const existing_classes_container = document.getElementById('existing_classes_container');
const btn_refresh_classes = document.getElementById('btn_refresh_classes');

/**
 * Menampilkan pesan alert/notifikasi kepada pengguna.
 * @param {string} title - Judul pesan
 * @param {string} message - Isi rincian pesan
 * @param {'success'|'error'|'warning'} type - Jenis notifikasi
 */
function show_notification(title, message, type = 'success') {
    status_alert_box.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-800', 
                                     'bg-rose-50', 'border-rose-200', 'text-rose-800',
                                     'bg-amber-50', 'border-amber-200', 'text-amber-800');

    if (type === 'success') {
        status_alert_box.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
        alert_icon.textContent = '✅';
    } else if (type === 'error') {
        status_alert_box.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-800');
        alert_icon.textContent = '⚠️';
    } else {
        status_alert_box.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-800');
        alert_icon.textContent = 'ℹ️';
    }

    alert_title.textContent = title;
    alert_message.textContent = message;
}

/**
 * Memperbarui badge counter jumlah siswa saat ini.
 */
function update_student_counter() {
    const current_rows = student_inputs_container.querySelectorAll('.student-input-row');
    const total_count = current_rows.length;
    student_count_badge.textContent = `${total_count} / ${MAX_ALLOWED_STUDENTS} Siswa`;

    if (total_count >= MAX_ALLOWED_STUDENTS) {
        student_count_badge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200';
    } else {
        student_count_badge.className = 'px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200';
    }

    // Perbarui penomoran urut baris
    current_rows.forEach((row_elem, index) => {
        const number_badge = row_elem.querySelector('.row-number');
        if (number_badge) {
            number_badge.textContent = index + 1;
        }
    });
}

/**
 * Menambahkan satu baris input nama siswa ke kontainer.
 * @param {string} initial_name - Nilai awal nama siswa jika ada
 * @returns {boolean} True jika berhasil ditambahkan, false jika telah mencapai limit
 */
function add_single_student_row(initial_name = '') {
    const current_count = student_inputs_container.querySelectorAll('.student-input-row').length;
    if (current_count >= MAX_ALLOWED_STUDENTS) {
        show_notification('Batas Maksimum Tercapai', `Jumlah murid dibatasi maksimal ${MAX_ALLOWED_STUDENTS} orang per kelas.`, 'warning');
        return false;
    }

    const row_div = document.createElement('div');
    row_div.className = 'student-input-row flex items-center gap-2 transition-all';
    row_div.innerHTML = `
        <span class="row-number w-7 h-9 flex items-center justify-center text-xs font-bold bg-slate-100 text-slate-600 rounded-lg border border-slate-200 shrink-0">
            ${current_count + 1}
        </span>
        <input 
            type="text" 
            placeholder="Ketik nama lengkap siswa..." 
            value="${escape_html(initial_name)}"
            class="student-name-input flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
            required
        >
        <button 
            type="button" 
            class="btn-delete-row px-2 py-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs transition"
            title="Hapus baris ini"
        >
            ❌
        </button>
    `;

    // Event handler tombol hapus per baris
    const delete_btn = row_div.querySelector('.btn-delete-row');
    delete_btn.addEventListener('click', () => {
        row_div.remove();
        update_student_counter();
    });

    student_inputs_container.appendChild(row_div);
    update_student_counter();
    return true;
}

/**
 * Escape karakter HTML untuk mencegah injeksi XSS pada value input.
 * @param {string} unsafe_string 
 * @returns {string} Safe string
 */
function escape_html(unsafe_string) {
    if (!unsafe_string) return '';
    return unsafe_string
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Menghasilkan N baris input siswa secara langsung.
 * @param {number} row_count - Jumlah baris yang diinginkan (1 - 25)
 */
function generate_multiple_student_rows(row_count) {
    const target_count = Math.min(Math.max(parseInt(row_count, 10) || 1, 1), MAX_ALLOWED_STUDENTS);
    student_inputs_container.innerHTML = '';
    for (let i = 0; i < target_count; i++) {
        add_single_student_row('');
    }
}

/**
 * Menangani pengiriman form pembuatan kelas dan siswa ke backend API.
 */
async function handle_submit_class_form() {
    const class_name_val = class_name_input.value.trim();
    if (!class_name_val) {
        show_notification('Validasi Gagal', 'Nama kelas wajib diisi.', 'error');
        class_name_input.focus();
        return;
    }

    const input_elements = student_inputs_container.querySelectorAll('.student-name-input');
    if (input_elements.length === 0) {
        show_notification('Validasi Gagal', 'Daftar nama siswa minimal harus ada 1 orang.', 'error');
        return;
    }

    const student_names = [];
    for (let i = 0; i < input_elements.length; i++) {
        const student_name = input_elements[i].value.trim();
        if (!student_name) {
            show_notification('Validasi Gagal', `Nama siswa baris ke-${i + 1} tidak boleh kosong.`, 'error');
            input_elements[i].focus();
            return;
        }
        student_names.push({ name: student_name });
    }

    // Set status loading tombol
    btn_submit_class.disabled = true;
    btn_submit_class.innerHTML = `<span>Menyimpan ke Database...</span>`;

    try {
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                class_name: class_name_val,
                students: student_names
            })
        });

        const response_data = await response.json();

        if (!response.ok || !response_data.success) {
            throw new Error(response_data.message || 'Gagal menyimpan kelas.');
        }

        // Tampilkan pesan sukses dan hasil render kartu siswa
        show_notification('Sukses Tersimpan', `Kelas "${response_data.data.class_name}" dengan ${response_data.data.total_students} siswa berhasil dibuat.`, 'success');
        render_saved_class_result(response_data.data);
        load_existing_classes();

        // Reset form
        class_name_input.value = '';
        generate_multiple_student_rows(5);

    } catch (error) {
        show_notification('Terjadi Kesalahan', error.message, 'error');
    } finally {
        btn_submit_class.disabled = false;
        btn_submit_class.innerHTML = `<span>Simpan Kelas & Daftar Siswa</span>`;
    }
}

/**
 * Menampilkan hasil kelas yang baru dibuat beserta token QR masing-masing siswa.
 * @param {Object} class_result - Objek hasil dari API
 */
function render_saved_class_result(class_result) {
    created_class_result_card.classList.remove('hidden');
    result_class_title.textContent = class_result.class_name;
    result_class_id.textContent = `Class ID: #${class_result.class_id}`;
    result_student_count.textContent = `Total: ${class_result.total_students} Siswa`;

    result_student_list.innerHTML = '';
    class_result.students.forEach((student_item, index) => {
        const item_div = document.createElement('div');
        item_div.className = 'flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs';
        item_div.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="font-bold text-slate-500 w-5">${index + 1}.</span>
                <span class="font-semibold text-slate-800">${escape_html(student_item.student_name)}</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="font-mono text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    ${student_item.qr_token}
                </span>
            </div>
        `;
        result_student_list.appendChild(item_div);
    });

    const btn_go_to_print_cards = document.getElementById('btn_go_to_print_cards');
    if (btn_go_to_print_cards && class_result.class_id) {
        btn_go_to_print_cards.href = `/print_cards.html?class_id=${class_result.class_id}`;
    }

    created_class_result_card.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Mengambil daftar kelas yang telah tersimpan di sistem.
 */
async function load_existing_classes() {
    try {
        const response = await fetch('/api/classes');
        const result = await response.json();

        if (!response.ok || !result.success) {
            existing_classes_container.innerHTML = `<p class="text-rose-500 italic">Gagal memuat: ${result.message || 'Periksa server database.'}</p>`;
            return;
        }

        const class_list = result.data || [];
        if (class_list.length === 0) {
            existing_classes_container.innerHTML = `<p class="text-slate-400 italic">Belum ada kelas tersimpan. Silakan buat kelas baru di atas.</p>`;
            return;
        }

        existing_classes_container.innerHTML = '';
        class_list.forEach((item) => {
            const class_item_div = document.createElement('div');
            class_item_div.className = 'p-3 rounded-xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 transition flex items-center justify-between';
            class_item_div.innerHTML = `
                <div class="cursor-pointer flex-1" onclick="fetch_and_display_class_details(${item.id})">
                    <h5 class="font-bold text-slate-800">${escape_html(item.class_name)}</h5>
                    <p class="text-[11px] text-slate-500">ID: #${item.id} &bull; ${item.total_students || 0} Siswa</p>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button 
                        type="button" 
                        onclick="fetch_and_display_class_details(${item.id})"
                        class="text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white px-2 py-1 rounded-md border border-slate-200 shadow-sm"
                        title="Lihat Detail Siswa"
                    >
                        👁️ Detail
                    </button>
                    <a 
                        href="/print_cards.html?class_id=${item.id}" 
                        target="_blank"
                        class="text-xs font-semibold text-indigo-700 hover:text-white hover:bg-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200 shadow-sm transition"
                        title="Buka Lembar Cetak Kartu"
                    >
                        🖨️ Cetak
                    </a>
                </div>
            `;
            existing_classes_container.appendChild(class_item_div);
        });

    } catch (error) {
        existing_classes_container.innerHTML = `<p class="text-amber-600 italic">Belum terhubung ke database MySQL. Pastikan MySQL sudah menyala.</p>`;
    }
}

/**
 * Mengambil detail kelas tertentu beserta siswa-siswanya.
 * @param {number} class_id - ID kelas
 */
async function fetch_and_display_class_details(class_id) {
    try {
        const response = await fetch(`/api/classes/${class_id}`);
        const result = await response.json();
        if (response.ok && result.success) {
            render_saved_class_result(result.data);
        }
    } catch (error) {
        show_notification('Gagal Mengambil Detail', error.message, 'error');
    }
}

// Event Listeners
btn_generate_rows.addEventListener('click', () => {
    generate_multiple_student_rows(quick_amount_input.value);
});

btn_add_one_row.addEventListener('click', () => {
    add_single_student_row('');
});

btn_reset_form.addEventListener('click', () => {
    class_name_input.value = '';
    generate_multiple_student_rows(5);
});

btn_submit_class.addEventListener('click', handle_submit_class_form);

btn_refresh_classes.addEventListener('click', load_existing_classes);

// Fitur Paste Bulk Nama
btn_toggle_paste.addEventListener('click', () => {
    paste_box_container.classList.toggle('hidden');
    if (!paste_box_container.classList.contains('hidden')) {
        paste_names_textarea.focus();
    }
});

btn_cancel_paste.addEventListener('click', () => {
    paste_box_container.classList.add('hidden');
    paste_names_textarea.value = '';
});

btn_apply_paste.addEventListener('click', () => {
    const raw_text = paste_names_textarea.value;
    const lines = raw_text.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (lines.length === 0) {
        show_notification('Peringatan', 'Tidak ada baris teks yang dipaste.', 'warning');
        return;
    }

    const available_slots = MAX_ALLOWED_STUDENTS;
    const names_to_insert = lines.slice(0, available_slots);

    student_inputs_container.innerHTML = '';
    names_to_insert.forEach(name => add_single_student_row(name));

    paste_box_container.classList.add('hidden');
    paste_names_textarea.value = '';

    if (lines.length > available_slots) {
        show_notification('Sebagian Ditampung', `Hanya ${available_slots} nama pertama yang dimasukkan sesuai batasan maksimal 25 murid.`, 'warning');
    }
});

// Inisialisasi awal saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    generate_multiple_student_rows(5);
    load_existing_classes();
});
