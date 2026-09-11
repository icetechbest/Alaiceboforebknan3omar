module.exports = {
    name: 'arise',
    aliases: ['استدعاء', 'نيدو'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // 1. التأكد أن الأمر يُستخدم في مجموعة
        if (!id.endsWith('@g.us')) return;

        // 2. جلب بيانات المجموعة والأعضاء
        const groupMetadata = await sock.groupMetadata(id);
        const participants = groupMetadata.participants;

        // 3. التحقق من الصلاحيات (يجب أن يكون مشرفاً أو المالك)
        const isAdmins = participants.filter(v => v.admin !== null).map(v => v.id);
        const isAdmin = isAdmins.includes(sender) || isOwner;

        if (!isAdmin) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر خاص بالمشرفين فقط!" }, { quoted: m });
        }

        // 4. إعداد المنشن لجميع الأعضاء
        const jids = participants.map(v => v.id);
        
        const message = "𝐒𝐔𝐍𝐆 𝐉𝐈𝐍 𝐖𝐎𝐎 𝐈𝐒 𝐂𝐀𝐋𝐋𝐈𝐍𝐆 𝐘𝐎𝐔";

        // 5. إرسال الرسالة مع المنشن
        await sock.sendMessage(id, {
            text: message,
            mentions: jids
        }, { quoted: m });
    }
};
