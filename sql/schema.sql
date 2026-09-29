-- Skrip Inisialisasi Database Classroom Vision Quiz (CVQ)
CREATE DATABASE IF NOT EXISTS cvq_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cvq_db;

-- 1. Tabel Guru / Pengajar
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabel Kelas
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NULL,
    class_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) 
        REFERENCES teachers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

-- 3. Tabel Siswa (Maksimal 25 per kelas di level validasi aplikasi)
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

-- 4. Tabel Soal Kuis
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

-- 5. Tabel Hasil Ujian Siswa
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
    INDEX idx_session_student (session_id, student_id)
) ENGINE=InnoDB;
