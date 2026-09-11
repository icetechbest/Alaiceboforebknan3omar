const { isParticipantAdmin } = require('../../core/messageHandler.js');

// بيتحقق من صيغة "YYYY-MM-DD HH:MM" ويرجع timestamp، أو null لو الصيغة غلط
function parseSchedule(dateStr, timeStr) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr);
    if (!match || !timeMatch) return null;
    const [, y, mo, d] = match;
    const [, h, mi] = timeMatch;
    const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0);
    if (isNaN(date.getTime())) return null;
    return date.getTime();
}

module.exports = {
    name: 'جدول-رسالة',
    aliases: ['جدولة-رسالة'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const dateStr = args[0];
        const timeStr = args[1];
        const text = args.slice(2).join(' ').trim();

        const time = dateStr && timeStr ? parseSchedule(dateStr, timeStr) : null;

        if (!time || !text) {
            return sock.sendMessage(groupID, {
                text: "📖 *طريقة الاستخدام:*\n.جدول-رسالة [YYYY-MM-DD] [HH:MM] [النص]\n\nمثال:\n.جدول-رسالة 2026-09-15 20:00 مساء الخير يا جماعة 👋"
            }, { quoted: m });
        }

        if (time <= Date.now()) {
            return sock.sendMessage(groupID, { text: "⚠️ الوقت ده فات بالفعل، اختار وقت في المستقبل." }, { quoted: m });
        }

        db.scheduledMessages ??= [];
        db.scheduledMessages.push({ id: Date.now(), groupID, text, time });

        await sock.sendMessage(groupID, {
            text: `✅ تم جدولة الرسالة، هتتبعت تلقائيًا في ${dateStr} الساعة ${timeStr}.`
        }, { quoted: m });
    }
};
