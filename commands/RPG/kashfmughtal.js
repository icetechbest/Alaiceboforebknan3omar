const { resolveTargetJid } = require('../../core/messageHandler.js');
const {
    isAssassin,
    getAssassinRank,
    breakAllianceIfPartner,
    REVEAL_COOLDOWN_MS,
    REVEAL_WRONG_PENALTY
} = require('../../data/classSystem.js');

module.exports = {
    name: 'كشف-مغتال',
    aliases: ['كشف_مغتال', 'اتهام'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const accuser = db[sender];

        if (!accuser) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        const target = resolveTargetJid(m, db, null, {});
        if (!target) {
            return sock.sendMessage(id, { text: "🕵️ لازم تمنشن الشخص اللي شاكك فيه!" }, { quoted: m });
        }
        if (target === sender) {
            return sock.sendMessage(id, { text: "❌ ما ينفعش تتهم نفسك!" }, { quoted: m });
        }
        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ الشخص ده مش مسجل في المملكة." }, { quoted: m });
        }

        // --- كولداون على محاولات الاتهام (يمنع تجربة كل الأعضاء وراء بعض ببلاش) ---
        const now = Date.now();
        if (accuser.lastRevealAttempt && now - accuser.lastRevealAttempt < REVEAL_COOLDOWN_MS) {
            const remaining = REVEAL_COOLDOWN_MS - (now - accuser.lastRevealAttempt);
            const minutes = Math.ceil(remaining / 60000);
            return sock.sendMessage(id, {
                text: `⌛ لازم تستنى شوية قبل ما تحاول تكشف حد تاني... حاول تاني بعد ${minutes} دقيقة.`
            }, { quoted: m });
        }
        accuser.lastRevealAttempt = now;

        const targetUser = db[target];

        if (isAssassin(targetUser)) {
            if (targetUser.revealed) {
                return sock.sendMessage(id, {
                    text: `ℹ️ @${target.split('@')[0]} اتكشف قبل كده، مفيش مكافأة جديدة.`,
                    mentions: [target]
                }, { quoted: m });
            }

            // اتهام صحيح: كشف الهوية + مكافأة حسب رتبة المغتال
            const rank = getAssassinRank(targetUser);
            targetUser.revealed = true;
            accuser.gold = (accuser.gold || 0) + rank.reward;

            // لو كان في تحالف ظل، بيتكسر تلقائي والشريك بياخد تحذير خاص
            const allyJid = breakAllianceIfPartner(db, target);
            if (allyJid) {
                try {
                    await sock.sendMessage(allyJid, {
                        text: `🚨 شريكك في تحالف الظل اتكشف! تحالفكم انتهى تلقائياً، احترس من نفس المصير.`
                    });
                } catch (e) { /* تجاهل */ }
            }

            const msg = `🕵️ *تم الكشف!* 🕵️\n━━━━━━━━━━━━━━━━━━━━\n` +
                        `@${sender.split('@')[0]} كان شاكك صح!\n` +
                        `@${target.split('@')[0]} طلع فعلاً *${rank.label}*!\n` +
                        `💰 مكافأة الكشف: +${rank.reward.toLocaleString()} ذهب\n━━━━━━━━━━━━━━━━━━━━`;

            return sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
        }

        // اتهام خاطئ: غرامة
        accuser.gold = Math.max(0, (accuser.gold || 0) - REVEAL_WRONG_PENALTY);

        const msg = `❌ *اتهام خاطئ!* ❌\n━━━━━━━━━━━━━━━━━━━━\n` +
                    `@${target.split('@')[0]} برئ تماماً!\n` +
                    `💸 @${sender.split('@')[0]} دفع غرامة ${REVEAL_WRONG_PENALTY.toLocaleString()} ذهب بسبب الاتهام الكاذب.\n━━━━━━━━━━━━━━━━━━━━`;

        await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
    }
};
