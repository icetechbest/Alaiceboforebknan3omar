const { isParticipantAdmin } = require('../../core/messageHandler.js');

// 🛡️ تفعيل/تعطيل نظام إشعارات حماية الأدمن (ترقية / تنزيل / طرد) في الجروب.
// النظام مفعّل افتراضيًا لأي جروب من غير ما حد يعمل حاجة.
module.exports = {
    name: 'حماية-الادمن',
    aliases: ['حماية-الادمنية', 'حماية-ادمن'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].adminGuard ??= { enabled: true };

        const sub = (args[0] || '').trim();
        if (sub === 'تعطيل' || sub === 'off') {
            db[groupID].adminGuard.enabled = false;
            return sock.sendMessage(groupID, { text: "🔕 تم تعطيل إشعارات حماية الأدمن (ترقية/تنزيل/طرد) في هذا الجروب." }, { quoted: m });
        }
        if (sub === 'تفعيل' || sub === 'on') {
            db[groupID].adminGuard.enabled = true;
            return sock.sendMessage(groupID, { text: "✅ تم تفعيل إشعارات حماية الأدمن." }, { quoted: m });
        }

        const status = db[groupID].adminGuard.enabled !== false;
        return sock.sendMessage(groupID, {
            text: `📖 *طريقة الاستخدام:*\n.حماية-الادمن تفعيل / تعطيل\n\n⚙️ الحالة الحالية: ${status ? 'مفعّل ✅' : 'معطّل 🔕'}\n\nلما يكون مفعّل، البوت بيبعت رسالة في الجروب فورًا لو:\n• حد اتعمله ترقية أدمن (وبمين اللي رقّاه لو معروف)\n• حد اتسحبت منه صلاحية الأدمن\n• حد اتطرد من الجروب (وبمين اللي طرده)`
        }, { quoted: m });
    }
};
