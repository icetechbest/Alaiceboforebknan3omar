// .ازالة-خلفية-صورة
// رد على صورة واكتب: .ازالة-خلفية-صورة
//
// بيستخدم API الـ remove.bg (فيه باقة مجانية: 50 صورة/شهر بدون فيزا،
// https://www.remove.bg/api). سجّل واخد الـ API Key من هنا:
// https://www.remove.bg/dashboard#api-key
// وحطه في متغيرات البيئة (Environment Variables) بتاعة الاستضافة باسم:
//   REMOVEBG_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
const fs = require('fs');
const axios = require('axios');
const {
    extractMediaMessage,
    downloadMediaToFile,
    makeTempDir,
    cleanupTempDir
} = require('./_shared.js');

module.exports = {
    name: 'ازالة-خلفية-صورة',
    aliases: ['ازالة-خلفيه-صوره', 'remove-bg', 'ازاله-خلفيه'],
    category: 'media-tools',

    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        const apiKey = process.env.REMOVEBG_API_KEY;
        if (!apiKey) {
            return sock.sendMessage(chatId, {
                text:
                    '⚠️ الأمر ده محتاج مفتاح API من remove.bg (فيه باقة مجانية).\n\n' +
                    '1) سجّل هنا: https://www.remove.bg/dashboard#api-key\n' +
                    '2) خد الـ API Key\n' +
                    '3) حطه في متغيرات البيئة بتاعة استضافة البوت باسم:\n' +
                    '   REMOVEBG_API_KEY'
            }, { quoted: m });
        }

        const media = extractMediaMessage(m);
        if (!media || media.type !== 'imageMessage') {
            return sock.sendMessage(chatId, {
                text: '⚠️ رد (reply) على صورة واكتب: *.ازالة-خلفية-صورة*'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '🪄', key: m.key } });

        const tempDir = makeTempDir('remove-bg');

        try {
            const inputFile = await downloadMediaToFile(sock, media, tempDir, 'input');
            const imageBase64 = fs.readFileSync(inputFile).toString('base64');

            const response = await axios.post(
                'https://api.remove.bg/v1.0/removebg',
                {
                    image_file_b64: imageBase64,
                    size: 'auto',
                    format: 'png'
                },
                {
                    headers: {
                        'X-Api-Key': apiKey,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer',
                    timeout: 60000,
                    validateStatus: () => true
                }
            );

            const contentType = response.headers?.['content-type'] || '';

            if (response.status !== 200 || contentType.includes('application/json')) {
                let errMsg = 'فشل الطلب لـ remove.bg';
                try {
                    const parsed = JSON.parse(Buffer.from(response.data).toString('utf8'));
                    errMsg = parsed?.errors?.[0]?.title || errMsg;
                } catch (_) { /* تجاهل */ }
                throw new Error(`❌ ${errMsg} (status: ${response.status})`);
            }

            const resultBuffer = Buffer.from(response.data);

            if (!resultBuffer.length) {
                throw new Error('❌ الصورة الناتجة طلعت فاضية.');
            }

            await sock.sendMessage(chatId, {
                image: resultBuffer,
                caption: '✅ *تم إزالة الخلفية*'
            }, { quoted: m });

        } catch (err) {
            console.error('[ازالة-خلفية-صورة] ❌', err.message || err);
            await sock.sendMessage(chatId, {
                text: `❌ حصلت مشكلة أثناء إزالة الخلفية.\n${err.message || ''}`
            }, { quoted: m });
        } finally {
            cleanupTempDir(tempDir, 'ازالة-خلفية-صورة');
        }
    }
};
