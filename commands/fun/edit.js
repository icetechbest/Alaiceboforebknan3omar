const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const sentVideos = new Set();

// كانت المحاولة الأولى بتنادي API طرف تالت (apis-starlights-team.koyeb.app)
// اللي بقى واقع/بطيء، فده كان بيخلي الأمر يفشل في كل مرة قبل ما يوصل حتى
// لمحاولة يوتيوب. استبدلناه بمناداة tikwm.com مباشرة (نفس المصدر اللي بيرجع
// روابط الفيديو أصلًا، من غير وسيط زيادة ممكن يقع أو يبقى بطيء).
async function searchTiktok(searchText) {
    const { data } = await axios.get('https://www.tikwm.com/api/feed/search', {
        params: { keywords: searchText, count: 10 },
        timeout: 15000
    });

    const results = data?.data?.videos;
    if (!Array.isArray(results) || results.length === 0) return null;

    const fresh = results.filter(v => !sentVideos.has(v.play));
    const vid = fresh.length > 0 ? fresh[0] : results[0];
    if (!vid?.play) return null;

    sentVideos.add(vid.play);
    return vid.play;
}

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

        // المحاولة الأولى: بحث تيك توك مباشر عبر tikwm
        try {
            const videoUrl = await searchTiktok(searchText);
            if (videoUrl) {
                return await sock.sendMessage(chatId, {
                    video: { url: videoUrl },
                    caption: `╔═══•『 𝐀𝐍𝐈𝐌𝐄 𝐄𝐃𝐈𝐓 』•══╗\n🎬 *ايديت:* *${query || 'عشوائي'}*\n📱 المصدر: TikTok\n╚════•『 𝐒𝐎𝐍𝐆 𝐁𝐎𝐓 』•═══╝`
                }, { quoted: m });
            }
            console.warn('[ايديت] تيك توك: مفيش نتائج، بجرب يوتيوب...');
        } catch (err) {
            // بنطبع رسالة الخطأ الحقيقية بدل تحذير عام، عشان لو المشكلة استمرت
            // تبقى واضحة في اللوج ليه (رابط واقع، تايم اوت، تغيير في شكل الرد..)
            console.error('[ايديت] خطأ تيك توك:', err.message);
        }

        // المحاولة الثانية: YouTube (عبر yt-dlp) في حال فشل TikTok
        try {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'song-edit-'));
            const outPath = path.join(tmpDir, 'video.%(ext)s');

            // --extractor-args ده الحل المعروف لمشكلة "Sign in to confirm you're
            // not a bot" اللي يوتيوب بقى بيوقفها قدام أي طلب جاي من سيرفر/كلاود
            // (زي Railway) لما يحاول ياخد الفيديو كـ "متصفح عادي". طلب الفيديو
            // بشكل تطبيق أندرويد/تيفي بدل الموقع نفسه بيتخطى القيد ده غالبًا.
            execSync(
                `yt-dlp "ytsearch1:${searchText}" -f mp4 -o "${outPath}" --quiet --no-warnings ` +
                `--extractor-args "youtube:player_client=android,tv,web"`,
                { stdio: ['ignore', 'ignore', 'pipe'] }
            );

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

            fs.rmSync(tmpDir, { recursive: true, force: true });
            throw new Error('yt-dlp لم يرجع أي ملف فيديو.');
        } catch (err) {
            // err.stderr موجودة لو الفشل كان من execSync نفسه (بترجع Buffer)
            const detail = err.stderr ? err.stderr.toString() : err.message;
            console.error('[ايديت] خطأ يوتيوب:', detail);
            await sock.sendMessage(chatId, {
                text: `❌ عذراً، تعذر العثور على الفيديو المطلوب حالياً لـ *SONG BOT*.\nتأكد من كتابة اسم الأنمي بشكل صحيح.`
            }, { quoted: m });
        }
    }
};
