// .تحويل-GIF
// رد على فيديو واكتب: .تحويل-GIF
//
// واتساب مش بيعرض ملفات .gif حقيقية كـ GIF متحرك جوه الشات (بيتعامل معاها
// كصورة ثابتة)، فالطريقة القياسية إن الفيديو يتحول لملف mp4 قصير وخفيف
// ويتبعت بخاصية gifPlayback عشان يتشغل تلقائي ويتكرر زي الـ GIF بالظبط.
const fs = require('fs');
const {
    extractMediaMessage,
    downloadMediaToFile,
    makeTempDir,
    cleanupTempDir,
    runFFmpeg
} = require('./_shared.js');

const MAX_GIF_SECONDS = 15; // نقص أي فيديو أطول من كده لأول 15 ثانية بس

module.exports = {
    name: 'تحويل-GIF',
    aliases: ['فيديو-الى-جيف', 'togif', 'to-gif', 'جيف'],
    category: 'media-tools',

    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;

        const media = extractMediaMessage(m);
        if (!media || media.type !== 'videoMessage') {
            return sock.sendMessage(chatId, {
                text: '⚠️ رد (reply) على فيديو واكتب: *.تحويل-GIF*'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '🎞️', key: m.key } });

        const tempDir = makeTempDir('to-gif');

        try {
            const inputFile = await downloadMediaToFile(sock, media, tempDir, 'input');
            const outputFile = `${tempDir}/output.mp4`;

            await runFFmpeg([
                '-y',
                '-t', String(MAX_GIF_SECONDS),
                '-i', inputFile,
                '-vf', "scale='min(480,iw)':-2,fps=15",
                '-an',
                '-c:v', 'libx264',
                '-preset', 'veryfast',
                '-pix_fmt', 'yuv420p',
                '-movflags', '+faststart',
                outputFile
            ]);

            if (!fs.existsSync(outputFile)) {
                throw new Error('❌ فشل تحويل الفيديو لـ GIF.');
            }

            const outputBuffer = fs.readFileSync(outputFile);

            await sock.sendMessage(chatId, {
                video: outputBuffer,
                gifPlayback: true,
                mimetype: 'video/mp4',
                caption: '✅ *تم التحويل لـ GIF*'
            }, { quoted: m });

        } catch (err) {
            console.error('[تحويل-GIF] ❌', err.message || err);
            await sock.sendMessage(chatId, {
                text: `❌ حصلت مشكلة أثناء التحويل لـ GIF.\n${err.message || ''}`
            }, { quoted: m });
        } finally {
            cleanupTempDir(tempDir, 'تحويل-GIF');
        }
    }
};
