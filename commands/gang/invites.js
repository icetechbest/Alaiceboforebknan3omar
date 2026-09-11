module.exports = {
    name: "الدعوات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const invite = db.gangInvites?.[sender];

        if (!invite) return sock.sendMessage(groupID, { text: "⚠️ مفيش دعوات انضمام ليك حالياً." });

        return sock.sendMessage(groupID, { 
            text: `📩 عندك دعوة معلقة:\n\n🏰 العصابة: *${invite.gangName}*\n👤 من: @${invite.from.split('@')[0]}\n\nاكتب *.انضمام ${invite.gangName}* للقبول.`,
            mentions: [invite.from]
        });
    }
};
