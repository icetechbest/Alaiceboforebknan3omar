const { resolveTargetJid } = require('../../core/messageHandler.js');
const {
    isAssassin,
    isArcher,
    classTitle,
    getDefenseResistance,
    isNewPlayerProtected,
    hasActiveDeflect,
    consumeDeflect,
    splitStolenGold,
    markRecentlyAmbushed,
    isRecentlyAmbushed,
    canAmbushTargetToday,
    recordAmbushTarget,
    checkWeeklyAmbushQuest,
    hasAllianceBonus,
    AMBUSH_COOLDOWN_MS,
    AMBUSH_BASE_CHANCE,
    AMBUSH_STEAL_PCT,
    AMBUSH_STEAL_CAP,
    AMBUSH_FAIL_PENALTY_PCT,
    ARCHER_ANTI_AMBUSH_BONUS,
    RECENTLY_AMBUSHED_BONUS,
    ALLIANCE_BONUS,
    WEEKLY_QUEST_REWARD
} = require('../../data/classSystem.js');

module.exports = {
    name: 'اغتيال',
    aliases: ['كمين'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const attacker = db[sender];

        if (!attacker) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        // ⚠️ الرفض عام حتى لا يفضح الأمر نفسه هوية أي حد
        if (!isAssassin(attacker)) {
            return sock.sendMessage(id, { text: "❌ الأمر ده مش متاح لفئتك الحالية." }, { quoted: m });
        }

        const target = resolveTargetJid(m, db, null, {});
        if (!target) {
            return sock.sendMessage(id, { text: "🗡️ لازم تمنشن الهدف اللي عايز تكمن له!" }, { quoted: m });
        }
        if (target === sender) {
            return sock.sendMessage(id, { text: "❌ ما ينفعش تغتال نفسك!" }, { quoted: m });
        }
        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الهدف ده مش مسجل في المملكة." }, { quoted: m });
        }

        const targetUser = db[target];

        if (isNewPlayerProtected(targetUser)) {
            return sock.sendMessage(id, {
                text: `🛡️ @${target.split('@')[0]} لسه لاعب جديد ومحمي من أي كمين لمدة 24 ساعة من تسجيله.`,
                mentions: [target]
            }, { quoted: m });
        }

        // --- حد أقصى لعدد مرات اغتيال نفس الشخص في اليوم ---
        if (!canAmbushTargetToday(attacker, target)) {
            return sock.sendMessage(id, {
                text: `⚠️ استهدفت الشخص ده كفاية النهاردة، جرب هدف تاني أو استنى بكرة.`
            }, { quoted: m });
        }

        // --- الكولداون العام ---
        const now = Date.now();
        if (attacker.lastAmbush && now - attacker.lastAmbush < AMBUSH_COOLDOWN_MS) {
            const remaining = AMBUSH_COOLDOWN_MS - (now - attacker.lastAmbush);
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            return sock.sendMessage(id, {
                text: `⌛ سلاحك لسه محتاج شحذ... الاغتيال التالي بعد [ ${hours}س و ${minutes}د ]`
            }, { quoted: m });
        }

        // --- لو الهدف مفعّل "صد" (حصري للمحارب): يبطل الكمين بالكامل ---
        if (hasActiveDeflect(targetUser)) {
            consumeDeflect(targetUser);
            attacker.lastAmbush = now;
            recordAmbushTarget(attacker, target);
            const penalty = Math.floor((attacker.gold || 0) * AMBUSH_FAIL_PENALTY_PCT);
            attacker.gold = Math.max(0, (attacker.gold || 0) - penalty);

            const msg = `🛡️ *تصدٍّ ناجح!* 🛡️\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `@${target.split('@')[0]} كان في وضع تصدي وأبطل محاولة الكمين بالكامل!\n` +
                        `💸 @${sender.split('@')[0]} خسر ${penalty.toLocaleString()} ذهب كثمن للمحاولة الفاشلة.\n━━━━━━━━━━━━━━━━━━━━`;
            return sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
        }

        attacker.lastAmbush = now;
        recordAmbushTarget(attacker, target);

        // --- حساب فرصة النجاح: مقاومة الدفاع + عوامل إضافية ---
        const targetDefense = targetUser.defense ?? targetUser.def ?? 0;
        const resistance = getDefenseResistance(targetDefense);
        let successChance = AMBUSH_BASE_CHANCE * (1 - resistance);

        // الرامي عنده "عين الصقر" - مقاومة إضافية ضد الكمائن
        if (isArcher(targetUser)) successChance -= ARCHER_ANTI_AMBUSH_BONUS;
        // لو الهدف "أثره مكشوف" من كمين ناجح سابق مؤخراً - فرصة أعلى عليه
        if (isRecentlyAmbushed(targetUser)) successChance += RECENTLY_AMBUSHED_BONUS;
        // تحالف الظل: لو شريكك ضرب نفس الهدف مؤخراً
        const allied = hasAllianceBonus(db, attacker, target);
        if (allied) successChance += ALLIANCE_BONUS;

        successChance = Math.max(0.10, Math.min(0.95, successChance));

        const success = Math.random() < successChance;

        if (success) {
            const targetGold = targetUser.gold || 0;
            const stolenTotal = Math.min(AMBUSH_STEAL_CAP, Math.floor(targetGold * AMBUSH_STEAL_PCT));
            const { net, tax } = splitStolenGold(stolenTotal);

            targetUser.gold = Math.max(0, targetGold - stolenTotal);
            attacker.gold = (attacker.gold || 0) + net;
            attacker.ambushWins = (attacker.ambushWins || 0) + 1;
            attacker.lastAmbushTarget = target;
            db.treasury = (db.treasury || 0) + tax;
            markRecentlyAmbushed(targetUser);

            const questCompleted = checkWeeklyAmbushQuest(attacker);

            const msg = `🌑 *كمين ناجح!* 🌑\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `${classTitle(attacker)} @${sender.split('@')[0]} باغت الـ${classTitle(targetUser)} @${target.split('@')[0]} من الظل!\n` +
                        `💰 غنيمة صافية: ${net.toLocaleString()} ذهب (بعد خصم ${tax.toLocaleString()} ضريبة للخزينة)` +
                        (allied ? `\n🤝 تحالف الظل ساعدك في الضربة دي!` : '') +
                        `\n🛡️ يا @${target.split('@')[0]}: زوّد دفاعك أو استخدم *.صد* عشان تقلل فرص نجاح أي كمين عليك مستقبلاً.` +
                        (questCompleted ? `\n🏆 @${sender.split('@')[0]} كمّل مهمة الأسبوع (3 اغتيالات ناجحة)! مكافأة إضافية: +${WEEKLY_QUEST_REWARD.toLocaleString()} ذهب!` : '') +
                        `\n━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });

        } else {
            const penalty = Math.floor((attacker.gold || 0) * AMBUSH_FAIL_PENALTY_PCT);
            attacker.gold = Math.max(0, (attacker.gold || 0) - penalty);

            const msg = `🛡️ *فشل الكمين!* 🛡️\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `الـ${classTitle(targetUser)} @${target.split('@')[0]} اكتشف محاولة الاغتيال وتصدى لها!\n` +
                        `💸 @${sender.split('@')[0]} خسر ${penalty.toLocaleString()} ذهب كثمن للفشل.\n━━━━━━━━━━━━━━━━━━━━`;

            await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
        }
    }
};
