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
                text: '⚠️ اكتب اسم الأغنية أو رابط يوتيوب بعد الأمر.\nمثال: .اغنيه اسم الاغنيه'
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

            // البحث في YouTube لو المستخدم كتب اسم الأغنية
            if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {

                const search = await axios.get(
                    'https://apis-starlights-team.koyeb.app/starlight/youtube-search',
                    {
                        params: {
                            text: query
                        },
                        timeout: 20000
                    }
                );

                const results = search.data?.results;

                if (!Array.isArray(results) || results.length === 0) {
                    throw new Error('ملقتش نتائج للأغنية.');
                }

                const result = results.find(v => v?.url);

                if (!result) {
                    throw new Error('نتيجة البحث مفيهاش رابط YouTube.');
                }

                youtubeUrl = result.url;
                title = result.title || query;
            }

            console.log('[اغنيه] YouTube:', youtubeUrl);

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

            const mp3Url = convert.data.downloadUrl;

            console.log('[اغنيه] MP3 URL:', mp3Url);

            // تحميل الـMP3 فعليًا على السيرفر
            const audioResponse = await axios.get(mp3Url, {
                responseType: 'arraybuffer',
                timeout: 180000,
                maxContentLength: 50 * 1024 * 1024,
                maxBodyLength: 50 * 1024 * 1024
            });

            const audioBuffer = Buffer.from(audioResponse.data);

            if (!audioBuffer.length) {
                throw new Error('ملف MP3 طلع فاضي.');
            }

            console.log(
                `[اغنيه] تم تحميل MP3: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`
            );

            // إرسال الملف نفسه
            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`,
                ptt: false
            }, { quoted: m });

            console.log('[اغنيه] ✅ تم إرسال الأغنية');

        } catch (err) {

            console.error(
                '[اغنيه] ❌',
                err?.response?.data || err.message
            );

            await sock.sendMessage(chatId, {
                text:
`❌ حصلت مشكلة في تحميل الأغنية.

🎵 *${query}*

${err?.response?.data?.error || err.message}`
            }, { quoted: m });
        }
    }
};