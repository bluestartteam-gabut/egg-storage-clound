const express = require('express');
const { Telegraf } = require('telegraf');
const fs = require('fs/promises');
const fsExtra = require('fs-extra');
const path = require('path');
const config = require('./config');
const axios = require('axios'); 

const app = express();
const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(config.STORAGE_ROOT_DIR));

fsExtra.ensureDirSync(config.STORAGE_ROOT_DIR);

const getStoragePath = (penyimpananName) => path.join(config.STORAGE_ROOT_DIR, penyimpananName);

// --- Rute Web API ---

app.get('/api/folders', async (req, res) => {
    try {
        const items = await fs.readdir(config.STORAGE_ROOT_DIR);
        const folders = [];
        for (const item of items) {
            if ((await fs.stat(path.join(config.STORAGE_ROOT_DIR, item))).isDirectory()) {
                folders.push(item);
            }
        }
        res.json({ folders });
    } catch (error) {
        console.error("ERROR API /api/folders:", error);
        res.status(500).json({ error: 'Gagal memuat folder.' });
    }
});

app.get('/api/files/:penyimpananName', async (req, res) => {
    const { penyimpananName } = req.params;
    const folderPath = getStoragePath(penyimpananName);

    if (!fsExtra.existsSync(folderPath)) {
        return res.status(404).json({ error: 'Penyimpanan tidak ditemukan.' });
    }

    try {
        const files = await fs.readdir(folderPath);
        const fileList = files.filter(f => fsExtra.statSync(path.join(folderPath, f)).isFile());
        
        res.json({
            penyimpanan: penyimpananName,
            files: fileList.map(file => ({
                name: file,
                downloadUrl: `/storage/${penyimpananName}/${encodeURIComponent(file)}`
            }))
        });
    } catch (error) {
        console.error("ERROR API /api/files:", error);
        res.status(500).json({ error: 'Gagal memuat file.' });
    }
});


// --- Pterodactyl Utility ---

async function pterodactylApiUpload(filePath, remoteFolder) {
    // 🚨 Bagian ini perlu diimplementasikan menggunakan API Pterodactyl (Client API) 
    // untuk mengunggah file ke server Anda. 
    // Untuk kerangka, diasumsikan selalu SUKSES.
    console.log(`[Pterodactyl] Mencoba mengunggah ${filePath} ke folder: ${remoteFolder}`);
    return true; 
}


// --- HANDLER PERINTAH TELEGRAM ---

bot.start(async (ctx) => {
    try {
        await ctx.reply("bot SV hall penting by ikhsan sudah online yaa");
    } catch (error) {
        console.error("ERROR di /start:", error);
    }
});

bot.command('cpenyimpanan', async (ctx) => {
    try {
        const args = ctx.message.text.split(/\s+/).slice(1);
        if (args.length === 0) {
            return ctx.reply("Penggunaan: /cpenyimpanan <nama_penyimpanan>");
        }

        const penyimpananName = args[0].toLowerCase();
        const folderPath = getStoragePath(penyimpananName);

        if (fsExtra.existsSync(folderPath)) {
            return ctx.reply(`Penyimpanan '${penyimpananName}' sudah ada.`);
        }
        await fs.mkdir(folderPath);
        ctx.reply(`Penyimpanan '${penyimpananName}' berhasil dibuat!`);

    } catch (error) {
        console.error("ERROR di /cpenyimpanan:", error); 
        ctx.reply("Maaf ada yg error tolong hubungi owner"); 
    }
});

