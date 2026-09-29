/**
 * @file api_routes.js
 * @description Agregator seluruh route API untuk sistem CVQ.
 */

const express = require('express');
const router = express.Router();
const class_routes = require('./class_routes');
const question_routes = require('./question_routes');
const exam_routes = require('./exam_routes');

// Mount route resources
router.use('/classes', class_routes);
router.use('/questions', question_routes);
router.use('/exam', exam_routes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'UP',
        service: 'Classroom Vision Quiz (CVQ) API',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
