const { resolveTargetJid } = require('../../core/messageHandler.js');

// 🏇 [ أمر .سباق ] --------------------------------------------------------------
// سباق بسيط بين لاعبين برهان ذهب، النتيجة حظ بحت (50/50) على عكس .مواجهة اللي
// بتحسب هجوم/دفاع. من غير طلب قبول/رفض عشان يفضل أبسط: اللي بيكتب الأمر بيوافق
// ضمنيًا على السباق بمجرد ما يكتبه (زي ما بيحصل في .هجوم بين العصابات).
module.exports = {
    name: 'سباق',
    aliases: ['race'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const target = resolveTargetJid(m, db, null, {});
        const wager = parseInt(args.find(arg => !arg.includes('@') && !isNaN(arg)));

        if (!target || !wager || wager <= 0) {
            return sock.sendMessage(id, {
                text: "❌ الطريقة الصحيحة:\n*.سباق @الخصم [مبلغ الرهان]*\nمثال: *.سباق @Yuri 500*"
            }, { quoted: m });
        }

        if (target === sender) {
            return sock.sendMessage(id, { text: "😂 ما ينفعش تسابق نفسك!" }, { quoted: m });
        }

        const runner = db[sender];
        const rival = db[target];
        if (!runner || !rival) {
            return sock.sendMessage(id, { text: "❌ أحد الطرفين غير مسجل في المملكة." }, { quoted: m });
        }

        if ((runner.gold || 0) < wager) {
            return sock.sendMessage(id, { text: "💰 رصيدك من الذهب لا يكفي لهذا الرهان!" }, { quoted: m });
        }
        if ((rival.gold || 0) < wager) {
            return sock.sendMessage(id, { text: "⚠️ خصمك رصيده مش كفاية عشان يقدر يقبل رهان بالمبلغ ده." }, { quoted: m });
        }

        const winner = Math.random() < 0.5 ? sender : target;
        const loser = winner === sender ? target : sender;

        db[winner].gold = (db[winner].gold || 0) + wager;
        db[loser].gold = (db[loser].gold || 0) - wager;
        db[winner].raceWins = (db[winner].raceWins || 0) + 1;

        const track = ["🏇", "🐎", "🐴"][Math.floor(Math.random() * 3)];
        let msg = `${track} *سِبَاقُ الْمَيْدَانِ* ${track}\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `👤 @${sender.split('@')[0]}  🆚  @${target.split('@')[0]}\n`;
        msg += `💰 الرهان: ${wager.toLocaleString()} ذهب\n\n`;
        msg += `🏆 الفائز: @${winner.split('@')[0]}\n`;
        msg += `💸 ${loser === sender ? 'خسرت' : 'خسر خصمك'} ${wager.toLocaleString()} ذهبة لصالح الفائز.`;

        await sock.sendMessage(id, { text: msg, mentions: [sender, target] }, { quoted: m });
    }
};
