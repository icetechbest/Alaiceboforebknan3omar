const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'سجل-الاحداث',
    aliases: ['سجل-الأحداث'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const log = db[groupID]?.auditLog || [];
        if (log.length === 0) {
            return sock.sendMessage(groupID, { text: "📭 مفيش أي أحداث مسجلة في هذا الجروب لسه." }, { quoted: m });
        }

        const last15 = log.slice(-15).reverse();
        const mentions = [];
        let msg = `📜 *سجل آخر ${last15.length} حدث في الجروب*\n━━━━━━━━━━━━━━━━━━\n`;

        for (const entry of last15) {
            const date = new Date(entry.at).toLocaleString('ar-EG');
            const byLabel = entry.by?.endsWith?.('@s.whatsapp.net') ? `@${entry.by.split('@')[0]}` : entry.by;
            const targetLabel = entry.target?.endsWith?.('@s.whatsapp.net') ? `@${entry.target.split('@')[0]}` : (entry.target || '-');
            if (entry.by?.endsWith?.('@s.whatsapp.net')) mentions.push(entry.by);
            if (entry.target?.endsWith?.('@s.whatsapp.net')) mentions.push(entry.target);

            msg += `🔸 *${entry.action}*\n👤 بواسطة: ${byLabel} | 🎯 الهدف: ${targetLabel}\n🕒 ${date}\n\n`;
        }

        await sock.sendMessage(groupID, { text: msg.trim(), mentions: [...new Set(mentions)] }, { quoted: m });
    }
};
