const { isParticipantAdmin, MEDIA_TYPE_LABELS } = require('../../core/messageHandler.js');

const VALID_TYPES = Object.values(MEDIA_TYPE_LABELS); // ["صور", "فيديو", "ستيكرات", "مستندات", "صوت"]

module.exports = {
    name: 'اضف-فلتر-ميديا',
    aliases: ['ضيف-فلتر-ميديا', 'منع-ميديا'],
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
        if (!type || !VALID_TYPES.includes(type)) {
            return sock.sendMessage(groupID, {
                text: `📖 *طريقة الاستخدام:*\n.اضف-فلتر-ميديا [النوع]\n\nالأنواع المتاحة: ${VALID_TYPES.join('، ')}`
            }, { quoted: m });
        }

        db[groupID] ??= {};
        db[groupID].mediaFilter ??= {};
        db[groupID].mediaFilter.types ??= [];

        if (db[groupID].mediaFilter.types.includes(type)) {
            return sock.sendMessage(groupID, { text: `⚠️ نوع (${type}) متسجل بالفعل في قائمة الممنوعات.` }, { quoted: m });
        }

        db[groupID].mediaFilter.types.push(type);
        await sock.sendMessage(groupID, {
            text: `✅ تمت إضافة (${type}) لقائمة الميديا الممنوعة.\n💡 لو الفلتر لسه مش مفعّل، فعّله بـ .تفعيل-فلتر-الميديا`
        }, { quoted: m });
    }
};
