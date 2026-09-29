/**
 * @file app.js
 * @description Konfigurasi aplikasi Express dan middleware.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const api_routes = require('./routes/api_routes');

const app = express();

// Middleware keamanan dan parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan aset statis frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Mount route API
app.use('/api', api_routes);

// Middleware penanganan route yang tidak ditemukan (404)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({
            success: false,
            message: `Endpoint API '${req.method} ${req.originalUrl}' tidak ditemukan.`
        });
    }
    // Jika bukan API, arahkan ke index.html
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware penanganan error global
app.use((err, req, res, next) => {
    console.error('[UNHANDLED ERROR]:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Terjadi kesalahan internal pada server.',
        error_detail: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;
