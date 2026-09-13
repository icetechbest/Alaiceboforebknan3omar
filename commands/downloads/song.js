const axios = require('axios');

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

        await sock.sendMessage(chatId, {
            react: { text: '🎵', key: m.key }
        });

        await sock.sendMessage(chatId, {
            text: `╔═══•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•══╗
*🎧 جارٍ البحث عن: ${query}*
╚════════════════╝`
        }, { quoted: m });

        try {
            let youtubeUrl = query;
            let title = query;

            // لو المستخدم كتب اسم الأغنية بدل رابط يوتيوب
            if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {
                const search = await axios.get(
                    'https://apis-starlights-team.koyeb.app/starlight/youtube-search',
                    {
                        params: { text: query },
                        timeout: 20000
                    }
                );

                const results = search.data?.results;

                if (!Array.isArray(results) || !results.length || !results[0]?.url) {
                    throw new Error('ملقتش الأغنية في البحث.');
                }

                youtubeUrl = results[0].url;
                title = results[0].title || query;
            }

            // تحويل YouTube إلى MP3
            const convert = await axios.post(
                'https://ytmp3.ge/api/convert',
                new URLSearchParams({
                    youtube_url: youtubeUrl,
                    quality: '192'
                }).toString(),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 300000
                }
            );

            if (!convert.data?.success || !convert.data?.downloadUrl) {
                throw new Error(
                    convert.data?.error || 'فشل تحويل الأغنية إلى MP3.'
                );
            }

            await sock.sendMessage(chatId, {
                audio: {
                    url: convert.data.downloadUrl
                },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: m });

        } catch (err) {
            console.error(
                '[اغنيه]',
                err?.response?.data || err.message
            );

            await sock.sendMessage(chatId, {
                text: `❌ ${err?.response?.data?.error || err.message}`
            }, { quoted: m });
        }
    }
};