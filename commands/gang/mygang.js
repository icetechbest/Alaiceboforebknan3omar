module.exports = {
    name: "عصابتي",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const gang = Object.values(db.gangs || {}).find(g => g.members.includes(sender));

        if (!gang) return sock.sendMessage(groupID, { text: "⚠️ أنت مش عضو في أي عصابة حالياً." });

        let info = `🏰 *تـفـاصـيـل الـعـصـابـة* 🏰\n`;
        info += `━━━━━━━━━━━━━━━\n`;
        info += `🔹 *الاسم:* ${gang.name}\n`;
        info += `📝 *الوصف:* ${gang.description || 'لا يوجد'}\n`;
        info += `👑 *الزعيم:* @${gang.owner.split('@')[0]}\n`;
        info += `👥 *الأعضاء:* ${gang.members.length}\n`;
        info += `💰 *الخزنة:* ${gang.gold || 0} ذهبة\n`;
        info += `📈 *المستوى:* ${gang.level || 1}\n`;
        info += `━━━━━━━━━━━━━━━`;

        return sock.sendMessage(groupID, { text: info, mentions: [gang.owner] });
    }
};
