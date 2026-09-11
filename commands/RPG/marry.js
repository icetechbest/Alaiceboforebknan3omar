const { resolveTargetJid } = require('../../core/messageHandler.js');
module.exports = {
    name: 'تزوج',
    aliases: ['زواج', 'خطوبة'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const mentionedJid = resolveTargetJid(m, db, null, {});

        // 1. التحقق من المنشن
        if (!mentionedJid) {
            return sock.sendMessage(id, { text: "⚠️ يجب أن تقوم بعمل منشن للشخص الذي تريد الزواج منه!\nمثال: *.تزوج @شخص*" }, { quoted: m });
        }

        if (mentionedJid === sender) {
            return sock.sendMessage(id, { text: "🧐 هل تحاول الزواج من نفسك؟ هذا غير ممكن هنا!" }, { quoted: m });
        }

        // 2. التحقق مما إذا كان أحدهما متزوجاً بالفعل
        if (db[sender]?.married) {
            return sock.sendMessage(id, { text: `❌ أنت متزوج بالفعل من @${db[sender].married.split('@')[0]}!`, mentions: [db[sender].married] }, { quoted: m });
        }
        if (db[mentionedJid]?.married) {
            return sock.sendMessage(id, { text: `❌ هذا الشخص متزوج بالفعل من @${db[mentionedJid].married.split('@')[0]}!`, mentions: [db[mentionedJid].married] }, { quoted: m });
        }

        // 3. إنشاء طلب زواج في قاعدة البيانات (مؤقت)
        if (!db.marryRequests) db.marryRequests = {};
        db.marryRequests[mentionedJid] = {
            from: sender,
            time: Date.now()
        };

        await sock.sendMessage(id, {
            text: `💕 @${sender.split('@')[0]} قدم طلب زواج لـ @${mentionedJid.split('@')[0]}\n\nللرد، اكتب:\n✅ *موافق*\n❌ *رفض*\n\n⚠️ الطلب صالح لمدة 60 ثانية.`,
            mentions: [sender, mentionedJid]
        }, { quoted: m });

        // مؤقت لحذف الطلب إذا لم يتم الرد
        setTimeout(() => {
            if (db.marryRequests && db.marryRequests[mentionedJid]) {
                delete db.marryRequests[mentionedJid];
            }
        }, 60000);
    }
};
