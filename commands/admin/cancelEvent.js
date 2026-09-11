const { isParticipantAdmin, logAudit } = require('../../core/messageHandler.js');

// 🧩 الأمر ده بيلغي أي فعالية/مسابقة شغالة في الجروب، أيًا كان نوعها (أعلام،
// تخمين شخصية، تفكيك، فاكهة، تريفيا... إلخ) لأن كل الألعاب دي بتستخدم نفس
// المكان في الداتا بيس: db.puzzles[groupID]. فمسح المفتاح ده بيقفل أي لعبة
// شغالة فورًا، حتى لو حصل خطأ أو علقت الفعالية ومنعت باقي الألعاب تشتغل.
module.exports = {
    name: 'الغاء-فعالية',
    aliases: ['انهاء-فعالية', 'مسح-فعالية', 'الغاء-مسابقة'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const activeEvent = db.puzzles?.[groupID];
        if (!activeEvent) {
            return sock.sendMessage(groupID, { text: "📭 مفيش أي فعالية شغالة في هذا الجروب دلوقتي." }, { quoted: m });
        }

        delete db.puzzles[groupID];
        logAudit(db, groupID, "إلغاء فعالية يدويًا", sender, null);

        await sock.sendMessage(groupID, {
            text: `✅ تم إلغاء الفعالية الشغالة في الجروب.\n(كانت الإجابة الصحيحة: *${activeEvent.answer}*)`
        }, { quoted: m });
    }
};
