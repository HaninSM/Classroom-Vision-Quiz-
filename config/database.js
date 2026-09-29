/**
 * @file database.js
 * @description Modul manajemen koneksi pool MySQL menggunakan mysql2/promise.
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Konfigurasi koneksi database MySQL dari environment variables.
 */
const db_config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cvq_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
};

/**
 * Instance pool koneksi MySQL
 */
const pool = mysql.createPool(db_config);

/**
 * Memeriksa apakah koneksi ke database berhasil.
 * @returns {Promise<boolean>} Status koneksi
 */
async function test_database_connection() {
    try {
        // 1. Coba koneksi ke server MySQL (tanpa nama database) untuk auto-create DB jika belum ada
        const root_connection = await mysql.createConnection({
            host: db_config.host,
            port: db_config.port,
            user: db_config.user,
            password: db_config.password
        });

        await root_connection.query(`CREATE DATABASE IF NOT EXISTS \`${db_config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await root_connection.end();

        // 2. Sekarang coba koneksi ke pool database
        const connection = await pool.getConnection();
        console.log('[DATABASE] Berhasil terhubung ke database MySQL:', db_config.database);
        connection.release();
        return true;
    } catch (error) {
        console.error('[DATABASE ERROR] Gagal terhubung ke database:', error.message);
        return false;
    }
}

/**
 * Menjalankan inisialisasi tabel skema secara otomatis jika belum ada.
 * @returns {Promise<void>}
 */
async function initialize_database_schema() {
    try {

        // Jalankan DDL tabel
        await pool.query(`
            CREATE TABLE IF NOT EXISTS teachers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS classes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                teacher_id INT NULL,
                class_name VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) 
                    REFERENCES teachers(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                class_id INT NOT NULL,
                student_name VARCHAR(100) NOT NULL,
                qr_token VARCHAR(64) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_students_class FOREIGN KEY (class_id) 
                    REFERENCES classes(id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_students_token (qr_token)
            ) ENGINE=InnoDB;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                teacher_id INT NULL,
                question_text TEXT NOT NULL,
                option_a VARCHAR(255) NOT NULL,
                option_b VARCHAR(255) NOT NULL,
                option_c VARCHAR(255) NOT NULL,
                option_d VARCHAR(255) NOT NULL,
                correct_answer ENUM('A', 'B', 'C', 'D') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_questions_teacher FOREIGN KEY (teacher_id) 
                    REFERENCES teachers(id) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS exam_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(64) NOT NULL,
                student_id INT NOT NULL,
                question_id INT NOT NULL,
                student_answer ENUM('A', 'B', 'C', 'D') NULL,
                is_correct TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_results_student FOREIGN KEY (student_id) 
                    REFERENCES students(id) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_results_question FOREIGN KEY (question_id) 
                    REFERENCES questions(id) ON DELETE CASCADE ON UPDATE CASCADE,
                UNIQUE KEY uq_session_student_question (session_id, student_id, question_id)
            ) ENGINE=InnoDB;
        `);

        console.log('[DATABASE] Skema tabel telah diverifikasi/diinisialisasi.');
    } catch (error) {
        console.warn('[DATABASE WARNING] Inisialisasi otomatis gagal (pastikan server MySQL aktif):', error.message);
    }
}

module.exports = {
    pool,
    test_database_connection,
    initialize_database_schema
};
