module.exports = {
    name: 'الجروب',
    aliases: ['جروب'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;
        if (!id.endsWith('@g.us')) return sock.sendMessage(id, { text: "🚫 هذا الأمر للمجموعات فقط!" });

        const groupMetadata = await sock.groupMetadata(id);
        const participantInfo = groupMetadata.participants.find(p => p.id === sender);
        const isAdmin = participantInfo?.admin === 'admin' || participantInfo?.admin === 'superadmin';

        if (!isAdmin && !isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر للمشرفين أو المالك فقط!" });
        }

        if (args[0] === 'قفل') {
            await sock.groupSettingUpdate(id, 'announcement');
            await sock.sendMessage(id, { text: "🔒 تم قفل الجروب (للأدمن فقط)." });
        } else if (args[0] === 'فتح') {
            await sock.groupSettingUpdate(id, 'not_announcement');
            await sock.sendMessage(id, { text: "🔓 تم فتح الجروب للجميع." });
        } else {
            await sock.sendMessage(id, { text: "📖 الاستخدام: *.الجروب قفل* أو *.الجروب فتح*" });
        }
    }
};
