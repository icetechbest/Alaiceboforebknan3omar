const {
    isAssassin,
    isArcher,
    revertToWarrior,
    REPENT_COST
} = require('../../data/classSystem.js');

module.exports = {
    name: 'توبة',
    aliases: ['اعتزال'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        if (!user) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        const wasAssassin = isAssassin(user);
        const wasArcher = isArcher(user);

        // ⚠️ رفض عام حتى لا يكشف الأمر نفسه هوية أي حد (محارب أصلاً محتاجش توبة)
        if (!wasAssassin && !wasArcher) {
            return sock.sendMessage(id, {
                text: "❌ الأمر ده مش متاح لفئتك الحالية."
            }, { quoted: m });
        }

        if ((user.gold || 0) < REPENT_COST) {
            return sock.sendMessage(id, {
                text: `💰 التوبة محتاجة ${REPENT_COST.toLocaleString()} ذهب، ومعاك حالياً ${((user.gold || 0)).toLocaleString()} بس.`,
                mentions: [sender]
            }, { quoted: m });
        }

        user.gold -= REPENT_COST;
        revertToWarrior(db, sender);

        if (wasArcher) {
            // الرامي فئة علنية، مفيش داعي لإخفاء التفاصيل
            await sock.sendMessage(id, {
                text: `🕊️ @${sender.split('@')[0]} ترك قوسه جانباً وقرر يرجع محارب عادي.`,
                mentions: [sender]
            }, { quoted: m });
        } else {
            // المغتال فئة سرية - رسالة الجروب غامضة عمداً
            await sock.sendMessage(id, {
                text: `🕊️ @${sender.split('@')[0]} مر بتحول روحي وقرر يعيد بناء نفسه من جديد...`,
                mentions: [sender]
            }, { quoted: m });
        }

        const dagger = wasAssassin
            ? `\n🗡️ الخنجر المسموم لسه معاك، لو حبيت ترجع مغتال تاني محتاج بس تحقق شرطي الانتصارات والذهب من جديد.`
            : `\n🏹 القوس لسه معاك، لو حبيت ترجع رامي تاني محتاج بس تحقق شرطي الصيد والذهب من جديد.`;

        await sock.sendMessage(id, {
            text: `🕊️ *تمت التوبة* 🕊️\n━━━━━━━━━━━━━━━━━━━━\n` +
                  `@${sender.split('@')[0]} رجع *محارب* عادي، وقواه اتعدّلت زي ما كانت تقريباً.${dagger}\n` +
                  `━━━━━━━━━━━━━━━━━━━━`,
            mentions: [sender]
        }, { quoted: m });
    }
};
