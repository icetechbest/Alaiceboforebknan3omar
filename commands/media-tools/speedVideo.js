// .تسريع-فيديو <معامل السرعة>
// رد على فيديو واكتب مثلًا: .تسريع-فيديو 2   (أو 0.5 عشان يتبطأ)
const fs = require('fs');
const {
    extractMediaMessage,
    downloadMediaToFile,
    makeTempDir,
    cleanupTempDir,
    runFFmpeg,
    buildAtempoChain
} = require('./_shared.js');

const MIN_FACTOR = 0.25;
const MAX_FACTOR = 8;

module.exports = {
    name: 'تسريع-فيديو',
    aliases: ['سرعة-فيديو', 'speed-video', 'speedup'],
    category: 'media-tools',

    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        const factor = parseFloat(args[0]);

        if (!Number.isFinite(factor) || factor <= 0) {
            return sock.sendMessage(chatId, {
                text:
                    '📖 *طريقة الاستخدام:*\n' +
                    'رد على فيديو واكتب: *.تسريع-فيديو <معامل السرعة>*\n' +
                    'مثال: .تسريع-فيديو 2  (لتسريع الفيديو للضعف)\n' +
                    'أو: .تسريع-فيديو 0.5  (لإبطاء الفيديو للنص)'
            }, { quoted: m });
        }

        if (factor < MIN_FACTOR || factor > MAX_FACTOR) {
            return sock.sendMessage(chatId, {
                text: `⚠️ المعامل لازم يكون بين ${MIN_FACTOR} و ${MAX_FACTOR}.`
            }, { quoted: m });
        }

        const media = extractMediaMessage(m);
        if (!media || media.type !== 'videoMessage') {
            return sock.sendMessage(chatId, {
                text: '⚠️ رد (reply) على فيديو واكتب: *.تسريع-فيديو <معامل>*'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '⏩', key: m.key } });

        const tempDir = makeTempDir('speed-video');

        try {
            const inputFile = await downloadMediaToFile(sock, media, tempDir, 'input');
            const outputFile = `${tempDir}/output.mp4`;

            const ptsFactor = (1 / factor).toFixed(6);
            const atempoChain = buildAtempoChain(factor);

            try {
                // المحاولة الأولى: فيديو + صوت
                await runFFmpeg([
                    '-y',
                    '-i', inputFile,
                    '-filter_complex',
                    `[0:v]setpts=${ptsFactor}*PTS[v];[0:a]${atempoChain}[a]`,
                    '-map', '[v]',
                    '-map', '[a]',
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-c:a', 'aac',
                    outputFile
                ]);
            } catch (withAudioErr) {
                // لو الفيديو من غير صوت (audio stream مش موجود) هنرجع نجرب بدون صوت
                await runFFmpeg([
                    '-y',
                    '-i', inputFile,
                    '-filter:v', `setpts=${ptsFactor}*PTS`,
                    '-an',
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    outputFile
                ]);
            }

            if (!fs.existsSync(outputFile)) {
                throw new Error('❌ فشل تغيير سرعة الفيديو.');
            }

            const outputBuffer = fs.readFileSync(outputFile);

            await sock.sendMessage(chatId, {
                video: outputBuffer,
                mimetype: 'video/mp4',
                caption: `✅ *تم تغيير سرعة الفيديو x${factor}*`
            }, { quoted: m });

        } catch (err) {
            console.error('[تسريع-فيديو] ❌', err.message || err);
            await sock.sendMessage(chatId, {
                text: `❌ حصلت مشكلة أثناء تغيير سرعة الفيديو.\n${err.message || ''}`
            }, { quoted: m });
        } finally {
            cleanupTempDir(tempDir, 'تسريع-فيديو');
        }
    }
};
