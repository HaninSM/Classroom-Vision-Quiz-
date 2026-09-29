/**
 * @file question_model.js
 * @description Model untuk operasi database tabel `questions`.
 */

const { pool } = require('../config/database');

/**
 * Representasi model untuk tabel pertanyaan kuis `questions`.
 */
class QuestionModel {
    /**
     * Menyimpan soal kuis baru ke database.
     * @param {Object} question_data - Data soal pilihan ganda
     * @param {string} question_data.question_text - Teks pertanyaan
     * @param {string} question_data.option_a - Pilihan A
     * @param {string} question_data.option_b - Pilihan B
     * @param {string} question_data.option_c - Pilihan C
     * @param {string} question_data.option_d - Pilihan D
     * @param {'A'|'B'|'C'|'D'} question_data.correct_answer - Kunci jawaban
     * @param {number|null} [question_data.teacher_id=null] - ID guru pembuat soal
     * @returns {Promise<number>} ID soal yang baru dibuat
     */
    static async create_question(question_data) {
        const query_string = `
            INSERT INTO questions (
                teacher_id, 
                question_text, 
                option_a, 
                option_b, 
                option_c, 
                option_d, 
                correct_answer
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            question_data.teacher_id || null,
            question_data.question_text,
            question_data.option_a,
            question_data.option_b,
            question_data.option_c,
            question_data.option_d,
            question_data.correct_answer
        ];
        const [result] = await pool.execute(query_string, values);
        return result.insertId;
    }

    /**
     * Mengambil seluruh daftar soal yang tersimpan di sistem.
     * @returns {Promise<Array<Object>>} Daftar soal kuis
     */
    static async get_all_questions() {
        const query_string = `
            SELECT 
                id, 
                teacher_id, 
                question_text, 
                option_a, 
                option_b, 
                option_c, 
                option_d, 
                correct_answer, 
                created_at
            FROM questions
            ORDER BY id ASC
        `;
        const [rows] = await pool.execute(query_string);
        return rows;
    }

    /**
     * Mengambil satu soal berdasarkan ID.
     * @param {number} question_id - ID soal
     * @returns {Promise<Object|null>} Data soal atau null
     */
    static async find_by_id(question_id) {
        const query_string = `
            SELECT 
                id, 
                teacher_id, 
                question_text, 
                option_a, 
                option_b, 
                option_c, 
                option_d, 
                correct_answer, 
                created_at
            FROM questions
            WHERE id = ?
        `;
        const [rows] = await pool.execute(query_string, [question_id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Menghapus soal berdasarkan ID.
     * @param {number} question_id - ID soal
     * @returns {Promise<boolean>} Status berhasil/gagal
     */
    static async delete_by_id(question_id) {
        const query_string = `DELETE FROM questions WHERE id = ?`;
        const [result] = await pool.execute(query_string, [question_id]);
        return result.affectedRows > 0;
    }
}

module.exports = QuestionModel;
