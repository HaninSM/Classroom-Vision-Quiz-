/**
 * @file question_routes.js
 * @description Routing untuk resource bank soal kuis (questions).
 */

const express = require('express');
const router = express.Router();
const {
    create_question_handler,
    get_all_questions_handler,
    get_question_by_id_handler,
    delete_question_handler
} = require('../controllers/question_controller');

// Mengambil semua soal kuis
router.get('/', get_all_questions_handler);

// Menambahkan soal baru
router.post('/', create_question_handler);

// Mengambil detail satu soal
router.get('/:id', get_question_by_id_handler);

// Menghapus soal
router.delete('/:id', delete_question_handler);

module.exports = router;
