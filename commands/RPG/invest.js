// 📈 [ أمر .استثمار ] -----------------------------------------------------------
// يحبس مبلغ من ذهب اللاعب لمدة ثابتة (6 ساعات) مقابل عائد بعد انتهاء المدة.
// خطر/عائد: 70% فرصة ربح (10%-40%)، 30% فرصة خسارة جزء من رأس المال (10%-30%).
// بما إن البوت مش بيبعت رسائل خاصة، الاستثمار بيتحصّل (Collect) لما اللاعب يكتب
// .استثمار تاني بعد ما ميعاده يخلص، مش عن طريق تنبيه تلقائي.
const INVEST_DURATION_MS = 6 * 60 * 60 * 1000; // 6 ساعات
const WIN_CHANCE = 0.7;
const MIN_GAIN_PCT = 0.10, MAX_GAIN_PCT = 0.40;
const MIN_LOSS_PCT = 0.10, MAX_LOSS_PCT = 0.30;

function formatRemaining(ms) {
    const totalMinutes = Math.ceil(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours} ساعة و${minutes} دقيقة`;
    return `${minutes} دقيقة`;
}

module.exports = {
    name: 'استثمار',
    aliases: ['invest'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];
        if (!user) return sock.sendMessage(id, { text: "❌ بياناتك غير مسجلة في اللعبة." }, { quoted: m });

        // --- لو عنده استثمار شغال بالفعل ---
        if (user.investment) {
            const remaining = user.investment.maturesAt - Date.now();
            if (remaining > 0) {
                return sock.sendMessage(id, {
                    text: `⏳ عندك استثمار شغال بالفعل بمبلغ *${user.investment.amount.toLocaleString()}* ذهب.\nهيستحق بعد: ${formatRemaining(remaining)}.`
                }, { quoted: m });
            }

            // --- استحق: نحسب النتيجة ونصفي الاستثمار ---
            const amount = user.investment.amount;
            const won = Math.random() < WIN_CHANCE;
            const pct = won
                ? (MIN_GAIN_PCT + Math.random() * (MAX_GAIN_PCT - MIN_GAIN_PCT))
                : -(MIN_LOSS_PCT + Math.random() * (MAX_LOSS_PCT - MIN_LOSS_PCT));
            const change = Math.floor(amount * pct);
            const payout = Math.max(0, amount + change);

            user.gold = (user.gold || 0) + payout;
            delete user.investment;

            let resultMsg = won
                ? `📈 *استثمار ناجح!* 📈\n━━━━━━━━━━━━━━━━━━\nرأس المال: ${amount.toLocaleString()}\nالربح: +${change.toLocaleString()} (${(pct * 100).toFixed(1)}%)\n💰 استلمت: *${payout.toLocaleString()}* ذهب`
                : `📉 *خسارة في الاستثمار!* 📉\n━━━━━━━━━━━━━━━━━━\nرأس المال: ${amount.toLocaleString()}\nالخسارة: ${change.toLocaleString()} (${(pct * 100).toFixed(1)}%)\n💰 استرجعت بس: *${payout.toLocaleString()}* ذهب`;

            await sock.sendMessage(id, { text: resultMsg }, { quoted: m });

            // لو معاه مبلغ جديد كمان، منبدأش استثمار تاني أوتوماتيك — نسيبه يكتب الأمر تاني بالمبلغ الجديد
            return;
        }

        // --- مفيش استثمار شغال: نبدأ واحد جديد ---
        const amount = parseInt(args[0]);
        if (!amount || amount <= 0) {
            return sock.sendMessage(id, {
                text: "❌ الطريقة الصحيحة:\n*.استثمار [المبلغ]*\nمثال: *.استثمار 10000*\n\n📜 المدة: 6 ساعات. فرصة ربح 70% (10%-40%)، وفرصة خسارة 30% (10%-30%)."
            }, { quoted: m });
        }
        if ((user.gold || 0) < amount) {
            return sock.sendMessage(id, { text: "💰 رصيدك من الذهب لا يكفي لهذا الاستثمار!" }, { quoted: m });
        }

        user.gold -= amount;
        user.investment = { amount, startedAt: Date.now(), maturesAt: Date.now() + INVEST_DURATION_MS };

        await sock.sendMessage(id, {
            text: `📈 تم استثمار *${amount.toLocaleString()}* ذهب بنجاح!\n⏳ هيستحق بعد 6 ساعات — اكتب *.استثمار* تاني وقتها عشان تحصّل نتيجته.`
        }, { quoted: m });
    }
};
