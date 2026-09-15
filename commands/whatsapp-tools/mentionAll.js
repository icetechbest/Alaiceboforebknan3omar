// .منشن-الكل <رسالة اختياري>
// بيعمل تاج لكل أعضاء الجروب. للأدمن بس، عشان يستخدموه في إعلانات مهمة بس
// (منعًا للسبام). لو مفيش نص بعد الأمر، بيتبعت بنص افتراضي.
const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'منشن-الكل',
    aliases: ['تاج-الكل', 'منشن-جميع'],
    category: 'whatsapp-tools',
    async execute(sock, m, args, db, sender, isOwner) {
        const chatId = m.key.remoteJid;
        if (!chatId.endsWith('@g.us')) {
            return sock.sendMessage(chatId, { text: '⚠️ الأمر ده يشتغل في الجروبات بس.' }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(chatId).catch(() => null);
        if (!groupMetadata) {
            return sock.sendMessage(chatId, { text: '❌ تعذر جلب بيانات الجروب، حاول تاني.' }, { quoted: m });
        }

        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(chatId, { text: '❌ الأمر ده لأدمن الجروب فقط.' }, { quoted: m });
        }

        const customText = args.join(' ').trim();
        const participants = groupMetadata.participants || [];

        let text = `📢 *${customText || 'تنبيه للجميع'}*\n━━━━━━━━━━━━━━━━━━\n`;
        for (const p of participants) {
            text += `👤 @${p.id.split('@')[0]}\n`;
        }
        text += `━━━━━━━━━━━━━━━━━━\n👥 عدد الأعضاء: ${participants.length}`;

        await sock.sendMessage(chatId, {
            text,
            mentions: participants.map(p => p.id)
        }, { quoted: m });
    }
};
