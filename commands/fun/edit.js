const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sentVideos = new Set();

const STARLIGHT_API =
    'https://apis-starlights-team.koyeb.app/starlight/youtube-search';

const ALLDL_API =
    'https://ahm7xmakki.com/api/alldl';

async function searchYouTube(searchText) {
    const response = await axios.get(STARLIGHT_API, {
        params: {
            text: searchText
        },
        timeout: 20000
    });

    const results = response.data?.results;

    if (!Array.isArray(results) || results.length === 0) {
        return null;
    }

    const fresh = results.filter(v =>
        v?.url && !sentVideos.has(v.url)
    );

    const video = fresh[0] || results[0];

    if (!video?.url) {
        return null;
    }

    sentVideos.add(video.url);

    return video;
}

async function getDownloadUrl(videoUrl) {
    const response = await axios.get(ALLDL_API, {
        params: {
            url: videoUrl
        },
        timeout: 60000
    });

    const data = response.data;

    if (!data?.success) {
        throw new Error(
            data?.message || 'AllDL لم يستطع معالجة الفيديو'
        );
    }

    const directUrl =
        data?.mediaInfo?.videoUrl ||
        data?.data?.mediaInfo?.videoUrl;

    if (!directUrl) {
        throw new Error('AllDL لم يرجع رابط الفيديو');
    }

    return directUrl;
}

async function downloadToFile(videoUrl) {
    const tmpDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'song-edit-')
    );

    const filePath = path.join(tmpDir, 'video.mp4');

    const response = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 120000,
        maxContentLength: 100 * 1024 * 1024,
        maxBodyLength: 100 * 1024 * 1024
    });

    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
    });

    return {
        tmpDir,
        filePath
    };
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

        let tmpDir = null;

        try {
            console.log(`[ايديت] البحث: ${searchText}`);

            // 1️⃣ البحث عن الفيديو
            const video = await searchYouTube(searchText);

            if (!video) {
                throw new Error(
                    'Starlight YouTube Search لم يرجع نتائج'
                );
            }

            console.log(`[ايديت] 🎬 ${video.title}`);
            console.log(`[ايديت] 🔗 ${video.url}`);

            // 2️⃣ تحويل رابط YouTube إلى MP4
            console.log('[ايديت] ⬇️ جاري طلب الفيديو من AllDL...');

            const directUrl = await getDownloadUrl(video.url);

            console.log('[ايديت] ✅ تم الحصول على رابط MP4');

            // 3️⃣ تحميل الفيديو فعليًا للسيرفر
            const downloaded = await downloadToFile(directUrl);

            tmpDir = downloaded.tmpDir;

            console.log('[ايديت] 📥 تم تحميل الفيديو');

            // 4️⃣ إرسال الفيديو نفسه إلى واتساب
            await sock.sendMessage(
                chatId,
                {
                    video: fs.readFileSync(downloaded.filePath),
                    mimetype: 'video/mp4',
                    fileName: 'anime-edit.mp4',
                    caption:
`╔═══•『 𝐀𝐍𝐈𝐌𝐄 𝐄𝐃𝐈𝐓 』•══╗
🎬 *ايديت:* *${query || 'عشوائي'}*
📺 المصدر: YouTube
✨ ${video.title}
╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
                },
                { quoted: m }
            );

            console.log('[ايديت] ✅ تم إرسال الفيديو');

        } catch (err) {
            console.error(
                '[ايديت] ❌ خطأ:',
                err?.response?.data || err.message
            );

            await sock.sendMessage(
                chatId,
                {
                    text:
`❌ حصلت مشكلة أثناء جلب الإيديت.

🔎 البحث:
*${searchText}*

حاول مرة تانية بعد شوية.`
                },
                { quoted: m }
            );

        } finally {
            // حذف الفيديو المؤقت
            if (tmpDir) {
                try {
                    fs.rmSync(tmpDir, {
                        recursive: true,
                        force: true
                    });
                } catch (e) {
                    console.error(
                        '[ايديت] خطأ حذف الملف المؤقت:',
                        e.message
                    );
                }
            }
        }
    }
};