const axios = require('axios');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sentVideos = new Set();

/* =========================
   TikTok
========================= */

async function searchTiktok(searchText) {
    const { data } = await axios.get(
        'https://www.tikwm.com/api/feed/search',
        {
            params: {
                keywords: searchText,
                count: 10
            },
            timeout: 15000,
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Safari/537.36',
                'Accept': 'application/json, text/plain, */*'
            }
        }
    );

    const results = data?.data?.videos;

    if (!Array.isArray(results) || results.length === 0) {
        return null;
    }

    const fresh = results.filter(
        v => v?.play && !sentVideos.has(v.play)
    );

    const vid = fresh[0] || results[0];

    if (!vid?.play) {
        return null;
    }

    sentVideos.add(vid.play);

    // منع Set من النمو بلا حدود
    if (sentVideos.size > 200) {
        const first = sentVideos.values().next().value;
        sentVideos.delete(first);
    }

    return vid.play;
}

/* =========================
   YouTube / yt-dlp
========================= */

function downloadYouTube(searchText, tmpDir) {
    const outPath = path.join(
        tmpDir,
        'video.%(ext)s'
    );

    /*
     * نجرب أكثر من player client.
     *
     * ملاحظة:
     * YouTube ممكن يمنع بعض الـ clients من Railway،
     * لذلك لا نعتمد على محاولة واحدة.
     */

    const attempts = [
        {
            name: 'android',
            args: [
                `ytsearch1:${searchText}`,
                '--no-playlist',
                '--extractor-args',
                'youtube:player_client=android',
                '-f',
                'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
                '--merge-output-format',
                'mp4',
                '-o',
                outPath,
                '--quiet',
                '--no-warnings'
            ]
        },
        {
            name: 'tv',
            args: [
                `ytsearch1:${searchText}`,
                '--no-playlist',
                '--extractor-args',
                'youtube:player_client=tv',
                '-f',
                'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
                '--merge-output-format',
                'mp4',
                '-o',
                outPath,
                '--quiet',
                '--no-warnings'
            ]
        },
        {
            name: 'web',
            args: [
                `ytsearch1:${searchText}`,
                '--no-playlist',
                '--extractor-args',
                'youtube:player_client=web',
                '-f',
                'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
                '--merge-output-format',
                'mp4',
                '-o',
                outPath,
                '--quiet',
                '--no-warnings'
            ]
        }
    ];

    let lastError = null;

    for (const attempt of attempts) {
        try {
            console.log(
                `[ايديت] YouTube: تجربة client = ${attempt.name}`
            );

            /*
             * حذف أي ملفات قديمة من محاولة سابقة
             */
            for (const file of fs.readdirSync(tmpDir)) {
                fs.rmSync(
                    path.join(tmpDir, file),
                    {
                        recursive: true,
                        force: true
                    }
                );
            }

            execFileSync(
                'yt-dlp',
                attempt.args,
                {
                    stdio: ['ignore', 'pipe', 'pipe'],
                    timeout: 120000
                }
            );

            const files = fs
                .readdirSync(tmpDir)
                .filter(file =>
                    /\.(mp4|mkv|webm|mov)$/i.test(file)
                );

            if (files.length > 0) {
                console.log(
                    `[ايديت] YouTube: نجحت محاولة ${attempt.name}`
                );

                return path.join(tmpDir, files[0]);
            }

        } catch (err) {
            const stderr = err.stderr
                ? err.stderr.toString()
                : err.message;

            lastError = stderr;

            console.warn(
                `[ايديت] YouTube client ${attempt.name} فشل:`
            );

            console.warn(stderr);
        }
    }

    throw new Error(
        lastError ||
        'كل محاولات yt-dlp فشلت.'
    );
}

/* =========================
   Command
========================= */

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
            {
                quoted: m
            }
        );

        /* =========================
           TikTok First
        ========================= */

        try {
            const videoUrl =
                await searchTiktok(searchText);

            if (videoUrl) {
                console.log(
                    '[ايديت] TikTok: تم العثور على فيديو'
                );

                return await sock.sendMessage(
                    chatId,
                    {
                        video: {
                            url: videoUrl
                        },

                        caption:
`╔═══•『 𝐀𝐍𝐈𝐌𝐄 𝐄𝐃𝐈𝐓 』•══╗
🎬 *ايديت:* *${query || 'عشوائي'}*
📱 المصدر: TikTok
╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
                    },
                    {
                        quoted: m
                    }
                );
            }

            console.warn(
                '[ايديت] TikTok: لا توجد نتائج، الانتقال إلى YouTube'
            );

        } catch (err) {
            console.error(
                '[ايديت] خطأ TikTok:',
                err.response?.status || err.message
            );

            console.warn(
                '[ايديت] الانتقال إلى YouTube...'
            );
        }

        /* =========================
           YouTube Fallback
        ========================= */

        let tmpDir = null;

        try {
            tmpDir = fs.mkdtempSync(
                path.join(
                    os.tmpdir(),
                    'song-edit-'
                )
            );

            const videoPath =
                downloadYouTube(
                    searchText,
                    tmpDir
                );

            if (
                !videoPath ||
                !fs.existsSync(videoPath)
            ) {
                throw new Error(
                    'yt-dlp لم يرجع ملف فيديو صالح.'
                );
            }

            console.log(
                `[ايديت] إرسال الفيديو: ${videoPath}`
            );

            await sock.sendMessage(
                chatId,
                {
                    video: fs.readFileSync(
                        videoPath
                    ),

                    caption:
`╔═══•『 𝐀𝐍𝐈𝐌𝐄 𝐄𝐃𝐈𝐓 』•══╗
🎬 *ايديت:* *${query || 'عشوائي'}*
📺 المصدر: YouTube
╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
                },
                {
                    quoted: m
                }
            );

        } catch (err) {
            console.error(
                '[ايديت] خطأ YouTube:',
                err.message
            );

            await sock.sendMessage(
                chatId,
                {
                    text:
`❌ عذراً، تعذر العثور على الفيديو حالياً.

🎬 *البحث:* ${query || 'Anime Edit'}

حاول مرة أخرى بعد قليل.`
                },
                {
                    quoted: m
                }
            );

        } finally {
            /*
             * تنظيف الملفات مهما حصل
             */
            if (tmpDir) {
                try {
                    fs.rmSync(
                        tmpDir,
                        {
                            recursive: true,
                            force: true
                        }
                    );
                } catch (cleanupError) {
                    console.warn(
                        '[ايديت] فشل تنظيف الملفات المؤقتة:',
                        cleanupError.message
                    );
                }
            }
        }
    }
};