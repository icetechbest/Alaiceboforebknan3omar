const { STAT_TYPES, resolveTarget, statTypesList } = require('../../data/statAdmin.js');
const { ensurePlayerDefaults } = require('../../data/classSystem.js');

module.exports = {
    name: 'خصم',
    aliases: ['نقص_ذهب', 'انقاص'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر مخصص للملاك فقط!" }, { quoted: m });
        }

        const typeArg = args[0];
        const amountArg = args[1];

        const stat = STAT_TYPES[typeArg];
        if (!stat) {
            return sock.sendMessage(id, {
                text: `⚠️ الاستخدام: *.خصم [النوع] [القيمة] @منشن*\nالأنواع المتاحة: ${statTypesList()}\nمثال: *.خصم ذهب 5000 @فلان*`
            }, { quoted: m });
        }

        const amount = parseInt(amountArg);
        if (!amount || amount <= 0) {
            return sock.sendMessage(id, { text: "⚠️ اكتب رقم صحيح وموجب للقيمة اللي عايز تشيلها." }, { quoted: m });
        }

        const target = resolveTarget(m, sender, db);
        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الشخص ده مش مسجل في المملكة." }, { quoted: m });
        }
        ensurePlayerDefaults(db[target]);

        const user = db[target];
        const before = user[stat.field] || 0;
        user[stat.field] = Math.max(0, before - amount);
        const actualRemoved = before - user[stat.field];

        const msg = `✅ *[أمر مطور]* تم الخصم بنجاح\n━━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 اللاعب: @${target.split('@')[0]}\n` +
                    `${stat.label}: -${actualRemoved.toLocaleString()}\n` +
                    `📊 الرصيد الجديد: ${user[stat.field].toLocaleString()}\n━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(id, { text: msg, mentions: [target] }, { quoted: m });
    }
};
