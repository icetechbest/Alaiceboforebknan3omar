const { transformToAssassin, isAssassin } = require('../../data/classSystem.js');
const { resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'تحمغتالت',
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(id, { text: "⚠️ هذا الأمر مخصص للمطور فقط!" }, { quoted: m });
        }

        // منشن اختياري: لو عايز تحول شخص تاني بدل نفسك (للتجربة)
        const target = resolveTargetJid(m, db, null, { fallbackTo: sender });

        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الشخص ده مش مسجل في المملكة." }, { quoted: m });
        }

        if (isAssassin(db[target])) {
            return sock.sendMessage(id, {
                text: `🥷 @${target.split('@')[0]} أصلاً مغتال.`,
                mentions: [target]
            }, { quoted: m });
        }

        // تجهيز الشروط كمُكتملة (توثيق فقط، من غير أي تأثير على تقدمه الحقيقي لو رجّعناه محارب تاني)
        db[target].assassinReq = { wins: true, gold: true, itemId: true };
        transformToAssassin(db, target);

        await sock.sendMessage(id, {
            text: `🛠️ *[أمر مطور]* تم تحويل @${target.split('@')[0]} إلى *مغتال* 🥷 مباشرةً بدون شروط (للتجربة فقط).`,
            mentions: [target]
        }, { quoted: m });
    }
};