bot.command('listsv', async (ctx) => {
    try {
        const args = ctx.message.text.split(/\s+/).slice(1);
        if (args.length === 0) {
            return ctx.reply("Penggunaan: /listsv <nama_penyimpanan>");
        }
        
        const penyimpananName = args[0].toLowerCase();
        const folderPath = getStoragePath(penyimpananName);

        if (!fsExtra.existsSync(folderPath)) {
            return ctx.reply(`Penyimpanan '${penyimpananName}' tidak ditemukan.`);
        }

        const files = await fs.readdir(folderPath);
        let response = `📂 File di '${penyimpananName}':\n`;
        response += files.length > 0 ? files.map(f => `- ${f}`).join('\n') : "Kosong.";
        
        ctx.reply(response);
    } catch (error) {
        console.error("ERROR di /listsv:", error); 
        ctx.reply("Maaf ada yg error tolong hubungi owner"); 
    }
});

bot.command('download', async (ctx) => {
    try {
        const args = ctx.message.text.split(/\s+/).slice(1);
        if (args.length < 2) {
            return ctx.reply("Penggunaan: /download <nama_file> <nama_penyimpanan>");
        }

        const [fileName, penyimpananName] = args;
        const localPath = path.join(getStoragePath(penyimpananName.toLowerCase()), fileName);

        if (!fsExtra.existsSync(localPath)) {
            return ctx.reply(`File '${fileName}' tidak ditemukan di penyimpanan '${penyimpananName}'.`);
        }

        await ctx.replyWithDocument({ source: localPath, filename: fileName }, {
            caption: `Download: ${fileName}`
        });
    } catch (error) {
        console.error("ERROR di /download:", error); 
        ctx.reply("Maaf ada yg error tolong hubungi owner"); 
    }
});

bot.on('message', async (ctx) => {
    if (!ctx.message.reply_to_message) return; 
    
    const replyText = ctx.message.text || '';
    if (!replyText.startsWith('/SV ')) return;

    try {
        const args = replyText.split(/\s+/).slice(1);
        if (args.length < 2) {
            return ctx.reply("Penggunaan: /SV <nama_file> <nama_penyimpanan>");
        }

        const [fileName, penyimpananName] = args;
        const folderPath = getStoragePath(penyimpananName.toLowerCase());

        if (!fsExtra.existsSync(folderPath)) {
            return ctx.reply(`Penyimpanan '${penyimpananName}' tidak ditemukan.`);
        }

        const fileTypes = ['document', 'photo', 'video', 'audio'];
        const fileIdKey = fileTypes.find(type => ctx.message.reply_to_message[type]);
        
        if (!fileIdKey) {
            return ctx.reply("Pesan yang di-reply tidak mengandung dokumen/media yang didukung.");
        }

        let fileInfo;
        if (fileIdKey === 'photo') {
            fileInfo = ctx.message.reply_to_message.photo.pop();
        } else {
            fileInfo = ctx.message.reply_to_message[fileIdKey];
        }
        
        const fileLink = await ctx.telegram.getFileLink(fileInfo.file_id);
        const response = await axios({
            url: fileLink.href,
            method: 'GET',
            responseType: 'stream'
        });

        let finalFileName = fileName;
        if (!finalFileName.includes('.')) {
            const extension = path.extname(fileLink.href.split('?')[0]) || '.dat';
            finalFileName += extension;
        }

        const localPath = path.join(folderPath, finalFileName);
        
        const writer = fsExtra.createWriteStream(localPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        const pterodactylOk = await pterodactylApiUpload(localPath, penyimpananName);
        
        if (pterodactylOk) {
            ctx.reply(`✅ File '${finalFileName}' berhasil disimpan ke '${penyimpananName}' dan diunggah ke Pterodactyl!`);
        } else {
             ctx.reply(`⚠️ File '${finalFileName}' disimpan lokal, TAPI gagal diunggah ke Pterodactyl.`);
        }

    } catch (error) {
        console.error("ERROR di /SV:", error); 
        ctx.reply("Maaf ada yg error tolong hubungi owner"); 
    }
});


// --- START SERVER DAN BOT ---

bot.launch();
app.listen(config.WEB_PORT, () => {
    console.log(`[Web] Server web berjalan di http://localhost:${config.WEB_PORT}`);
    console.log("[Bot] Bot Telegram berjalan...");
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
