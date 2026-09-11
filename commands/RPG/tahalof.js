const { isAssassin, requestAlliance } = require('../../data/classSystem.js');
const { resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تحالف',
    aliases: ['تحالف_الظل'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        if (!user) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        // ⚠️ الرفض عام حتى لا يفضح الأمر نفسه هوية أي حد
        if (!isAssassin(user)) {
            return sock.sendMessage(id, { text: "❌ الأمر ده مش متاح لفئتك الحالية." }, { quoted: m });
        }

        const target = resolveTargetJid(m, db, null, {});
        if (!target) {
            return sock.sendMessage(id, { text: "🌑 لازم تمنشن الشخص اللي عايز تبعتله إشارة سرية." }, { quoted: m });
        }
        if (target === sender) {
            return sock.sendMessage(id, { text: "❌ ما ينفعش تتحالف مع نفسك!" }, { quoted: m });
        }
        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الشخص ده مش مسجل في المملكة." }, { quoted: m });
        }

        // ⚠️ النتيجة دايماً نفس الرسالة الغامضة، سواء اتفعل تحالف فعلي أو
        // لأ، عشان محدش يعرف حد تاني مغتال ولا لأ من رد الأمر نفسه.
        requestAlliance(db, sender, target);

        await sock.sendMessage(id, {
            text: `🌑 تم إرسال إشارة سرية إلى @${target.split('@')[0]}... لو الطرفين موجودين هيتفعل تحالف الظل تلقائياً.`,
            mentions: [target]
        }, { quoted: m });
    }
};
