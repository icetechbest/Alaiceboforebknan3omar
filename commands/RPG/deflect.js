const {
    isAssassin,
    hasActiveDeflect,
    DEFLECT_COOLDOWN_MS,
    DEFLECT_WINDOW_MS
} = require('../../data/classSystem.js');

module.exports = {
    name: 'صد',
    aliases: ['تصدي'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        if (!user) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        // ⚠️ الرفض عام وغير محدد عشان الأمر ميبقاش وسيلة لكشف فئة أي حد
        if (isAssassin(user)) {
            return sock.sendMessage(id, {
                text: "❌ الأمر ده مش متاح لفئتك الحالية."
            }, { quoted: m });
        }

        const now = Date.now();

        if (hasActiveDeflect(user)) {
            const remainingActive = user.deflectExpiresAt - now;
            const minutes = Math.ceil(remainingActive / 60000);
            return sock.sendMessage(id, {
                text: `🛡️ وضع التصدي عندك شغال بالفعل! هيفضل شغال لمدة ${minutes} دقيقة كمان.`
            }, { quoted: m });
        }

        if (user.lastDeflectUsed && now - user.lastDeflectUsed < DEFLECT_COOLDOWN_MS) {
            const remaining = DEFLECT_COOLDOWN_MS - (now - user.lastDeflectUsed);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return sock.sendMessage(id, {
                text: `⌛ درعك محتاج وقت يستعيد قوته... تقدر تستخدم *.صد* تاني بعد [ ${hours}س و ${minutes}د ]`
            }, { quoted: m });
        }

        user.deflectActive = true;
        user.deflectExpiresAt = now + DEFLECT_WINDOW_MS;
        user.lastDeflectUsed = now;

        const minutes = Math.round(DEFLECT_WINDOW_MS / 60000);
        await sock.sendMessage(id, {
            text: `🛡️ *وضع التصدي مفعّل!* 🛡️\n━━━━━━━━━━━━━━━━━━━━\nأي محاولة كمين ضدك خلال ${minutes} دقيقة القادمة هتتصد تلقائياً بالكامل، وهتُستهلك بعد أول محاولة.\n━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: m });
    }
};
