const { getStealSettings } = require('../../data/stealSettings.js');

module.exports = {
    name: 'اعدادات-سرقة',
    aliases: ['تحكم-سرقة', 'اعدادات_سرقة'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        if (!isOwner) {
            return sock.sendMessage(id, { text: "🚫 هذا الأمر مخصص للملاك فقط!" }, { quoted: m });
        }

        const settings = getStealSettings(db);
        const sub = args[0];

        // من غير أي باراميتر: اعرض الإعدادات الحالية
        if (!sub) {
            const msg = `⚙️ *إعدادات أمر السرقة* ⚙️\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `📡 الحالة: ${settings.enabled ? '🟢 مفتوح' : '🔴 مقفول'}\n` +
                        `🎯 نسبة النجاح الأساسية: ${settings.successRate}%\n` +
                        `💰 نسبة السرقة عند النجاح: ${settings.stealPct}%\n` +
                        `💸 غرامة الفشل: ${settings.failPenaltyPct}%\n` +
                        `⏳ الكولداون: ${Math.round(settings.cooldownMs / 60000)} دقيقة\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n` +
                        `الاستخدام:\n` +
                        `*.اعدادات-سرقة فتح* - لفتح الأمر\n` +
                        `*.اعدادات-سرقة قفل* - لقفل الأمر\n` +
                        `*.اعدادات-سرقة نسبة [1-100]* - لتغيير نسبة النجاح`;
            return sock.sendMessage(id, { text: msg }, { quoted: m });
        }

        if (sub === 'فتح') {
            settings.enabled = true;
            return sock.sendMessage(id, { text: "🟢 تم فتح أمر السرقة، اللاعبين يقدروا يستخدموه دلوقتي." }, { quoted: m });
        }

        if (sub === 'قفل') {
            settings.enabled = false;
            return sock.sendMessage(id, { text: "🔴 تم قفل أمر السرقة، محدش هيقدر يستخدمه لحد ما تفتحه تاني." }, { quoted: m });
        }

        if (sub === 'نسبة') {
            const rate = parseInt(args[1]);
            if (isNaN(rate) || rate < 1 || rate > 100) {
                return sock.sendMessage(id, { text: "⚠️ اكتب رقم من 1 لـ 100.\nمثال: *.اعدادات-سرقة نسبة 40*" }, { quoted: m });
            }
            settings.successRate = rate;
            return sock.sendMessage(id, { text: `🎯 تم تغيير نسبة نجاح السرقة الأساسية إلى ${rate}%.` }, { quoted: m });
        }

        await sock.sendMessage(id, {
            text: "⚠️ أمر غير معروف. استخدم: فتح / قفل / نسبة [رقم]"
        }, { quoted: m });
    }
};
