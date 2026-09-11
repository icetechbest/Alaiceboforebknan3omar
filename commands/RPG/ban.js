const { resolveTargetJid } = require('../../core/messageHandler.js');
module.exports = {
    name: 'حظر',
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        if (!isOwner) return;

        const target = resolveTargetJid(m, db, null, {});
        if (!target) return sock.sendMessage(id, { text: "⚠️ منشن الشخص لطرده من المملكة وحظره." });

        if (!db.banned) db.banned = [];
        
        if (!db.banned.includes(target)) {
            db.banned.push(target);
            await sock.sendMessage(id, { text: `🚫 تم نفي @${target.split('@')[0]} وحظره من استخدام البوت.`, mentions: [target] });
        } else {
            await sock.sendMessage(id, { text: "👤 الشخص محظور مسبقاً." });
        }
    }
};
