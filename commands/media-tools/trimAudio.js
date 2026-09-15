// .قص-اغنيه <من_ثانية> <لحد_ثانية>
// رد على صوت (أغنية أو فويس) واكتب مثلًا: .قص-اغنيه 10 40
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

const MAX_DURATION_SECONDS = 15 * 60; // حد أقصى 15 دقيقة

module.exports = {
    name: 'قص-اغنيه',
    aliases: ['قص-اغنية', 'قص-صوت', 'trim-audio', 'cut-audio'],
    category: 'media-tools',

    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        const start = parseTimeArg(args[0]);
        const end = parseTimeArg(args[1]);

        if (start === null || end === null) {
            return sock.sendMessage(chatId, {
                text:
                    '📖 *طريقة الاستخدام:*\n' +
                    'رد على أغنية/صوت واكتب: *.قص-اغنيه <من_ثانية> <لحد_ثانية>*\n' +
                    'مثال: .قص-اغنيه 10 40\n' +
                    'تقدر كمان تكتب الوقت بصيغة mm:ss زي: .قص-اغنيه 0:10 0:40'
            }, { quoted: m });
        }

        if (start < 0 || end <= start) {
            return sock.sendMessage(chatId, {
                text: '⚠️ لازم "لحد_ثانية" يكون أكبر من "من_ثانية"، وكلاهما رقم موجب.'
            }, { quoted: m });
        }

        if (end - start > MAX_DURATION_SECONDS) {
            return sock.sendMessage(chatId, {
                text: `⚠️ أقصى مدة مسموحة للقص هي ${MAX_DURATION_SECONDS / 60} دقيقة.`
            }, { quoted: m });
        }

        const media = extractMediaMessage(m);
        if (!media || media.type !== 'audioMessage') {
            return sock.sendMessage(chatId, {
                text: '⚠️ رد (reply) على أغنية أو رسالة صوتية واكتب: *.قص-اغنيه <من> <لحد>*'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '🎧', key: m.key } });

        const tempDir = makeTempDir('trim-audio');

        try {
            const inputFile = await downloadMediaToFile(sock, media, tempDir, 'input');
            const outputFile = `${tempDir}/output.mp3`;

            await runFFmpeg([
                '-y',
                '-ss', String(start),
                '-to', String(end),
                '-i', inputFile,
                '-vn',
                '-c:a', 'libmp3lame',
                '-b:a', '192k',
                '-ar', '44100',
                '-ac', '2',
                outputFile
            ]);

            if (!fs.existsSync(outputFile)) {
                throw new Error('❌ فشل قص المقطع الصوتي، تأكد إن المدة اللي طلبتها موجودة فعلًا في الصوت.');
            }

            const outputBuffer = fs.readFileSync(outputFile);

            if (!outputBuffer.length) {
                throw new Error('❌ الناتج طلع فاضي، تأكد من المدة اللي كتبتها.');
            }

            await sock.sendMessage(chatId, {
                audio: outputBuffer,
                mimetype: 'audio/mpeg',
                fileName: 'cut.mp3',
                ptt: false
            }, { quoted: m });

            await sock.sendMessage(chatId, {
                text: `✅ *تم القص* من ${formatSeconds(start)} لحد ${formatSeconds(end)}`
            });

        } catch (err) {
            console.error('[قص-اغنيه] ❌', err.message || err);
            await sock.sendMessage(chatId, {
                text: `❌ حصلت مشكلة أثناء قص المقطع الصوتي.\n${err.message || ''}`
            }, { quoted: m });
        } finally {
            cleanupTempDir(tempDir, 'قص-اغنيه');
        }
    }
};
