/**
 * @file class_controller.js
 * @description Controller untuk mengelola input kelas dan pendaftaran nama siswa.
 */

const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const { generate_qr_data_url } = require('../utils/qr_generator');
const ClassModel = require('../models/class_model');
const StudentModel = require('../models/student_model');

/**
 * Batas maksimum jumlah siswa per kelas sesuai spesifikasi sistem CVQ.
 */
const MAX_STUDENTS_PER_CLASS = 25;

/**
 * Menghasilkan token unik yang ramah QR code untuk setiap siswa.
 * Format: qr_xxxxxxxxxxxx (16 karakter hex unik)
 * @returns {string} Token unik QR
 */
function generate_qr_token() {
    const raw_uuid = uuidv4().replace(/-/g, '');
    return `qr_${raw_uuid.substring(0, 16)}`;
}

/**
 * Handler HTTP untuk membuat kelas baru beserta daftar siswanya (maksimal 25 siswa).
 * Menggunakan transaksi MySQL untuk menjamin integritas data (ACID).
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function create_class_with_students(req, res) {
    const { class_name, teacher_id, students } = req.body;

    // 1. Validasi nama kelas
    if (!class_name || typeof class_name !== 'string' || class_name.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Nama kelas wajib diisi dan tidak boleh kosong.'
        });
    }

    // 2. Validasi array siswa
    if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Daftar siswa wajib berupa array dan minimal berisi 1 siswa.'
        });
    }

    // 3. Validasi batasan maksimal 25 murid sesuai spesifikasi
    if (students.length > MAX_STUDENTS_PER_CLASS) {
        return res.status(400).json({
            success: false,
            message: `Jumlah siswa melebihi batas maksimal (${MAX_STUDENTS_PER_CLASS} orang per kelas).`
        });
    }

    // 4. Validasi nama setiap siswa
    const cleaned_students = [];
    for (let i = 0; i < students.length; i++) {
        const student_item = students[i];
        const student_name = typeof student_item === 'string' 
            ? student_item.trim() 
            : (student_item?.name ? String(student_item.name).trim() : '');

        if (!student_name) {
            return res.status(400).json({
                success: false,
                message: `Nama siswa pada baris ke-${i + 1} tidak boleh kosong.`
            });
        }

        cleaned_students.push({
            student_name: student_name,
            qr_token: generate_qr_token()
        });
    }

    // 5. Eksekusi database menggunakan transaksi
    let db_connection = null;
    try {
        db_connection = await pool.getConnection();
        await db_connection.beginTransaction();

        // Simpan data kelas
        const class_id = await ClassModel.create_class({
            class_name: class_name.trim(),
            teacher_id: teacher_id || null
        }, db_connection);

        // Simpan data seluruh siswa
        const saved_students = await StudentModel.create_batch_students(
            class_id,
            cleaned_students,
            db_connection
        );

        // Commit transaksi jika seluruh query sukses
        await db_connection.commit();

        return res.status(201).json({
            success: true,
            message: 'Kelas dan daftar siswa berhasil dibuat.',
            data: {
                class_id: class_id,
                class_name: class_name.trim(),
                total_students: saved_students.length,
                students: saved_students
            }
        });
    } catch (error) {
        // Rollback transaksi jika terjadi kesalahan
        if (db_connection) {
            await db_connection.rollback();
        }
        console.error('[ERROR create_class_with_students]:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan pada server saat membuat kelas.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (db_connection) {
            db_connection.release();
        }
    }
}

/**
 * Handler HTTP untuk mendapatkan semua daftar kelas.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function get_all_classes_list(req, res) {
    try {
        const class_list = await ClassModel.get_all_classes();
        return res.status(200).json({
            success: true,
            data: class_list
        });
    } catch (error) {
        console.error('[ERROR get_all_classes_list]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data kelas.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler HTTP untuk mendapatkan detail kelas beserta daftar siswanya.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function get_class_details(req, res) {
    const { id } = req.params;
    const class_id = parseInt(id, 10);

    if (isNaN(class_id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kelas harus berupa angka yang valid.'
        });
    }

    try {
        const class_data = await ClassModel.find_by_id(class_id);
        if (!class_data) {
            return res.status(404).json({
                success: false,
                message: 'Kelas tidak ditemukan.'
            });
        }

        const student_list = await StudentModel.get_by_class_id(class_id);

        return res.status(200).json({
            success: true,
            data: {
                ...class_data,
                total_students: student_list.length,
                students: student_list
            }
        });
    } catch (error) {
        console.error('[ERROR get_class_details]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail kelas.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler HTTP untuk mendapatkan data kartu fisik beserta QR Code image untuk setiap siswa.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function get_class_cards_data(req, res) {
    const { id } = req.params;
    const class_id = parseInt(id, 10);

    if (isNaN(class_id)) {
        return res.status(400).json({
            success: false,
            message: 'ID kelas harus berupa angka yang valid.'
        });
    }

    try {
        const class_data = await ClassModel.find_by_id(class_id);
        if (!class_data) {
            return res.status(404).json({
                success: false,
                message: 'Kelas tidak ditemukan.'
            });
        }

        const student_list = await StudentModel.get_by_class_id(class_id);

        // Generate QR code data URL untuk setiap siswa
        const students_with_qr = await Promise.all(
            student_list.map(async (student_item, index) => {
                const qr_image_url = await generate_qr_data_url(student_item.qr_token, {
                    width: 320,
                    margin: 1
                });
                return {
                    ...student_item,
                    student_number: index + 1,
                    qr_image_data_url: qr_image_url
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: {
                class_id: class_data.id,
                class_name: class_data.class_name,
                total_students: students_with_qr.length,
                students: students_with_qr
            }
        });
    } catch (error) {
        console.error('[ERROR get_class_cards_data]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil data kartu kelas.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    create_class_with_students,
    get_all_classes_list,
    get_class_details,
    get_class_cards_data
};
