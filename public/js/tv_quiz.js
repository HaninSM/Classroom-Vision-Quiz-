/**
 * @file tv_quiz.js
 * @description Skrip kontrol presentasi kuis untuk layar TV dan proyektor kelas.
 */

// State Presentasi
let questions_list = [];
let current_question_index = 0;
let is_answer_revealed = false;
let current_class_id = null;

// Elemen DOM
const active_class_badge = document.getElementById('active_class_badge');
const question_counter_badge = document.getElementById('question_counter_badge');
const tv_loading_box = document.getElementById('tv_loading_box');
const tv_empty_box = document.getElementById('tv_empty_box');
const tv_question_content = document.getElementById('tv_question_content');
const tv_question_text = document.getElementById('tv_question_text');

// Kartu Opsi
const card_option_a = document.getElementById('card_option_a');
const card_option_b = document.getElementById('card_option_b');
const card_option_c = document.getElementById('card_option_c');
const card_option_d = document.getElementById('card_option_d');
const tv_option_a_text = document.getElementById('tv_option_a_text');
const tv_option_b_text = document.getElementById('tv_option_b_text');
const tv_option_c_text = document.getElementById('tv_option_c_text');
const tv_option_d_text = document.getElementById('tv_option_d_text');

// Tombol Kontrol
const tv_select_class = document.getElementById('tv_select_class');
const btn_prev_question = document.getElementById('btn_prev_question');
const btn_next_question = document.getElementById('btn_next_question');
const btn_toggle_answer = document.getElementById('btn_toggle_answer');
const btn_fullscreen_toggle = document.getElementById('btn_fullscreen_toggle');
const btn_launch_scanner = document.getElementById('btn_launch_scanner');

/**
 * Mengambil seluruh daftar kelas untuk pengisian dropdown kelas di footer presentasi.
 */
