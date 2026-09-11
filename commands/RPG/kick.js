const { resolveTargetJid, logAudit } = require('../../core/messageHandler.js');
module.exports = {
    name: 'طرد',
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(id);
        const isAdmin = groupMetadata.participants.find(p => p.id === m.key.participant)?.admin;
        
        if (!isAdmin) return sock.sendMessage(id, { text: "⚠️ هذا الأمر للأدمن فقط!" });

        const target = resolveTargetJid(m, db, groupMetadata, {});
        if (!target) return sock.sendMessage(id, { text: "⚠️ منشن الشخص اللي عايز تطرده." });

        await sock.groupParticipantsUpdate(id, [target], "remove");
        logAudit(db, id, "طرد يدوي", m.key.participant || sender, target);
        await sock.sendMessage(id, { text: "✅ تم طرد العضو بنجاح من المملكة." });
    }
};

