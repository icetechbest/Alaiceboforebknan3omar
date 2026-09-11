module.exports = {
    name: "خزنة",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const gang = Object.values(db.gangs || {}).find(g => g.members.includes(sender));

        if (!gang) return sock.sendMessage(groupID, { text: "⚠️ أنت لست في عصابة." });

        return sock.sendMessage(groupID, { 
            text: `🏦 *خزينة عصابة [ ${gang.name} ]*\n━━━━━━━━━━━━━━━\n💰 الرصيد الحالي: ${Number(gang.gold || 0).toLocaleString()} ذهبة\n📈 المستوى: ${gang.level || 1}\n👑 المالك: @${gang.owner.split('@')[0]}`,
            mentions: [gang.owner]
        });
    }
};