async function load_classes_selection() {
    try {
        const response = await fetch('/api/classes');
        const result = await response.json();

        if (response.ok && result.success && Array.isArray(result.data)) {
            tv_select_class.innerHTML = '<option value="">-- Pilih Kelas Aktif --</option>';
            result.data.forEach((class_item, index) => {
                const opt = document.createElement('option');
                opt.value = class_item.id;
                opt.textContent = `${class_item.class_name} (${class_item.total_students || 0} Siswa)`;
                if (index === 0) {
                    opt.selected = true;
                    current_class_id = class_item.id;
                    active_class_badge.textContent = `KELAS: ${class_item.class_name.toUpperCase()}`;
                }
                tv_select_class.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('[ERROR load_classes_selection]:', error);
    }
}

/**
 * Mengambil daftar soal kuis dari server API.
 */
async function fetch_quiz_questions() {
    tv_loading_box.classList.remove('hidden');
    tv_empty_box.classList.add('hidden');
    tv_question_content.classList.add('hidden');

    try {
        const response = await fetch('/api/questions');
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Gagal memuat soal kuis.');
        }

        questions_list = result.data || [];

        if (questions_list.length === 0) {
            tv_loading_box.classList.add('hidden');
            tv_empty_box.classList.remove('hidden');
            question_counter_badge.textContent = 'SOAL 0 DARI 0';
            return;
        }

        tv_loading_box.classList.add('hidden');
        tv_question_content.classList.remove('hidden');
        current_question_index = 0;
        render_active_question();

    } catch (error) {
        tv_loading_box.innerHTML = `
            <div class="p-6 bg-rose-950/40 border border-rose-800 rounded-2xl text-rose-300 max-w-md mx-auto">
                <p class="font-bold">Gagal Memuat Kuis</p>
                <p class="text-xs mt-1">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Merender soal yang sedang aktif ke tampilan layar besar proyektor.
 */
function render_active_question() {
    if (!questions_list || questions_list.length === 0) return;

    const current_q = questions_list[current_question_index];
    is_answer_revealed = false;

    // Reset highlight kunci jawaban
    reset_options_highlight();
    btn_toggle_answer.textContent = '👁️ Tampilkan Kunci Jawaban';
    btn_toggle_answer.classList.remove('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/40');
    btn_toggle_answer.classList.add('bg-amber-500/20', 'text-amber-300', 'border-amber-500/40');

    // Update Counter
    question_counter_badge.textContent = `SOAL ${current_question_index + 1} DARI ${questions_list.length}`;

    // Update Teks Pertanyaan & Opsi
    tv_question_text.textContent = current_q.question_text;
    tv_option_a_text.textContent = current_q.option_a;
    tv_option_b_text.textContent = current_q.option_b;
    tv_option_c_text.textContent = current_q.option_c;
    tv_option_d_text.textContent = current_q.option_d;

    // Update Tombol Navigasi
    btn_prev_question.disabled = current_question_index === 0;
    btn_next_question.disabled = current_question_index === questions_list.length - 1;
}

/**
 * Mengatur highlight kartu jawaban benar / menyembunyikannya.
 */
function toggle_correct_answer_reveal() {
    if (!questions_list || questions_list.length === 0) return;

    const current_q = questions_list[current_question_index];
    const correct_key = current_q.correct_answer;

    is_answer_revealed = !is_answer_revealed;

    if (is_answer_revealed) {
        btn_toggle_answer.textContent = '🙈 Sembunyikan Kunci Jawaban';
        btn_toggle_answer.classList.remove('bg-amber-500/20', 'text-amber-300', 'border-amber-500/40');
        btn_toggle_answer.classList.add('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/40');

        // Beri efek highlight border tebal hijau pada opsi yang benar
        if (correct_key === 'A') card_option_a.classList.add('option-card-correct');
        if (correct_key === 'B') card_option_b.classList.add('option-card-correct');
        if (correct_key === 'C') card_option_c.classList.add('option-card-correct');
        if (correct_key === 'D') card_option_d.classList.add('option-card-correct');
    } else {
        btn_toggle_answer.textContent = '👁️ Tampilkan Kunci Jawaban';
        btn_toggle_answer.classList.remove('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/40');
        btn_toggle_answer.classList.add('bg-amber-500/20', 'text-amber-300', 'border-amber-500/40');
        reset_options_highlight();
    }
}

/**
 * Menghapus highlight border dari semua opsi kartu.
 */
function reset_options_highlight() {
    card_option_a.classList.remove('option-card-correct');
    card_option_b.classList.remove('option-card-correct');
    card_option_c.classList.remove('option-card-correct');
    card_option_d.classList.remove('option-card-correct');
}

/**
 * Pindah ke soal berikutnya.
 */
function go_to_next_question() {
    if (current_question_index < questions_list.length - 1) {
        current_question_index++;
        render_active_question();
    }
}

/**
 * Pindah ke soal sebelumnya.
 */
function go_to_prev_question() {
    if (current_question_index > 0) {
        current_question_index--;
        render_active_question();
    }
}

/**
 * Toggle mode layar penuh (Fullscreen).
 */
function toggle_fullscreen_mode() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.warn('Gagal masuk mode layar penuh:', err.message);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Event Listeners Navigasi
btn_next_question.addEventListener('click', go_to_next_question);
btn_prev_question.addEventListener('click', go_to_prev_question);
btn_toggle_answer.addEventListener('click', toggle_correct_answer_reveal);
btn_fullscreen_toggle.addEventListener('click', toggle_fullscreen_mode);

tv_select_class.addEventListener('change', (e) => {
    const selected_id = e.target.value;
    const selected_text = e.target.options[e.target.selectedIndex]?.text || '';
    if (selected_id) {
        current_class_id = selected_id;
        active_class_badge.textContent = `KELAS: ${selected_text.toUpperCase()}`;
    }
});

btn_launch_scanner.addEventListener('click', () => {
    window.open('/scanner.html', '_blank');
});

// Shortcut Keyboard untuk Presenter (Remote Clicker)
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        go_to_next_question();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        go_to_prev_question();
    } else if (e.key === ' ' || e.key === 'Enter') {
        // Spasi untuk membuka/menutup kunci jawaban
        toggle_correct_answer_reveal();
    }
});

// Inisialisasi awal
document.addEventListener('DOMContentLoaded', async () => {
    await load_classes_selection();
    await fetch_quiz_questions();
});
