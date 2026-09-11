const { resolveTargetJid } = require('../../core/messageHandler.js');
const {
    isArcher,
    getDefenseResistance,
    applyWeaken,
    VOLLEY_COOLDOWN_MS,
    VOLLEY_BASE_CHANCE,
    VOLLEY_FAIL_PENALTY_PCT,
    WEAKEN_WINDOW_MS,
    WEAKEN_PCT
} = require('../../data/classSystem.js');

module.exports = {
    name: 'رشق',
    aliases: ['رشقة'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const attacker = db[sender];

        if (!attacker) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        if (!isArcher(attacker)) {
            return sock.sendMessage(id, { text: "❌ الأمر ده مش متاح لفئتك الحالية." }, { quoted: m });
        }

        const target = resolveTargetJid(m, db, null, {});
        if (!target) {
            return sock.sendMessage(id, { text: "🏹 لازم تمنشن الهدف اللي عايز ترشقه!" }, { quoted: m });
        }
        if (target === sender) {
            return sock.sendMessage(id, { text: "❌ ما ينفعش ترشق نفسك!" }, { quoted: m });
        }
        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الهدف ده مش مسجل في المملكة." }, { quoted: m });
        }

        const now = Date.now();
        if (attacker.lastVolley && now - attacker.lastVolley < VOLLEY_COOLDOWN_MS) {
            const remaining = VOLLEY_COOLDOWN_MS - (now - attacker.lastVolley);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return sock.sendMessage(id, {
                text: `⌛ كنانتك محتاجة سهام جديدة... الرشقة التالية بعد [ ${hours}س و ${minutes}د ]`
            }, { quoted: m });
        }
        attacker.lastVolley = now;

        const targetUser = db[target];
        const targetDefense = targetUser.defense ?? targetUser.def ?? 0;
        const resistance = getDefenseResistance(targetDefense);
        const successChance = Math.max(0.15, VOLLEY_BASE_CHANCE * (1 - resistance));

        if (Math.random() < successChance) {
            applyWeaken(targetUser);
            const minutes = Math.round(WEAKEN_WINDOW_MS / 60000);
            const pct = Math.round(WEAKEN_PCT * 100);

            const msg = `🏹 *رشقة سهام دقيقة!* 🏹\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `@${sender.split('@')[0]} أصاب @${target.split('@')[0]} برشقة موجعة!\n` +
                        `📉 قوة الهدف هتنقص ${pct}% لمدة ${minutes} دقيقة (في المواجهات).\n━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
        } else {
            const penalty = Math.floor((attacker.gold || 0) * VOLLEY_FAIL_PENALTY_PCT);
            attacker.gold = Math.max(0, (attacker.gold || 0) - penalty);

            const msg = `🛡️ *رشقة مخطئة!* 🛡️\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `@${target.split('@')[0]} تفادى الرشقة بدفاعه!\n` +
                        `💸 @${sender.split('@')[0]} خسر ${penalty.toLocaleString()} ذهب كثمن للسهام الضائعة.\n━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
        }
    }
};
