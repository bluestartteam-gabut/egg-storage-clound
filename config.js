// Gunakan dotenv untuk memuat variabel dari file .env
require('dotenv').config();

module.exports = {
    // Konfigurasi Bot Telegram
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "8116885614:AAE_2CTdh6TgS9Cp3m1NICkOby26y3fG3Lk",

    // Konfigurasi Server Web
    WEB_PORT: process.env.SERVER_PORT || process.env.PORT, // ambil otomatis
    STORAGE_ROOT_DIR: "storage",
    
    // Konfigurasi Pterodactyl API (Harus diisi untuk integrasi nyata)
    PTERODACTYL_API_URL: process.env.PTERODACTYL_API_URL || "https://panel-private.ikhsansmp.fun",
    PTERODACTYL_API_KEY: process.env.PTERODACTYL_API_KEY || "ptla_QcwEMv6Zjq1JQd5KrIBslCYKoTWAUorb3cKXF2iuuBh",
    PTERODACTYL_SERVER_ID: process.env.PTERODACTYL_SERVER_ID || "34"
};
