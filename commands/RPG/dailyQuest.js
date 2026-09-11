const { ensurePlayerDefaults } = require('../../data/classSystem.js');
const { checkAchievements } = require('../../data/achievements.js');

const QUEST_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// 🎁 جوايز عشوائية بسيطة: إما ذهب متغير أو رسالة "آيتم" رمزي
const REWARD_POOL = [
    { type: 'gold', min: 300, max: 800 },
    { type: 'gold', min: 800, max: 1500 },
    { type: 'item', label: '🧪 جرعة طاقة صغيرة (ذهب رمزي)', gold: 200 }
];

module.exports = {
    name: 'مهمة',
    aliases: ['مهمة-يومية'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        if (!db[sender]) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }
        ensurePlayerDefaults(db[sender]);
        const user = db[sender];

        const now = Date.now();
        if (user.lastDailyQuest && now - user.lastDailyQuest < QUEST_COOLDOWN_MS) {
            const remaining = QUEST_COOLDOWN_MS - (now - user.lastDailyQuest);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return sock.sendMessage(id, {
                text: `⌛ خلصت مهمتك النهاردة! تعالى تاني بعد [ ${hours}س و ${minutes}د ]`
            }, { quoted: m });
        }

        user.lastDailyQuest = now;
        const reward = REWARD_POOL[Math.floor(Math.random() * REWARD_POOL.length)];

        let msg = `📜 *مهمة يومية مكتملة!* 📜\n━━━━━━━━━━━━━━━━━━\n`;
        if (reward.type === 'gold') {
            const gold = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;
            user.gold = (user.gold || 0) + gold;
            msg += `💰 حصلت على ${gold.toLocaleString()} ذهبة كجايزة!`;
        } else {
            user.gold = (user.gold || 0) + reward.gold;
            msg += `${reward.label}\n💰 (+${reward.gold} ذهبة)`;
        }
        msg += `\n━━━━━━━━━━━━━━━━━━\n🔁 المهمة القادمة بعد 24 ساعة.`;

        await sock.sendMessage(id, { text: msg }, { quoted: m });
        await checkAchievements(db, sender, sock, id);
    }
};
