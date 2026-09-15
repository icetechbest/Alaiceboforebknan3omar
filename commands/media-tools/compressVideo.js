// .ضغط-فيديو
// رد (Reply) على فيديو واكتب: .ضغط-فيديو
const fs = require('fs');
const {
    extractMediaMessage,
    downloadMediaToFile,
    makeTempDir,
    cleanupTempDir,
    runFFmpeg,
    formatSize
} = require('./_shared.js');

module.exports = {
    name: 'ضغط-فيديو',
    aliases: ['كمبرس-فيديو', 'compress-video', 'ضغط-فديو'],
    category: 'media-tools',

    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        const media = extractMediaMessage(m);
        if (!media || media.type !== 'videoMessage') {
            return sock.sendMessage(chatId, {
                text: '⚠️ رد (reply) على فيديو واكتب: *.ضغط-فيديو*'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '📦', key: m.key } });

        const tempDir = makeTempDir('compress-video');

        try {
            const inputFile = await downloadMediaToFile(sock, media, tempDir, 'input');
            const outputFile = `${tempDir}/output.mp4`;

            const originalSize = fs.statSync(inputFile).size;

            // ضغط: تقليل الـ bitrate بزيادة CRF + تحديد أقصى عرض 640px
            // + preset سريع عشان ميستهلكش وقت معالجة كبير على السيرفر.
            await runFFmpeg([
                '-y',
                '-i', inputFile,
                '-vf', "scale='min(640,iw)':-2",
                '-c:v', 'libx264',
                '-crf', '28',
                '-preset', 'veryfast',
                '-c:a', 'aac',
                '-b:a', '96k',
                '-movflags', '+faststart',
                outputFile
            ]);

            if (!fs.existsSync(outputFile)) {
                throw new Error('❌ فشل ضغط الفيديو.');
            }

            const compressedBuffer = fs.readFileSync(outputFile);
            const newSize = compressedBuffer.length;
            const ratio = originalSize > 0
                ? (100 - (newSize / originalSize) * 100).toFixed(1)
                : 0;

            await sock.sendMessage(chatId, {
                video: compressedBuffer,
                mimetype: 'video/mp4',
                caption:
                    `✅ *تم ضغط الفيديو*\n` +
                    `📥 الحجم قبل: ${formatSize(originalSize)}\n` +
                    `📤 الحجم بعد: ${formatSize(newSize)}\n` +
                    `📉 نسبة التوفير: ${ratio}%`
            }, { quoted: m });

        } catch (err) {
            console.error('[ضغط-فيديو] ❌', err.message || err);
            await sock.sendMessage(chatId, {
                text: `❌ حصلت مشكلة أثناء ضغط الفيديو.\n${err.message || ''}`
            }, { quoted: m });
        } finally {
            cleanupTempDir(tempDir, 'ضغط-فيديو');
        }
    }
};
