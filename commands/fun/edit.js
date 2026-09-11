const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sentVideos = new Set();

module.exports = {
    name: 'ايديت',
    aliases: ['edit', 'فيديو'],
    category: 'media',
    async execute(sock, m, args, db, sender) {
        const chatId = m.key.remoteJid;
        const query = args.join(' ');
        const searchText = query ? `anime edit ${query}` : 'anime edit';

        // تفاعل بالايموجي لبيان أن البوت استلم الأمر
        await sock.sendMessage(chatId, { react: { text: '🎬', key: m.key } });

        // رسالة الانتظار بتنسيق SONG BOT
        await sock.sendMessage(chatId, {
            text: `╔═══•『 𝐒𝐎𝐍𝐆 𝐄𝐃𝐈𝐓 』•══╗\n*💫 جارٍ جلب أفضل ايديت لك..*\n╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
        }, { quoted: m });

        // المحاولة الأولى: TikTok API
        try {
            const { data } = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${encodeURIComponent(searchText)}`);
            const results = data.data;

            if (results && results.length > 0) {
                // تصفية الفيديوهات التي لم تُرسل من قبل لتجنب التكرار
                const fresh = results.filter(v => !sentVideos.has(v.nowm));
                const vid = fresh.length > 0 ? fresh[0] : results[0];
                sentVideos.add(vid.nowm);

                return await sock.sendMessage(chatId, {
                    video: { url: vid.nowm },
                    caption: `╔═══•『 𝐀𝐍𝐈𝐌𝐄 𝐄𝐃𝐈𝐓 』•══╗\n🎬 *ايديت:* *${query || 'عشوائي'}*\n📱 المصدر: TikTok\n╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
                }, { quoted: m });
            }
        } catch (err) {
            console.warn('TikTok API Error, switching to YouTube...');
        }

        // المحاولة الثانية: YouTube (عبر yt-dlp) في حال فشل TikTok
        try {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'song-edit-'));
            const outPath = path.join(tmpDir, 'video.%(ext)s');
            
            // استخدام yt-dlp للبحث وتحميل الفيديو
            execSync(`yt-dlp "ytsearch1:${searchText}" -f mp4 -o "${outPath}" --quiet --no-warnings`);

            const files = fs.readdirSync(tmpDir).filter(file => file.endsWith('.mp4'));
            if (files.length > 0) {
                const videoPath = path.join(tmpDir, files[0]);
                await sock.sendMessage(chatId, {
                    video: fs.readFileSync(videoPath),
                    caption: `╔═══•『 𝐀𝐍𝐈𝐌𝐄 𝐄𝐃𝐈𝐓 』•══╗\n🎬 *ايديت:* *${query || 'عشوائي'}*\n📺 المصدر: YouTube\n╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
                }, { quoted: m });
                
                // تنظيف الملفات المؤقتة بعد الإرسال
                return fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        } catch (err) {
            console.error('YouTube Error:', err.message);
            await sock.sendMessage(chatId, {
                text: `❌ عذراً، تعذر العثور على الفيديو المطلوب حالياً لـ *SONG BOT*.\nتأكد من كتابة اسم الأنمي بشكل صحيح.`
            }, { quoted: m });
        }
    }
};
