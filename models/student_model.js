/**
 * @file student_model.js
 * @description Model untuk entitas siswa pada tabel `students`.
 */

const { pool } = require('../config/database');

/**
 * Representasi siswa untuk operasi database tabel `students`.
 */
class StudentModel {
    /**
     * Menyimpan daftar siswa secara massal (bulk insert) untuk satu kelas.
     * @param {number} class_id - ID kelas
     * @param {Array<{ student_name: string, qr_token: string }>} student_list - Daftar objek siswa
     * @param {import('mysql2/promise').Connection} [custom_connection=null] - Koneksi transaksi opsional
     * @returns {Promise<Array<Object>>} Daftar siswa yang berhasil disimpan
     */
    static async create_batch_students(class_id, student_list, custom_connection = null) {
        if (!student_list || student_list.length === 0) {
            return [];
        }

        const executor = custom_connection || pool;
        const query_string = `
            INSERT INTO students (class_id, student_name, qr_token)
            VALUES ?
        `;

        const values = student_list.map((student_item) => [
            class_id,
            student_item.student_name,
            student_item.qr_token
        ]);

        const [result] = await executor.query(query_string, [values]);

        // Mengembalikan data siswa yang di-insert
        return student_list.map((student_item, index) => ({
            id: result.insertId + index,
            class_id: class_id,
            student_name: student_item.student_name,
            qr_token: student_item.qr_token
        }));
    }

    /**
     * Mengambil seluruh siswa berdasarkan ID kelas.
     * @param {number} class_id - ID kelas yang ingin diambil siswanya
     * @returns {Promise<Array<Object>>} Daftar siswa
     */
    static async get_by_class_id(class_id) {
        const query_string = `
            SELECT id, class_id, student_name, qr_token, created_at
            FROM students
            WHERE class_id = ?
            ORDER BY id ASC
        `;
        const [rows] = await pool.execute(query_string, [class_id]);
        return rows;
    }

    /**
     * Mencari siswa berdasarkan token QR unik.
     * @param {string} qr_token - Token unik QR siswa
     * @returns {Promise<Object|null>} Data siswa atau null jika tidak ditemukan
     */
    static async find_by_qr_token(qr_token) {
        const query_string = `
            SELECT s.id, s.class_id, s.student_name, s.qr_token, c.class_name
            FROM students s
            JOIN classes c ON s.class_id = c.id
            WHERE s.qr_token = ?
        `;
        const [rows] = await pool.execute(query_string, [qr_token]);
        return rows.length > 0 ? rows[0] : null;
    }
}

module.exports = StudentModel;
