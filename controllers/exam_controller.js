/**
 * @file exam_controller.js
 * @description Controller untuk pemrosesan pemindaian live ujian dan rekapitulasi nilai.
 */

const ExamResultModel = require('../models/exam_result_model');
const StudentModel = require('../models/student_model');
const QuestionModel = require('../models/question_model');

/**
 * Handler HTTP untuk menerima batch deteksi hasil pindai kamera live dari sisi klien.
 * Memetakan qr_token ke siswa, memvalidasi dengan kunci jawaban, dan mengupdate exam_results.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function submit_batch_answers_handler(req, res) {
    const { session_id, question_id, detected_answers } = req.body;

    if (!session_id || !question_id || !Array.isArray(detected_answers)) {
        return res.status(400).json({
            success: false,
            message: 'Parameter session_id, question_id, dan array detected_answers wajib disertakan.'
        });
    }

    try {
        // Ambil data soal untuk validasi kunci jawaban
        const question_data = await QuestionModel.find_by_id(parseInt(question_id, 10));
        if (!question_data) {
            return res.status(404).json({
                success: false,
                message: 'Soal tidak ditemukan.'
            });
        }

        const processed_results = [];

        for (const item of detected_answers) {
            const { qr_token, detected_option } = item;
            if (!qr_token || !['A', 'B', 'C', 'D'].includes(detected_option)) {
                continue;
            }

            // Cari data siswa berdasarkan token QR
            const student = await StudentModel.find_by_qr_token(qr_token);
            if (!student) {
                continue;
            }

            const is_correct = (detected_option === question_data.correct_answer);

            // Simpan jawaban siswa
            await ExamResultModel.upsert_result({
                session_id: String(session_id),
                student_id: student.id,
                question_id: question_data.id,
                student_answer: detected_option,
                is_correct: is_correct
            });

            processed_results.push({
                student_id: student.id,
                student_name: student.student_name,
                detected_option: detected_option,
                is_correct: is_correct
            });
        }

        return res.status(200).json({
            success: true,
            message: `${processed_results.length} jawaban berhasil diproses.`,
            processed_count: processed_results.length,
            data: processed_results
        });
    } catch (error) {
        console.error('[ERROR submit_batch_answers_handler]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal memproses jawaban siswa.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler HTTP untuk mendapatkan statistik langsung (live stats) dari soal yang sedang diujikan.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function get_live_stats_handler(req, res) {
    const { session_id, question_id } = req.query;

    if (!session_id || !question_id) {
        return res.status(400).json({
            success: false,
            message: 'Query parameter session_id dan question_id wajib disertakan.'
        });
    }

    try {
        const stats = await ExamResultModel.get_live_question_stats(
            String(session_id),
            parseInt(question_id, 10)
        );

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('[ERROR get_live_stats_handler]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik kuis live.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler HTTP untuk mendapatkan rekapitulasi nilai akhir sesi kuis.
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 */
async function get_session_summary_handler(req, res) {
    const { session_id } = req.params;

    if (!session_id) {
        return res.status(400).json({
            success: false,
            message: 'Parameter session_id wajib disertakan.'
        });
    }

    try {
        const summary = await ExamResultModel.get_session_summary(String(session_id));
        return res.status(200).json({
            success: true,
            total_students: summary.length,
            data: summary
        });
    } catch (error) {
        console.error('[ERROR get_session_summary_handler]:', error);
        return res.status(500).json({
            success: false,
            message: 'Gagal mengambil rekapitulasi nilai sesi.',
            error_detail: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

module.exports = {
    submit_batch_answers_handler,
    get_live_stats_handler,
    get_session_summary_handler
};
