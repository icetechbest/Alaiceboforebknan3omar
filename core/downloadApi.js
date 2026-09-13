const axios = require('axios');

// 🌐 رابط الـ API بتاعك (devx-api / NexoAPI) اللي فيه أوامر التحميل.
// غيّر القيمة دي هنا لرابط السيرفر بعد ما ترفعه، أو سيبها زي ما هي وحط
// المتغير API_BASE_URL في متغيرات البيئة (Environment Variables) بتاعة
// استضافة البوت — أسهل وأأمن، وميحتاجش تعدل الكود تاني لو الرابط اتغير.
const API_BASE_URL = (process.env.API_BASE_URL || 'https://alaiceboforebknan3omar-production.up.railway.app').replace(/\/+$/, '');

const client = axios.create({ timeout: 30000 });

/**
 * بينادي أي مسار تحميل عندك في الـ API (يوتيوب/تيك توك/انستقرام/فيسبوك..)
 * وبيرجع الـ result جاهز، أو يرمي Error برسالة عربي واضحة تتبعت للمستخدم.
 */
async function resolveMedia(platform, url) {
    try {
        const { data } = await client.get(`${API_BASE_URL}/api/dl/${platform}`, { params: { url } });
        if (!data || data.status !== true || !data.result) {
            throw new Error(data?.message || 'تعذر جلب الميديا من الرابط ده.');
        }
        return data.result;
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message || 'حصل خطأ أثناء الاتصال بالسيرفر.');
    }
}

/**
 * بينادي مسار الأغاني (يوتيوب mp3) — بيقبل اسم أغنية للبحث أو رابط يوتيوب مباشر.
 * برجع { title, video_id, url } فيها رابط الصوت المباشر.
 */
async function resolveSong(query) {
    try {
        const { data } = await client.get(`${API_BASE_URL}/api/audio/youtube-mp3`, {
            params: { q: query, link: 1 }
        });
        if (!data || data.status !== true || !data.result) {
            throw new Error(data?.message || 'تعذر جلب الأغنية.');
        }
        return data.result;
    } catch (err) {
        throw new Error(err.response?.data?.message || err.message || 'حصل خطأ أثناء جلب الأغنية.');
    }
}

function buildCaption(result) {
    const lines = ['╔═══•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•══╗'];
    if (result.title) lines.push(`📌 ${result.title}`);
    const authorName = typeof result.author === 'string'
        ? result.author
        : (result.author?.nickname || result.author?.username);
    if (authorName) lines.push(`👤 ${authorName}`);
    lines.push('╚════════════════╝');
    return lines.join('\n');
}

/**
 * بترسل الميديا المناسبة (فيديو/صورة/صوت) حسب شكل الـ result اللي راجع من كل
 * منصة، لأن كل خدمة في الـ API بترجع شكل شوية مختلف (media.no_watermark،
 * media.hd/sd، media.video/image، media.video[]/audio[]، media.stream...).
 */
async function sendResolvedMedia(sock, m, platform, result) {
    const chatId = m.key.remoteJid;
    const caption = buildCaption(result);

    if (platform === 'soundcloud') {
        if (!result.media?.stream) throw new Error('مفيش صوت متاح لتحميله من الرابط ده.');
        return sock.sendMessage(chatId, { audio: { url: result.media.stream }, mimetype: 'audio/mpeg' }, { quoted: m });
    }

    if (platform === 'youtube') {
        const video = result.media?.video?.[0];
        const audio = result.media?.audio?.[0];
        if (video?.url) {
            return sock.sendMessage(chatId, { video: { url: video.url }, caption }, { quoted: m });
        }
        if (audio?.url) {
            return sock.sendMessage(chatId, { audio: { url: audio.url }, mimetype: 'audio/mpeg' }, { quoted: m });
        }
        throw new Error('مفيش ميديا متاحة لتحميلها من الفيديو ده.');
    }

    // تويتر ممكن يرجع أكتر من صورة في بوست واحد من غير فيديو
    if (platform === 'twitter' && Array.isArray(result.media?.photos) && result.media.photos.length && !result.media?.video) {
        for (const photo of result.media.photos) {
            await sock.sendMessage(chatId, { image: { url: photo }, caption }, { quoted: m });
        }
        return;
    }

    const videoUrl = result.media?.no_watermark || result.media?.hd || result.media?.sd || result.media?.video || null;
    const imageUrl = result.media?.image || null;

    if (videoUrl) {
        return sock.sendMessage(chatId, { video: { url: videoUrl }, caption }, { quoted: m });
    }
    if (imageUrl) {
        return sock.sendMessage(chatId, { image: { url: imageUrl }, caption }, { quoted: m });
    }
    throw new Error('مفيش ميديا اتلقت من الرابط ده.');
}

/**
 * بيبني أمر تحميل كامل (فيه فحص الرابط + رياكشن + استدعاء الـ API + إرسال
 * الميديا + رسالة خطأ واضحة لو فشل) عشان كل منصة تبقى ملف صغير 5 سطور.
 */
function makeDownloadCommand({ name, aliases, platform, example }) {
    return {
        name,
        aliases,
        category: 'downloads',
        async execute(sock, m, args) {
            const chatId = m.key.remoteJid;
            const url = args[0];
            if (!url) {
                return sock.sendMessage(chatId, {
                    text: `⚠️ ابعت الرابط بعد الأمر.\nمثال: .${name} ${example}`
                }, { quoted: m });
            }

            await sock.sendMessage(chatId, { react: { text: '⏳', key: m.key } });
            try {
                const result = await resolveMedia(platform, url);
                await sendResolvedMedia(sock, m, platform, result);
            } catch (err) {
                await sock.sendMessage(chatId, { text: `❌ ${err.message}` }, { quoted: m });
            }
        }
    };
}

module.exports = { API_BASE_URL, resolveMedia, resolveSong, sendResolvedMedia, makeDownloadCommand };
