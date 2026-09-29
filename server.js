/**
 * @file server.js
 * @description Entry point server HTTP untuk Classroom Vision Quiz (CVQ).
 */

const dotenv = require('dotenv');
dotenv.config();

const app = require('./app');
const { test_database_connection, initialize_database_schema } = require('./config/database');

const server_port = parseInt(process.env.PORT, 10) || 3000;

/**
 * Menjalankan server HTTP dan memverifikasi koneksi database MySQL.
 */
async function start_server() {
    console.log('==================================================');
    console.log('  Classroom Vision Quiz (CVQ) - Server Startup    ');
    console.log('==================================================');

    // Coba koneksi database dan inisialisasi skema jika server DB sudah berjalan
    const is_db_connected = await test_database_connection();
    if (is_db_connected) {
        await initialize_database_schema();
    } else {
        console.warn('[PERINGATAN] Server MySQL belum terdeteksi aktif.');
        console.warn('Pastikan MySQL aktif (XAMPP / MySQL Service / Docker) dan konfigurasi .env sesuai.');
    }

    app.listen(server_port, () => {
        console.log(`[SERVER] Berjalan pada port: http://localhost:${server_port}`);
        console.log(`[UI] Buka browser di http://localhost:${server_port}`);
        console.log('==================================================');
    });
}

start_server().catch((error) => {
    console.error('[FATAL SERVER ERROR]:', error);
    process.exit(1);
});
