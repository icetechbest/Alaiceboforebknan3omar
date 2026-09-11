const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'ضبط-الفلود',
    aliases: ['اعدادات-الفلود'],
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
        db[groupID].antiFlood ??= { enabled: true, limit: 8, seconds: 10, muteMinutes: 1 };

        const sub = (args[0] || '').trim();
        if (sub === 'تعطيل' || sub === 'off') {
            db[groupID].antiFlood.enabled = false;
            return sock.sendMessage(groupID, { text: "🔕 تم تعطيل نظام الأنتي-فلود في هذا الجروب." }, { quoted: m });
        }
        if (sub === 'تفعيل' || sub === 'on') {
            db[groupID].antiFlood.enabled = true;
            return sock.sendMessage(groupID, { text: "✅ تم تفعيل نظام الأنتي-فلود." }, { quoted: m });
        }

        const limit = parseInt(args[0], 10);
        const seconds = parseInt(args[1], 10);
        const muteMinutes = parseInt(args[2], 10);

        if (!limit || !seconds || !muteMinutes) {
            const cfg = db[groupID].antiFlood;
            return sock.sendMessage(groupID, {
                text: `📖 *طريقة الاستخدام:*\n.ضبط-الفلود [عدد الرسائل] [الثواني] [مدة الكتم بالدقايق]\nمثال: .ضبط-الفلود 8 10 1\n\nأوامر تانية:\n.ضبط-الفلود تفعيل / تعطيل\n\n⚙️ الإعدادات الحالية:\nحد الرسائل: ${cfg.limit} خلال ${cfg.seconds}ث، مدة الكتم: ${cfg.muteMinutes} دقيقة، الحالة: ${cfg.enabled ? 'مفعّل ✅' : 'معطّل 🔕'}`
            }, { quoted: m });
        }

        db[groupID].antiFlood = { enabled: true, limit, seconds, muteMinutes };
        await sock.sendMessage(groupID, {
            text: `✅ تم ضبط الأنتي-فلود: أكتر من ${limit} رسالة خلال ${seconds} ثانية = كتم ${muteMinutes} دقيقة.`
        }, { quoted: m });
    }
};
