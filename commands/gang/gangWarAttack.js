// 🗡️ [ أمر .مساهمة ] ------------------------------------------------------------
// أي عضو في عصابة داخلة في حرب (.حرب_عصابات) يقدر يساهم بنقط لعصابته، بكولداون
// نص ساعة لكل عضو عشان محدش يكرر الأمر بلا نهاية.
const cooldowns = new Map();
const CONTRIBUTE_COOLDOWN_MS = 30 * 60 * 1000;

module.exports = {
    name: "مساهمة",
    aliases: ["ساهم"],
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        const myGang = Object.values(db.gangs || {}).find(g => g.members?.includes(sender));
        if (!myGang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون عضو في عصابة عشان تساهم!" });

        if (!myGang.activeWarId || !db.gangWars?.[myGang.activeWarId]) {
            return sock.sendMessage(groupID, { text: "⚠️ عصابتك مش في حرب شغالة حاليًا. استخدم .حرب_عصابات للبدء." });
        }

        const lastContribution = cooldowns.get(sender) || 0;
        if (Date.now() - lastContribution < CONTRIBUTE_COOLDOWN_MS) {
            const remaining = Math.ceil((CONTRIBUTE_COOLDOWN_MS - (Date.now() - lastContribution)) / 60000);
            return sock.sendMessage(groupID, { text: `⏳ استنى ${remaining} دقيقة كمان عشان تساهم تاني.` });
        }
        cooldowns.set(sender, Date.now());

        const war = db.gangWars[myGang.activeWarId];
        const points = 5 + Math.floor(Math.random() * 16); // 5 إلى 20 نقطة
        war.score[myGang.name] = (war.score[myGang.name] || 0) + points;

        const opponentName = war.gangA === myGang.name ? war.gangB : war.gangA;
        await sock.sendMessage(groupID, {
            text: `🗡️ @${sender.split('@')[0]} ساهم بـ *${points}* نقطة لعصابة [ ${myGang.name} ]!\n📊 النتيجة الحالية: [ ${myGang.name} ]: ${war.score[myGang.name]} — [ ${opponentName} ]: ${war.score[opponentName] || 0}`,
            mentions: [sender]
        });
    }
};
