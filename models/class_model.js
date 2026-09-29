/**
 * @file class_model.js
 * @description Model untuk entitas kelas pada tabel `classes`.
 */

const { pool } = require('../config/database');

/**
 * Representasi kelas untuk operasi database tabel `classes`.
 */
class ClassModel {
    /**
     * Membuat data kelas baru.
     * @param {Object} class_data - Data kelas yang akan dibuat
     * @param {string} class_data.class_name - Nama kelas
     * @param {number|null} [class_data.teacher_id=null] - ID guru pembuat kelas
     * @param {import('mysql2/promise').Connection} [custom_connection=null] - Koneksi transaksi opsional
     * @returns {Promise<number>} ID kelas yang baru dibuat
     */
    static async create_class(class_data, custom_connection = null) {
        const executor = custom_connection || pool;
        const query_string = `
            INSERT INTO classes (class_name, teacher_id)
            VALUES (?, ?)
        `;
        const values = [class_data.class_name, class_data.teacher_id || null];
        const [result] = await executor.execute(query_string, values);
        return result.insertId;
    }

    /**
     * Mengambil detail kelas berdasarkan ID kelas.
     * @param {number} class_id - ID kelas yang dicari
     * @returns {Promise<Object|null>} Data kelas atau null jika tidak ditemukan
     */
    static async find_by_id(class_id) {
        const query_string = `
            SELECT id, teacher_id, class_name, created_at
            FROM classes
            WHERE id = ?
        `;
        const [rows] = await pool.execute(query_string, [class_id]);
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Mengambil semua daftar kelas beserta jumlah siswa di dalamnya.
     * @returns {Promise<Array<Object>>} Daftar kelas
     */
    static async get_all_classes() {
        const query_string = `
            SELECT 
                c.id, 
                c.class_name, 
                c.teacher_id, 
                c.created_at,
                COUNT(s.id) AS total_students
            FROM classes c
            LEFT JOIN students s ON c.id = s.class_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `;
        const [rows] = await pool.execute(query_string);
        return rows;
    }

    /**
     * Menghapus kelas berdasarkan ID (relasi siswa akan otomatis terhapus karena ON DELETE CASCADE).
     * @param {number} class_id - ID kelas yang akan dihapus
     * @returns {Promise<boolean>} Status keberhasilan penghapusan
     */
    static async delete_by_id(class_id) {
        const query_string = `DELETE FROM classes WHERE id = ?`;
        const [result] = await pool.execute(query_string, [class_id]);
        return result.affectedRows > 0;
    }
}

module.exports = ClassModel;
