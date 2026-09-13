const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

module.exports = {
    name: 'اغنيه',
    aliases: ['اغنية', 'song', 'تحميل-اغنيه'],
    category: 'downloads',

    async execute(sock, m, args) {
        const chatId = m.key.remoteJid;
        const query = args.join(' ').trim();

        if (!query) {
            return sock.sendMessage(chatId, {
                text: '⚠️ اكتب اسم الأغنية أو رابط يوتيوب بعد الأمر.\nمثال: .اغنيه Eminem Without Me'
            }, { quoted: m });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🎵', key: m.key }
        });

        await sock.sendMessage(chatId, {
            text:
                `╔═══•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•══╗\n` +
                `🎧 جارٍ البحث عن: ${query}\n` +
                `⏳ جاري تجهيز الأغنية...\n` +
                `╚════════════════╝`
        }, { quoted: m });

        const tempDir = path.join(
            os.tmpdir(),
            `song-${crypto.randomBytes(6).toString('hex')}`
        );

        try {
            fs.mkdirSync(tempDir, { recursive: true });

            let youtubeUrl = query;
            let title = query;

            // لو المستخدم كتب اسم الأغنية نبحث في YouTube
            if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {

                const search = await axios.get(
                    'https://apis-starlights-team.koyeb.app/starlight/youtube-search',
                    {
                        params: {
                            text: query
                        },
                        timeout: 30000
                    }
                );

                const results = search.data?.results;

                if (!Array.isArray(results) || results.length === 0) {
                    throw new Error('❌ ملقتش نتائج للأغنية.');
                }

                const result = results.find(v => v?.url);

                if (!result) {
                    throw new Error('❌ نتيجة البحث مفيهاش رابط YouTube.');
                }

                youtubeUrl = result.url;
                title = result.title || query;
            }

            console.log('[اغنيه] YouTube:', youtubeUrl);

            // AHM7 Downloader
            const api = await axios.get(
                'https://ahm7xmakki.com/api/alldl',
                {
                    params: {
                        url: youtubeUrl
                    },
                    timeout: 60000
                }
            );

            const data = api.data;

            if (!data?.success) {
                throw new Error('❌ الـAPI فشل في تحميل الأغنية.');
            }

            const audioUrl = data.mediaInfo?.audioUrl;

            if (!audioUrl) {
                throw new Error('❌ الـAPI ملقاش رابط الصوت.');
            }

            title = data.mediaInfo?.title || title;

            console.log('[اغنيه] Audio URL:', audioUrl);

            // تحميل الصوت الأصلي
            const inputFile = path.join(tempDir, 'input_media');
            const outputFile = path.join(tempDir, 'song.mp3');

            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 300000,
                maxContentLength: 100 * 1024 * 1024,
                maxBodyLength: 100 * 1024 * 1024
            });

            const inputBuffer = Buffer.from(audioResponse.data);

            if (!inputBuffer.length) {
                throw new Error('❌ ملف الصوت طلع فاضي.');
            }

            console.log(
                `[اغنيه] Downloaded: ${(inputBuffer.length / 1024 / 1024).toFixed(2)} MB`
            );

            fs.writeFileSync(inputFile, inputBuffer);

            // تحويل إلى MP3 حقيقي
            console.log('[اغنيه] جاري تحويل الصوت إلى MP3...');

            await execFileAsync(
                'ffmpeg',
                [
                    '-y',
                    '-i', inputFile,
                    '-vn',
                    '-c:a', 'libmp3lame',
                    '-b:a', '192k',
                    '-ar', '44100',
                    '-ac', '2',
                    outputFile
                ],
                {
                    timeout: 300000,
                    maxBuffer: 10 * 1024 * 1024
                }
            );

            if (!fs.existsSync(outputFile)) {
                throw new Error('❌ FFmpeg فشل في إنشاء ملف MP3.');
            }

            const mp3Buffer = fs.readFileSync(outputFile);

            if (!mp3Buffer.length) {
                throw new Error('❌ ملف MP3 النهائي فاضي.');
            }

            console.log(
                `[اغنيه] MP3 Ready: ${(mp3Buffer.length / 1024 / 1024).toFixed(2)} MB`
            );

            // تنظيف اسم الملف
            const safeTitle = String(title)
                .replace(/[\\/:*?"<>|]/g, '_')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 100) || 'song';

            // إرسال الأغنية كملف صوت عادي
            await sock.sendMessage(
                chatId,
                {
                    audio: mp3Buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${safeTitle}.mp3`,
                    ptt: false
                },
                { quoted: m }
            );

            console.log('[اغنيه] ✅ تم إرسال الأغنية');

        } catch (err) {

            console.error(
                '[اغنيه] ❌',
                err?.response?.data || err?.message || err
            );

            await sock.sendMessage(chatId, {
                text:
                    `❌ حصلت مشكلة في تحميل الأغنية.\n\n` +
                    `🎵 ${query}\n\n` +
                    `الخطأ: ${err?.message || 'خطأ غير معروف'}`
            }, { quoted: m });

        } finally {

            // حذف الملفات المؤقتة
            try {
                fs.rmSync(tempDir, {
                    recursive: true,
                    force: true
                });
            } catch (e) {
                console.error('[اغنيه] Cleanup error:', e.message);
            }
        }
    }
};