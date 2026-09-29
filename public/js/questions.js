/**
 * @file questions.js
 * @description Logika interaktif antarmuka manajemen bank soal kuis (CRUD pertanyaan).
 */

// Elemen DOM Form
const question_form = document.getElementById('question_form');
const question_text_input = document.getElementById('question_text_input');
const option_a_input = document.getElementById('option_a_input');
const option_b_input = document.getElementById('option_b_input');
const option_c_input = document.getElementById('option_c_input');
const option_d_input = document.getElementById('option_d_input');
const btn_save_question = document.getElementById('btn_save_question');
const btn_reset_question_form = document.getElementById('btn_reset_question_form');

// Elemen DOM Daftar & Notifikasi
const question_status_alert = document.getElementById('question_status_alert');
const question_alert_icon = document.getElementById('question_alert_icon');
const question_alert_title = document.getElementById('question_alert_title');
const question_alert_message = document.getElementById('question_alert_message');
const questions_list_container = document.getElementById('questions_list_container');
const total_questions_counter = document.getElementById('total_questions_counter');
const btn_refresh_questions = document.getElementById('btn_refresh_questions');

/**
 * Menampilkan pesan alert kepada pengguna.
 * @param {string} title 
 * @param {string} message 
 * @param {'success'|'error'|'warning'} type 
 */
function show_question_alert(title, message, type = 'success') {
    question_status_alert.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-200', 'text-emerald-800',
                                           'bg-rose-50', 'border-rose-200', 'text-rose-800',
                                           'bg-amber-50', 'border-amber-200', 'text-amber-800');

    if (type === 'success') {
        question_status_alert.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
        question_alert_icon.textContent = '✅';
    } else if (type === 'error') {
        question_status_alert.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-800');
        question_alert_icon.textContent = '⚠️';
    } else {
        question_status_alert.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-800');
        question_alert_icon.textContent = 'ℹ️';
    }

    question_alert_title.textContent = title;
    question_alert_message.textContent = message;
}

/**
 * Mengambil nilai radio kunci jawaban yang sedang terpilih.
 * @returns {string} 'A' | 'B' | 'C' | 'D'
 */
function get_selected_correct_answer() {
    const selected_radio = document.querySelector('input[name="correct_answer_radio"]:checked');
    return selected_radio ? selected_radio.value : 'A';
}

/**
 * Menangani pengiriman form soal baru ke API backend.
 */
async function handle_submit_question() {
    const question_text = question_text_input.value.trim();
    const option_a = option_a_input.value.trim();
    const option_b = option_b_input.value.trim();
    const option_c = option_c_input.value.trim();
    const option_d = option_d_input.value.trim();
    const correct_answer = get_selected_correct_answer();

    // Validasi lokal sebelum kirim
    if (!question_text) {
        show_question_alert('Validasi Gagal', 'Teks pertanyaan wajib diisi.', 'error');
        question_text_input.focus();
        return;
    }

    if (!option_a || !option_b || !option_c || !option_d) {
        show_question_alert('Validasi Gagal', 'Seluruh 4 opsi (A, B, C, D) harus diisi.', 'error');
        return;
    }

    btn_save_question.disabled = true;
    btn_save_question.innerHTML = '<span>Menyimpan ke Database...</span>';

    try {
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_text,
                option_a,
                option_b,
                option_c,
                option_d,
                correct_answer
            })
        });

        const response_data = await response.json();

        if (!response.ok || !response_data.success) {
            throw new Error(response_data.message || 'Gagal menyimpan soal.');
        }

        show_question_alert('Sukses Tersimpan', 'Soal pilihan ganda berhasil ditambahkan ke bank soal.', 'success');
        reset_question_form();
        load_saved_questions();

    } catch (error) {
        show_question_alert('Terjadi Kesalahan', error.message, 'error');
    } finally {
        btn_save_question.disabled = false;
        btn_save_question.innerHTML = '<span>Simpan Soal ke Bank</span>';
    }
}

/**
 * Mengosongkan isian formulir pertanyaan.
 */
function reset_question_form() {
    question_text_input.value = '';
    option_a_input.value = '';
    option_b_input.value = '';
    option_c_input.value = '';
    option_d_input.value = '';
    const default_radio = document.querySelector('input[name="correct_answer_radio"][value="A"]');
    if (default_radio) default_radio.checked = true;
    question_text_input.focus();
}

/**
 * Mengambil dan merender daftar pertanyaan yang tersimpan di database.
 */
