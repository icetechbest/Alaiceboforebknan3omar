// .قص-فيديو <من_ثانية> <لحد_ثانية>
// رد على فيديو واكتب مثلًا: .قص-فيديو 5 15
const fs = require('fs');
const {
    extractMediaMessage,
    downloadMediaToFile,
    makeTempDir,
    cleanupTempDir,
    runFFmpeg,
    parseTimeArg,
    formatSeconds
} = require('./_shared.js');

const MAX_DURATION_SECONDS = 10 * 60; // حد أقصى 10 دقايق للمقطع الناتج

module.exports = {
    name: 'قص-فيديو',
    aliases: ['قطع-فيديو', 'trim-video', 'cut-video'],
    category: 'media-tools',

    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        const start = parseTimeArg(args[0]);
        const end = parseTimeArg(args[1]);

        if (start === null || end === null) {
            return sock.sendMessage(chatId, {
                text:
                    '📖 *طريقة الاستخدام:*\n' +
                    'رد على فيديو واكتب: *.قص-فيديو <من_ثانية> <لحد_ثانية>*\n' +
                    'مثال: .قص-فيديو 5 15\n' +
                    'تقدر كمان تكتب الوقت بصيغة mm:ss زي: .قص-فيديو 0:05 0:15'
            }, { quoted: m });
        }

        if (start < 0 || end <= start) {
            return sock.sendMessage(chatId, {
                text: '⚠️ لازم "لحد_ثانية" يكون أكبر من "من_ثانية"، وكلاهما رقم موجب.'
            }, { quoted: m });
        }

        if (end - start > MAX_DURATION_SECONDS) {
            return sock.sendMessage(chatId, {
                text: `⚠️ أقصى مدة مسموحة للقص هي ${MAX_DURATION_SECONDS / 60} دقايق.`
            }, { quoted: m });
        }

        const media = extractMediaMessage(m);
        if (!media || media.type !== 'videoMessage') {
            return sock.sendMessage(chatId, {
                text: '⚠️ رد (reply) على فيديو واكتب: *.قص-فيديو <من> <لحد>*'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '✂️', key: m.key } });

        const tempDir = makeTempDir('trim-video');

        try {
            const inputFile = await downloadMediaToFile(sock, media, tempDir, 'input');
            const outputFile = `${tempDir}/output.mp4`;

            // -ss و -to قبل -i بيدّيني seek سريع، وإعادة الترميز بعدين
            // بتضمن دقة القص (frame-accurate) بدل -c copy اللي بيعتمد على الـ keyframes.
            await runFFmpeg([
                '-y',
                '-ss', String(start),
                '-to', String(end),
                '-i', inputFile,
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-c:a', 'aac',
                '-avoid_negative_ts', 'make_zero',
                outputFile
            ]);

            if (!fs.existsSync(outputFile)) {
                throw new Error('❌ فشل قص الفيديو، تأكد إن المدة اللي طلبتها موجودة فعلًا في الفيديو.');
            }

            const outputBuffer = fs.readFileSync(outputFile);

            if (!outputBuffer.length) {
                throw new Error('❌ الناتج طلع فاضي، تأكد من المدة اللي كتبتها.');
            }

            await sock.sendMessage(chatId, {
                video: outputBuffer,
                mimetype: 'video/mp4',
                caption: `✅ *تم قص الفيديو*\nمن ${formatSeconds(start)} لحد ${formatSeconds(end)}`
            }, { quoted: m });

        } catch (err) {
            console.error('[قص-فيديو] ❌', err.message || err);
            await sock.sendMessage(chatId, {
                text: `❌ حصلت مشكلة أثناء قص الفيديو.\n${err.message || ''}`
            }, { quoted: m });
        } finally {
            cleanupTempDir(tempDir, 'قص-فيديو');
        }
    }
};
