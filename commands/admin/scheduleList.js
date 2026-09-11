const { isParticipantAdmin } = require('../../core/messageHandler.js');

// نفس منطق تكوين التاريخ المستخدم وقت الجدولة في scheduleMessage.js (وقت السيرفر
// المحلي)، عشان التاريخ المعروض هنا يطابق بالظبط اللي الأدمن أدخله وقت الجدولة.
function formatDateTime(ts) {
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

module.exports = {
    name: 'الرسائل-المجدولة',
    aliases: ['عرض-الجدول', 'جدول-الرسائل'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const list = (db.scheduledMessages || [])
            .filter(item => item.groupID === groupID)
            .sort((a, b) => a.time - b.time);

        if (list.length === 0) {
            return sock.sendMessage(groupID, { text: "📭 مفيش رسائل مجدولة في هذا الجروب حاليًا.\nجدول رسالة بـ .جدول-رسالة [YYYY-MM-DD] [HH:MM] [النص]" }, { quoted: m });
        }

        let msg = `🗓️ *الرسائل المجدولة في هذا الجروب*\n━━━━━━━━━━━━━━━━━━\n`;
        for (const item of list) {
            const preview = item.text.length > 60 ? item.text.slice(0, 60) + '…' : item.text;
            msg += `🆔 #${item.id}\n⏰ ${formatDateTime(item.time)}\n💬 ${preview}\n\n`;
        }
        msg += `━━━━━━━━━━━━━━━━━━\nلإلغاء رسالة: .الغاء-جدول [رقم الـ ID]`;

        await sock.sendMessage(groupID, { text: msg }, { quoted: m });
    }
};
