/**
 * @file exam_routes.js
 * @description Routing untuk resource sesi ujian dan pemrosesan hasil pemindaian live.
 */

const express = require('express');
const router = express.Router();
const {
    submit_batch_answers_handler,
    get_live_stats_handler,
    get_session_summary_handler
} = require('../controllers/exam_controller');

// Mengirim batch jawaban yang terdeteksi dari kamera
router.post('/submit-answers', submit_batch_answers_handler);

// Mengambil statistik langsung per pertanyaan (distribusi A, B, C, D)
router.get('/live-stats', get_live_stats_handler);

// Mengambil ringkasan nilai per sesi
router.get('/summary/:session_id', get_session_summary_handler);

module.exports = router;
