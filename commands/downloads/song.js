const { resolveSong } = require('../../core/downloadApi');

module.exports = {
    name: 'اغنيه',
    aliases: ['اغنية', 'song', 'تحميل-اغنيه'],
    category: 'downloads',
    async execute(sock, m, args) {
        const chatId = m.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '⚠️ اكتب اسم الأغنية (أو رابط يوتيوب) بعد الأمر.\nمثال: .اغنيه اسم الاغنيه'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, { react: { text: '🎵', key: m.key } });
        await sock.sendMessage(chatId, {
            text: `╔═══•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•══╗\n*🎧 جارٍ البحث عن: ${query}*\n╚════════════════╝`
        }, { quoted: m });

        try {
            const song = await resolveSong(query);
            await sock.sendMessage(chatId, {
                audio: { url: song.url },
                mimetype: 'audio/mpeg',
                fileName: `${song.title || query}.mp3`
            }, { quoted: m });
        } catch (err) {
            await sock.sendMessage(chatId, { text: `❌ ${err.message}` }, { quoted: m });
        }
    }
};
