/**
 * @file class_routes.js
 * @description Routing untuk resource kelas dan siswa.
 */

const express = require('express');
const router = express.Router();
const {
    create_class_with_students,
    get_all_classes_list,
    get_class_details,
    get_class_cards_data
} = require('../controllers/class_controller');

// Route untuk mendapatkan daftar seluruh kelas
router.get('/', get_all_classes_list);

// Route untuk membuat kelas baru dengan daftar siswa (maks 25)
router.post('/', create_class_with_students);

// Route untuk melihat detail kelas beserta daftar siswa dan token QR
router.get('/:id', get_class_details);

// Route untuk mengambil data lembar jawaban & QR code siap cetak
router.get('/:id/cards', get_class_cards_data);

module.exports = router;
