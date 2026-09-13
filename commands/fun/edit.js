const axios = require('axios');
const yt = require('youtube-search-without-api-key');

const sentVideos = new Set();

async function searchYouTube(searchText) {
    const results = await yt.search(searchText, {
        duration: 'under'
    });

    if (!Array.isArray(results) || results.length === 0) {
        return null;
    }

    // نختار أول نتيجة لم يتم إرسالها قبل كده
    const fresh = results.filter(v => {
        const url = v?.url;
        return url && !sentVideos.has(url);
    });

    const video = fresh[0] || results[0];

    if (!video?.url) return null;

    sentVideos.add(video.url);

    return {
        url: video.url,
        title: video.title || 'YouTube Video'
    };
}

async function downloadVideo(videoUrl) {
    const apiUrl =
        `https://ahm7xmakki.com/api/alldl?url=${encodeURIComponent(videoUrl)}`;

    const response = await axios.get(apiUrl, {
        timeout: 30000,
        maxContentLength: 100 * 1024 * 1024,
        maxBodyLength: 100 * 1024 * 1024
    });

    const data = response.data;

    // AllDL حسب التوثيق يرجع data.mediaInfo.videoUrl
    const directUrl =
        data?.data?.mediaInfo?.videoUrl ||
        data?.mediaInfo?.videoUrl ||
        data?.videoUrl ||
        data?.downloadUrl ||
        data?.url;

    if (!directUrl || typeof directUrl !== 'string') {
        throw new Error('AllDL لم يرجع رابط فيديو صالح');
    }

    return directUrl;
}

module.exports = {
    name: 'ايديت',
    aliases: ['edit', 'فيديو'],
    category: 'media',

    async execute(sock, m, args, db, sender) {
        const chatId = m.key.remoteJid;

        const query = args.join(' ').trim();

        const searchText = query
            ? `anime edit ${query}`
            : 'anime edit';

        await sock.sendMessage(chatId, {
            react: {
                text: '🎬',
                key: m.key
            }
        });

        await sock.sendMessage(
            chatId,
            {
                text:
`╔═══•『 𝐒𝐎𝐍𝐆 𝐄𝐃𝐈𝐓 』•══╗
*💫 جارٍ جلب أفضل ايديت لك..*
╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
            },
            { quoted: m }
        );

        try {
            console.log(`[ايديت] البحث عن: ${searchText}`);

            // 1️⃣ البحث في YouTube
            const video = await searchYouTube(searchText);

            if (!video) {
                throw new Error('لم يتم العثور على نتائج في YouTube');
            }

            console.log(`[ايديت] النتيجة: ${video.title}`);
            console.log(`[ايديت] الرابط: ${video.url}`);

            // 2️⃣ تحويل رابط YouTube إلى رابط فيديو مباشر
            const directUrl = await downloadVideo(video.url);

            console.log('[ايديت] تم الحصول على رابط الفيديو');

            // 3️⃣ إرسال الفيديو
            await sock.sendMessage(
                chatId,
                {
                    video: {
                        url: directUrl
                    },

                    caption:
`╔═══•『 𝐀𝐍𝐈𝐌𝐄 𝐄𝐃𝐈𝐓 』•══╗
🎬 *ايديت:* *${query || 'عشوائي'}*
📺 المصدر: YouTube
╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
                },
                { quoted: m }
            );

        } catch (err) {
            console.error(
                '[ايديت] خطأ:',
                err?.response?.data || err.message
            );

            await sock.sendMessage(
                chatId,
                {
                    text:
`❌ حصلت مشكلة وأنا بحاول أجيب الإيديت.

🔎 البحث:
*${searchText}*

جرب اسم إيديت تاني.`
                },
                { quoted: m }
            );
        }
    }
};