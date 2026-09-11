const { classTitle } = require('../../data/classSystem.js');
const { resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'مواجهة',
    aliases: ['تحدي', 'pvp'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const target = resolveTargetJid(m, db, null, {});

        if (!target) return sock.sendMessage(id, { text: "⚠️ لازم تمنشن المحارب اللي عايز تتحديه!" }, { quoted: m });
        if (target === sender) return sock.sendMessage(id, { text: "❌ ما ينفعش تتحدى نفسك!" }, { quoted: m });
        if (!db[sender] || !db[target]) return sock.sendMessage(id, { text: "❌ أحد الطرفين غير مسجل في المملكة." }, { quoted: m });

        // إنشاء نظام الطلبات في الداتابيز لو مش موجود
        if (!db.pvpRequests) db.pvpRequests = {};

        // تسجيل الطلب ووقت إرساله
        db.pvpRequests[target] = {
            challenger: sender,
            time: Date.now()
        };

        const msg = `⚔️ *تحدي مواجهة قتالية* ⚔️\n\n` +
                    `${classTitle(db[sender])} @${sender.split('@')[0]} أعلن الحرب على @${target.split('@')[0]}!\n\n` +
                    `📊 *النظام:* حسابي بحت (هجوم ضد دفاع).\n` +
                    `💰 *الرهان:* نصف ذهب الخاسر.\n\n` +
                    `⚠️ للقبول اكتب: *موافق*\n` +
                    `⚠️ للرفض اكتب: *رفض*`;

        await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });

        // مؤقت لحذف الطلب إذا لم يتم الرد
        setTimeout(() => {
            if (db.pvpRequests && db.pvpRequests[target] && db.pvpRequests[target].challenger === sender) {
                delete db.pvpRequests[target];
            }
        }, 60000);
    }
};
