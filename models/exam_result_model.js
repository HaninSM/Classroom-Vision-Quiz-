/**
 * @file exam_result_model.js
 * @description Model untuk operasi database tabel `exam_results`.
 */

const { pool } = require('../config/database');

/**
 * Representasi model untuk tabel hasil ujian `exam_results`.
 */
class ExamResultModel {
    /**
     * Menyimpan atau memperbarui jawaban siswa pada suatu sesi dan pertanyaan (Upsert).
     * @param {Object} result_data - Data jawaban siswa
     * @param {string} result_data.session_id - ID sesi kuis
     * @param {number} result_data.student_id - ID siswa
     * @param {number} result_data.question_id - ID pertanyaan
     * @param {'A'|'B'|'C'|'D'} result_data.student_answer - Jawaban yang terdeteksi
     * @param {boolean} result_data.is_correct - Status kebenaran jawaban
     * @returns {Promise<boolean>}
     */
    static async upsert_result(result_data) {
        const query_string = `
            INSERT INTO exam_results (
                session_id, 
                student_id, 
                question_id, 
                student_answer, 
                is_correct
            )
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                student_answer = VALUES(student_answer),
                is_correct = VALUES(is_correct),
                created_at = CURRENT_TIMESTAMP
        `;

        const values = [
            result_data.session_id,
            result_data.student_id,
            result_data.question_id,
            result_data.student_answer,
            result_data.is_correct ? 1 : 0
        ];

        const [result] = await pool.execute(query_string, values);
        return result.affectedRows > 0;
    }

    /**
     * Mengambil statistik jawaban real-time untuk suatu pertanyaan pada sesi tertentu.
     * @param {string} session_id - ID sesi ujian
     * @param {number} question_id - ID pertanyaan
     * @returns {Promise<Object>} Statistik distribusi jawaban dan daftar siswa
     */
    static async get_live_question_stats(session_id, question_id) {
        const query_string = `
            SELECT 
                r.id,
                r.session_id,
                r.student_id,
                r.question_id,
                r.student_answer,
                r.is_correct,
                s.student_name,
                s.qr_token
            FROM exam_results r
            JOIN students s ON r.student_id = s.id
            WHERE r.session_id = ? AND r.question_id = ?
            ORDER BY r.created_at ASC
        `;

        const [rows] = await pool.execute(query_string, [session_id, question_id]);

        const counts = { A: 0, B: 0, C: 0, D: 0 };
        let total_correct = 0;

        rows.forEach((row) => {
            if (row.student_answer && counts[row.student_answer] !== undefined) {
                counts[row.student_answer]++;
            }
            if (row.is_correct) {
                total_correct++;
            }
        });

        return {
            total_responded: rows.length,
            total_correct: total_correct,
            distribution: counts,
            responded_students: rows
        };
    }

    /**
     * Mengambil seluruh hasil rekapitulasi ujian pada satu sesi kuis.
     * @param {string} session_id - ID sesi
     * @returns {Promise<Array<Object>>} Rekapitulasi nilai seluruh siswa
     */
    static async get_session_summary(session_id) {
        const query_string = `
            SELECT 
                s.id AS student_id,
                s.student_name,
                COUNT(r.id) AS total_answered,
                SUM(CASE WHEN r.is_correct = 1 THEN 1 ELSE 0 END) AS total_correct
            FROM students s
            JOIN exam_results r ON s.id = r.student_id
            WHERE r.session_id = ?
            GROUP BY s.id
            ORDER BY total_correct DESC, s.student_name ASC
        `;

        const [rows] = await pool.execute(query_string, [session_id]);
        return rows;
    }
}

module.exports = ExamResultModel;
