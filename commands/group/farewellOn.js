const { isParticipantAdmin, DEFAULT_FAREWELL_MESSAGE } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تفعيل-وداع',
    aliases: ['تشغيل-وداع'],
    category: 'group',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].farewell ??= {};
        db[groupID].farewell.enabled = true;
        db[groupID].farewell.message ??= DEFAULT_FAREWELL_MESSAGE;

        await sock.sendMessage(groupID, {
            text: "✅ تم تفعيل رسالة الوداع للأعضاء اللي بيمشوا من هذا الجروب.\n" +
                  "💡 لتخصيص نص الرسالة استخدم: .رسالة-وداع [النص]"
        }, { quoted: m });
    }
};
