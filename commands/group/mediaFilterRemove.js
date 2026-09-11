const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'شيل-فلتر-ميديا',
    aliases: ['حذف-فلتر-ميديا'],
    category: 'group',
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const type = args.join(' ').trim();
        const types = db[groupID]?.mediaFilter?.types || [];
        const idx = types.indexOf(type);

        if (!type || idx === -1) {
            return sock.sendMessage(groupID, {
                text: `⚠️ (${type || '؟'}) مش موجود في قائمة الميديا الممنوعة.\nالقائمة الحالية: ${types.length ? types.join('، ') : 'فاضية'}`
            }, { quoted: m });
        }

        types.splice(idx, 1);
        await sock.sendMessage(groupID, { text: `✅ تم شيل (${type}) من قائمة الميديا الممنوعة.` }, { quoted: m });
    }
};
