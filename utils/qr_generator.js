/**
 * @file qr_generator.js
 * @description Modul utilitas untuk menghasilkan gambar QR Code dengan level koreksi tinggi.
 */

const qrcode = require('qrcode');

/**
 * Menghasilkan QR Code dalam format Data URL (base64 image PNG).
 * @param {string} payload_text - Teks atau token yang akan di-encode ke QR
 * @param {Object} [custom_options={}] - Opsi kustom untuk library qrcode
 * @returns {Promise<string>} Base64 Data URL (data:image/png;base64,...)
 */
async function generate_qr_data_url(payload_text, custom_options = {}) {
    const default_options = {
        errorCorrectionLevel: 'H', // High error correction (~30% data recovery)
        type: 'image/png',
        quality: 1.0,
        margin: 2,
        width: 380,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    };

    const final_options = { ...default_options, ...custom_options };
    return await qrcode.toDataURL(payload_text, final_options);
}

/**
 * Menghasilkan QR Code dalam format string vektor SVG.
 * @param {string} payload_text - Teks atau token yang akan di-encode ke QR
 * @param {Object} [custom_options={}] - Opsi kustom
 * @returns {Promise<string>} String XML SVG
 */
async function generate_qr_svg(payload_text, custom_options = {}) {
    const default_options = {
        errorCorrectionLevel: 'H',
        type: 'svg',
        margin: 2,
        width: 380,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    };

    const final_options = { ...default_options, ...custom_options };
    return await qrcode.toString(payload_text, final_options);
}

module.exports = {
    generate_qr_data_url,
    generate_qr_svg
};
