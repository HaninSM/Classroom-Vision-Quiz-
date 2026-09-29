/**
 * @file question_controller.js
 * @description Controller untuk mengelola bank soal kuis (CRUD pertanyaan & opsi).
 */

const QuestionModel = require('../models/question_model');

/**
 * Handler HTTP untuk membuat soal pilihan ganda baru.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function create_question_handler(req, res) {
    const { question_text, option_a, option_b, option_c, option_d, correct_answer, teacher_id } = req.body;

    // 1. Validasi teks soal
    if (!question_text || typeof question_text !== 'string' || question_text.trim() === '') {
        return res.status(400).json({
            success: false,
            message: 'Teks pertanyaan wajib diisi dan tidak boleh kosong.'
        });
    }

    // 2. Validasi 4 opsi pilihan
    if (!option_a || !option_b || !option_c || !option_d) {
        return res.status(400).json({
            success: false,
            message: 'Seluruh opsi jawaban (A, B, C, dan D) wajib diisi.'
        });
    }

    // 3. Validasi kunci jawaban
    const normalized_correct_answer = String(correct_answer || '').toUpperCase().trim();
    const valid_keys = ['A', 'B', 'C', 'D'];
    if (!valid_keys.includes(normalized_correct_answer)) {
        return res.status(400).json({
            success: false,
            message: 'Kunci jawaban harus berupa salah satu dari A, B, C, atau D.'
        });
    }

    try {
        const question_id = await QuestionModel.create_question({
            teacher_id: teacher_id || null,
            question_text: question_text.trim(),
            option_a: String(option_a).trim(),
            option_b: String(option_b).trim(),
            option_c: String(option_c).trim(),
            option_d: String(option_d).trim(),
            correct_answer: normalized_correct_answer
        });

        return res.status(201).json({
            success: true,
            message: 'Soal kuis berhasil ditambahkan.',
            data: {
                id: question_id,
                question_text: question_text.trim(),
                option_a: String(option_a).trim(),
                option_b: String(option_b).trim(),
                option_c: String(option_c).trim(),
                option_d: String(option_d).trim(),
                correct_answer: normalized_correct_answer
            }
        });
    } catch (error) {
        console.error('[ERROR create_question_handler]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal menambahkan soal kuis.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler HTTP untuk mendapatkan semua daftar soal kuis.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function get_all_questions_handler(req, res) {
    try {
        const questions_list = await QuestionModel.get_all_questions();
        return res.status(200).json({
            success: true,
            total: questions_list.length,
            data: questions_list
        });
    } catch (error) {
        console.error('[ERROR get_all_questions_handler]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil daftar soal kuis.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler HTTP untuk mendapatkan detail soal kuis berdasarkan ID.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function get_question_by_id_handler(req, res) {
    const { id } = req.params;
    const question_id = parseInt(id, 10);

    if (isNaN(question_id)) {
        return res.status(400).json({
            success: false,
            message: 'ID soal harus berupa angka yang valid.'
        });
    }

    try {
        const question_data = await QuestionModel.find_by_id(question_id);
        if (!question_data) {
            return res.status(404).json({
                success: false,
                message: 'Soal kuis tidak ditemukan.'
            });
        }

        return res.status(200).json({
            success: true,
            data: question_data
        });
    } catch (error) {
        console.error('[ERROR get_question_by_id_handler]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil detail soal kuis.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler HTTP untuk menghapus soal kuis berdasarkan ID.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function delete_question_handler(req, res) {
    const { id } = req.params;
    const question_id = parseInt(id, 10);

    if (isNaN(question_id)) {
        return res.status(400).json({
            success: false,
            message: 'ID soal harus berupa angka yang valid.'
        });
    }

    try {
        const is_deleted = await QuestionModel.delete_by_id(question_id);
        if (!is_deleted) {
            return res.status(404).json({
                success: false,
                message: 'Soal kuis tidak ditemukan atau sudah dihapus.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Soal kuis berhasil dihapus.'
        });
    } catch (error) {
        console.error('[ERROR delete_question_handler]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal menghapus soal kuis.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    create_question_handler,
    get_all_questions_handler,
    get_question_by_id_handler,
    delete_question_handler
};
