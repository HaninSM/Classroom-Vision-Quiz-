/**
 * @file print_cards.js
 * @description Skrip antarmuka cetak lembar jawaban fisik QR code 4 sisi untuk siswa.
 */

// Elemen DOM
const class_subtitle = document.getElementById('class_subtitle');
const select_class_dropdown = document.getElementById('select_class_dropdown');
const select_layout_mode = document.getElementById('select_layout_mode');
const btn_trigger_print = document.getElementById('btn_trigger_print');
const loading_spinner_box = document.getElementById('loading_spinner_box');
const cards_render_container = document.getElementById('cards_render_container');

// State aplikasi
let current_class_id = null;
let current_class_data = null;

/**
 * Mengambil parameter query URL berdasarkan nama key.
 * @param {string} param_name 
 * @returns {string|null}
 */
function get_query_param(param_name) {
    const url_params = new URLSearchParams(window.location.search);
    return url_params.get(param_name);
}

/**
 * Mengambil seluruh daftar kelas untuk mengisi opsi dropdown pemilihan kelas.
 */
async function populate_class_dropdown() {
    try {
        const response = await fetch('/api/classes');
        const result = await response.json();

        if (response.ok && result.success && Array.isArray(result.data)) {
            select_class_dropdown.innerHTML = '<option value="">-- Pilih Kelas Lain --</option>';
            result.data.forEach((class_item) => {
                const opt = document.createElement('option');
                opt.value = class_item.id;
                opt.textContent = `${class_item.class_name} (${class_item.total_students || 0} Siswa)`;
                if (String(class_item.id) === String(current_class_id)) {
                    opt.selected = true;
                }
                select_class_dropdown.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('[ERROR populate_class_dropdown]:', error);
    }
}

/**
 * Mengambil data lembar kartu siswa beserta QR code dari server.
 * @param {number|string} class_id 
 */
async function fetch_and_render_cards(class_id) {
    if (!class_id) {
        loading_spinner_box.innerHTML = `
            <p class="text-amber-600 font-semibold">Silakan pilih kelas melalui dropdown di atas untuk melihat lembar jawaban.</p>
        `;
        return;
    }

    loading_spinner_box.classList.remove('hidden');
    cards_render_container.innerHTML = '';
    class_subtitle.textContent = 'Memuat lembar kartu siswa...';

    try {
        const response = await fetch(`/api/classes/${class_id}/cards`);
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Gagal memuat data kartu siswa.');
        }

        current_class_data = result.data;
        class_subtitle.textContent = `${current_class_data.class_name} • ${current_class_data.total_students} Siswa`;

        render_all_student_cards(current_class_data.students, current_class_data.class_name);
        loading_spinner_box.classList.add('hidden');
    } catch (error) {
        loading_spinner_box.classList.remove('hidden');
        loading_spinner_box.innerHTML = `
            <div class="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm max-w-md mx-auto">
                <p class="font-bold">Gagal Menyiapkan Kartu</p>
                <p class="text-xs mt-1">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Merender seluruh kartu siswa ke kontainer tampilan.
 * @param {Array<Object>} students_list - Daftar siswa dengan qr_image_data_url
 * @param {string} class_name - Nama kelas
 */
function render_all_student_cards(students_list, class_name) {
    cards_render_container.innerHTML = '';

    if (!students_list || students_list.length === 0) {
        cards_render_container.innerHTML = `
            <div class="text-center py-12 text-slate-400 italic">
                Belum ada siswa yang terdaftar di kelas ini.
            </div>
        `;
        return;
    }

    const layout_mode = select_layout_mode.value; // '1' atau '2'
    const card_class_name = layout_mode === '1' ? 'card-1-per-page min-h-[820px]' : 'card-2-per-page min-h-[440px]';

    students_list.forEach((student, index) => {
        const card_element = create_single_card_dom(student, class_name, card_class_name);
        cards_render_container.appendChild(card_element);
    });
}

/**
 * Membuat elemen DOM untuk satu lembar jawaban siswa 4 sisi.
 * @param {Object} student - Data siswa
 * @param {string} class_name - Nama kelas
 * @param {string} layout_class - Kelas styling dimensi kartu
 * @returns {HTMLElement} Elemen kartu
 */
function create_single_card_dom(student, class_name, layout_class) {
    const card_wrapper = document.createElement('div');
    card_wrapper.className = `print-card-container ${layout_class} bg-white rounded-2xl border-4 border-slate-900 p-6 flex flex-col justify-between relative select-none shadow-sm`;

    card_wrapper.innerHTML = `
        <!-- SISI ATAS: OPSI A (Tegak Normal) -->
        <div class="w-full flex flex-col items-center justify-center pb-2 border-b-2 border-dashed border-slate-300">
            <div class="side-label-top flex items-center gap-2">
                <span class="text-xs font-black tracking-widest text-slate-500 uppercase">&uarr; HADAPKAN KE ATAS &uarr;</span>
                <span class="text-5xl sm:text-6xl font-black text-slate-900">A</span>
                <span class="text-xs font-black tracking-widest text-slate-500 uppercase">&uarr; OPSI A &uarr;</span>
            </div>
        </div>

        <!-- AREA TENGAH: SISI D (KIRI), QR CODE (TENGAH), SISI B (KANAN) -->
        <div class="flex-1 flex items-center justify-between py-4 px-2">
            
            <!-- SISI KIRI: OPSI D (Diputar 270 deg) -->
            <div class="h-full flex flex-col items-center justify-center w-16 border-r-2 border-dashed border-slate-300 pr-2">
                <div class="side-label-left flex flex-col items-center text-center">
                    <span class="text-xs font-black tracking-widest text-slate-500 uppercase whitespace-nowrap">&uarr; OPSI D &uarr;</span>
                    <span class="text-5xl sm:text-6xl font-black text-slate-900 mt-1">D</span>
                </div>
            </div>

            <!-- BAGIAN INTI: QR CODE & IDENTITAS SISWA -->
            <div class="flex-1 flex flex-col items-center justify-center text-center px-4">
                
                <!-- Header Identitas Singkat -->
                <div class="mb-3">
                    <span class="inline-block bg-slate-900 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                        NO. ${student.student_number || student.id}
                    </span>
                    <h2 class="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase">
                        ${escape_html(student.student_name)}
                    </h2>
                    <p class="text-xs font-bold text-slate-600">${escape_html(class_name)}</p>
                </div>

                <!-- Gambar QR Code Beresolusi Tinggi -->
                <div class="p-3 bg-white border-4 border-slate-900 rounded-2xl shadow-sm">
                    <img 
                        src="${student.qr_image_data_url}" 
                        alt="QR Code ${escape_html(student.student_name)}" 
                        class="w-48 h-48 sm:w-60 sm:h-60 object-contain"
                    />
                </div>

                <!-- Petunjuk Pemakaian -->
                <div class="mt-3 text-[11px] font-bold text-slate-500 max-w-xs leading-tight">
                    <span>Putar sisi huruf jawabanmu (A, B, C, atau D) menghadap ke atas lalu angkat kartu lurus ke depan.</span>
                    <p class="font-mono text-[9px] text-slate-400 mt-1">Token: ${student.qr_token}</p>
                </div>

            </div>

            <!-- SISI KANAN: OPSI B (Diputar 90 deg) -->
            <div class="h-full flex flex-col items-center justify-center w-16 border-l-2 border-dashed border-slate-300 pl-2">
                <div class="side-label-right flex flex-col items-center text-center">
                    <span class="text-xs font-black tracking-widest text-slate-500 uppercase whitespace-nowrap">&uarr; OPSI B &uarr;</span>
                    <span class="text-5xl sm:text-6xl font-black text-slate-900 mt-1">B</span>
                </div>
            </div>

        </div>

        <!-- SISI BAWAH: OPSI C (Diputar 180 deg) -->
        <div class="w-full flex flex-col items-center justify-center pt-2 border-t-2 border-dashed border-slate-300">
            <div class="side-label-bottom flex items-center gap-2">
                <span class="text-xs font-black tracking-widest text-slate-500 uppercase">&uarr; OPSI C &uarr;</span>
                <span class="text-5xl sm:text-6xl font-black text-slate-900">C</span>
                <span class="text-xs font-black tracking-widest text-slate-500 uppercase">&uarr; HADAPKAN KE ATAS &uarr;</span>
            </div>
        </div>
    `;

    return card_wrapper;
}

/**
 * Escape teks untuk keamanan XSS.
 * @param {string} text 
 * @returns {string} Safe text
 */
function escape_html(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Event Listeners
select_class_dropdown.addEventListener('change', (e) => {
    const selected_id = e.target.value;
    if (selected_id) {
        current_class_id = selected_id;
        window.history.replaceState(null, '', `?class_id=${selected_id}`);
        fetch_and_render_cards(selected_id);
    }
});

select_layout_mode.addEventListener('change', () => {
    if (current_class_data && current_class_data.students) {
        render_all_student_cards(current_class_data.students, current_class_data.class_name);
    }
});

btn_trigger_print.addEventListener('click', () => {
    window.print();
});

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', async () => {
    current_class_id = get_query_param('class_id');
    await populate_class_dropdown();

    if (current_class_id) {
        select_class_dropdown.value = current_class_id;
        fetch_and_render_cards(current_class_id);
    } else {
        // Jika belum ada ID di parameter, coba pilih opsi pertama dari dropdown jika tersedia
        if (select_class_dropdown.options.length > 1) {
            select_class_dropdown.selectedIndex = 1;
            current_class_id = select_class_dropdown.value;
            window.history.replaceState(null, '', `?class_id=${current_class_id}`);
            fetch_and_render_cards(current_class_id);
        } else {
            loading_spinner_box.innerHTML = `
                <div class="text-center p-8 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto">
                    <p class="text-sm font-bold text-slate-800">Belum ada kelas yang dipilih</p>
                    <p class="text-xs text-slate-500 mt-1">Silakan kembali ke form kelas untuk membuat kelas dan mendaftarkan siswa terlebih dahulu.</p>
                    <a href="/" class="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">
                        &larr; Buka Form Kelas
                    </a>
                </div>
            `;
        }
    }
});
