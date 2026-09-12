const { resolveTargetJid, logAudit, isParticipantAdmin } = require('../../core/messageHandler.js');
module.exports = {
    name: 'طرد',
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(id);
        // ⚠️ الفحص القديم كان بيقارن p.id === m.key.participant مباشرة، وده بيفشل
        // لو العضو مسجل بصيغة @lid في groupMetadata بينما sender اتحل لرقمه الحقيقي
        // (أو العكس) — يعني أدمن حقيقي كان ممكن ياخد "هذا الأمر للأدمن فقط" غلط.
        // isParticipantAdmin بتتعامل مع الحالتين، وكمان ضفنا استثناء المطور (isOwner).
        const isAdmin = isParticipantAdmin(groupMetadata, sender, db);

        if (!isAdmin && !isOwner) return sock.sendMessage(id, { text: "⚠️ هذا الأمر للأدمن فقط!" });

        const target = resolveTargetJid(m, db, groupMetadata, {});
        if (!target) return sock.sendMessage(id, { text: "⚠️ منشن الشخص اللي عايز تطرده." });

        await sock.groupParticipantsUpdate(id, [target], "remove");
        logAudit(db, id, "طرد يدوي", sender, target);
        await sock.sendMessage(id, { text: "✅ تم طرد العضو بنجاح من المملكة." });
    }
};

