const { isParticipantAdmin, logAudit } = require('../../core/messageHandler.js');

module.exports = {
    name: 'الغاء-جدول',
    aliases: ['حذف-جدول', 'الغاء-رسالة-مجدولة'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const targetId = parseInt(args[0], 10);
        if (!targetId) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.الغاء-جدول [رقم الـ ID]\n\nشوف كل الرسائل المجدولة وأرقامها بـ .الرسائل-المجدولة"
            }, { quoted: m });
        }

        db.scheduledMessages ??= [];
        const index = db.scheduledMessages.findIndex(item => item.id === targetId && item.groupID === groupID);
        if (index === -1) {
            return sock.sendMessage(groupID, { text: "❌ مفيش رسالة مجدولة بالرقم ده في هذا الجروب (يمكن اتبعتت أو اتلغت بالفعل)." }, { quoted: m });
        }

        const [removed] = db.scheduledMessages.splice(index, 1);
        logAudit(db, groupID, "إلغاء رسالة مجدولة", sender, null);

        const preview = removed.text.length > 60 ? removed.text.slice(0, 60) + '…' : removed.text;
        await sock.sendMessage(groupID, { text: `✅ تم إلغاء الرسالة المجدولة #${removed.id}:\n💬 ${preview}` }, { quoted: m });
    }
};
