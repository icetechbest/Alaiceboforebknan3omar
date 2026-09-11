const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'بطولة-مواجهات',
    aliases: ['بطولة-pvp'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const sub = (args[0] || '').trim();
        db[groupID] ??= {};
        db[groupID].pvpTournament ??= {};

        if (sub === 'تعطيل' || sub === 'off') {
            db[groupID].pvpTournament.enabled = false;
            return sock.sendMessage(groupID, { text: "🔕 تم تعطيل بطولة الـ PVP الأسبوعية." }, { quoted: m });
        }

        db[groupID].pvpTournament.enabled = true;
        await sock.sendMessage(groupID, {
            text: "✅ تم تفعيل بطولة الـ PVP الأسبوعية.\n🏆 هيتم إعلان أعلى 3 لاعبين كل يوم جمعة الساعة 8 بالليل تلقائيًا."
        }, { quoted: m });
    }
};