async function load_saved_questions() {
    try {
        const response = await fetch('/api/questions');
        const result = await response.json();

        if (!response.ok || !result.success) {
            questions_list_container.innerHTML = `<p class="text-xs text-rose-500 italic">Gagal memuat: ${result.message || 'Periksa koneksi database.'}</p>`;
            return;
        }

        const questions_list = result.data || [];
        total_questions_counter.textContent = `${questions_list.length} Soal tersedia`;

        if (questions_list.length === 0) {
            questions_list_container.innerHTML = `
                <div class="text-center py-8 text-slate-400 text-xs italic">
                    Belum ada soal tersimpan. Silakan isi form di samping untuk membuat soal pertama.
                </div>
            `;
            return;
        }

        questions_list_container.innerHTML = '';
        questions_list.forEach((item, index) => {
            const card_elem = document.createElement('div');
            card_elem.className = 'p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 transition hover:border-slate-300';

            card_elem.innerHTML = `
                <div class="flex items-start justify-between gap-2">
                    <div class="flex items-start gap-2">
                        <span class="font-black text-indigo-600 shrink-0">#${index + 1}</span>
                        <h4 class="font-bold text-slate-800 text-xs leading-snug">${escape_html(item.question_text)}</h4>
                    </div>
                    <button 
                        type="button" 
                        class="btn-delete-question text-slate-400 hover:text-rose-600 transition p-1 text-xs shrink-0" 
                        title="Hapus soal ini"
                    >
                        🗑️
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div class="px-2 py-1 rounded-md ${item.correct_answer === 'A' ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300' : 'bg-white text-slate-600 border border-slate-200'} truncate">
                        <span class="font-bold">A:</span> ${escape_html(item.option_a)}
                    </div>
                    <div class="px-2 py-1 rounded-md ${item.correct_answer === 'B' ? 'bg-blue-100 text-blue-800 font-bold border border-blue-300' : 'bg-white text-slate-600 border border-slate-200'} truncate">
                        <span class="font-bold">B:</span> ${escape_html(item.option_b)}
                    </div>
                    <div class="px-2 py-1 rounded-md ${item.correct_answer === 'C' ? 'bg-amber-100 text-amber-800 font-bold border border-amber-300' : 'bg-white text-slate-600 border border-slate-200'} truncate">
                        <span class="font-bold">C:</span> ${escape_html(item.option_c)}
                    </div>
                    <div class="px-2 py-1 rounded-md ${item.correct_answer === 'D' ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300' : 'bg-white text-slate-600 border border-slate-200'} truncate">
                        <span class="font-bold">D:</span> ${escape_html(item.option_d)}
                    </div>
                </div>

                <div class="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                    <span>Kunci: <strong class="text-indigo-600">${item.correct_answer}</strong></span>
                    <span>ID: #${item.id}</span>
                </div>
            `;

            // Handler tombol hapus soal
            const delete_btn = card_elem.querySelector('.btn-delete-question');
            delete_btn.addEventListener('click', () => {
                delete_question_by_id(item.id, item.question_text);
            });

            questions_list_container.appendChild(card_elem);
        });

    } catch (error) {
        questions_list_container.innerHTML = `<p class="text-xs text-amber-600 italic">Gagal terhubung ke database. Pastikan MySQL aktif.</p>`;
    }
}

/**
 * Menghapus soal berdasarkan ID setelah konfirmasi.
 * @param {number} question_id 
 * @param {string} question_text 
 */
async function delete_question_by_id(question_id, question_text) {
    const is_confirmed = confirm(`Apakah Anda yakin ingin menghapus soal:\n"${question_text.substring(0, 50)}..."?`);
    if (!is_confirmed) return;

    try {
        const response = await fetch(`/api/questions/${question_id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Gagal menghapus soal.');
        }

        show_question_alert('Berhasil Dihapus', 'Soal kuis telah dihapus dari bank soal.', 'success');
        load_saved_questions();
    } catch (error) {
        show_question_alert('Gagal Menghapus', error.message, 'error');
    }
}

/**
 * Escape string HTML untuk keamanan XSS.
 * @param {string} str 
 * @returns {string}
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
btn_save_question.addEventListener('click', handle_submit_question);
btn_reset_question_form.addEventListener('click', reset_question_form);
btn_refresh_questions.addEventListener('click', load_saved_questions);

// Inisialisasi awal
document.addEventListener('DOMContentLoaded', () => {
    load_saved_questions();
});
