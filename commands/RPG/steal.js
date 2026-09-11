const { getStealSettings } = require('../../data/stealSettings.js');
const { getDefenseResistance, isNewPlayerProtected, ensurePlayerDefaults } = require('../../data/classSystem.js');
const { resolveTargetJid } = require('../../core/messageHandler.js');
const { checkAchievements } = require('../../data/achievements.js');

module.exports = {
    name: 'سرقة',
    aliases: ['اسرق'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const attacker = db[sender];

        if (!attacker) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }
        ensurePlayerDefaults(attacker);

        const settings = getStealSettings(db);
        if (!settings.enabled) {
            return sock.sendMessage(id, { text: "🔒 أمر السرقة مقفول حالياً من المطور." }, { quoted: m });
        }

        const target = resolveTargetJid(m, db, null, {});
        if (!target) {
            return sock.sendMessage(id, { text: "🖐️ لازم تمنشن الهدف اللي عايز تسرقه!" }, { quoted: m });
        }
        if (target === sender) {
            return sock.sendMessage(id, { text: "❌ ما ينفعش تسرق نفسك!" }, { quoted: m });
        }
        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الهدف ده مش مسجل في المملكة." }, { quoted: m });
        }
        const targetUser = db[target];
        ensurePlayerDefaults(targetUser);

        if (isNewPlayerProtected(targetUser)) {
            return sock.sendMessage(id, {
                text: `🛡️ @${target.split('@')[0]} لسه لاعب جديد ومحمي من السرقة لمدة 24 ساعة من تسجيله.`,
                mentions: [target]
            }, { quoted: m });
        }

        // --- الكولداون ---
        const now = Date.now();
        if (attacker.lastSteal && now - attacker.lastSteal < settings.cooldownMs) {
            const remaining = settings.cooldownMs - (now - attacker.lastSteal);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return sock.sendMessage(id, {
                text: `⌛ إيدك لسه محتاجة راحة... السرقة التالية بعد [ ${hours}س و ${minutes}د ]`
            }, { quoted: m });
        }
        attacker.lastSteal = now;

        // --- فرصة النجاح: نسبة المطور، تتأثر بدفاع الهدف (نظام عادل زي باقي الميكانيزمات) ---
        const targetDefense = targetUser.defense ?? targetUser.def ?? 0;
        const resistance = getDefenseResistance(targetDefense);
        const successChance = Math.max(0.05, (settings.successRate / 100) * (1 - resistance));

        if (Math.random() < successChance) {
            const targetGold = targetUser.gold || 0;
            const stolen = Math.floor(targetGold * (settings.stealPct / 100));

            targetUser.gold = Math.max(0, targetGold - stolen);
            attacker.gold = (attacker.gold || 0) + stolen;
            attacker.successfulSteals = (attacker.successfulSteals || 0) + 1;

            const msg = `🖐️ *سرقة ناجحة!* 🖐️\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `@${sender.split('@')[0]} نشل @${target.split('@')[0]} بمهارة!\n` +
                        `💰 المسروق: ${stolen.toLocaleString()} ذهب\n━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
            await checkAchievements(db, sender, sock, id);
        } else {
            const penalty = Math.floor((attacker.gold || 0) * (settings.failPenaltyPct / 100));
            attacker.gold = Math.max(0, (attacker.gold || 0) - penalty);

            const msg = `🚔 *فشلت السرقة!* 🚔\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `@${target.split('@')[0]} لاحظ محاولة @${sender.split('@')[0]} ومسكه!\n` +
                        `💸 غرامة الفشل: -${penalty.toLocaleString()} ذهب\n━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
        }
    }
};
