const { classTitle } = require('../../data/classSystem.js');
const { resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'ذهبي',
    aliases: ['فلوسي', 'رصيدي', 'ذهب'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // 1. التأكد من وجود صاحب الأمر في الداتابيز
        if (!db[sender]) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        // 2. تحديد الشخص المستهدف (منشن أو صاحب الأمر)
        const target = resolveTargetJid(m, db, null, { fallbackTo: sender });
        if (!db[target]) {
            return sock.sendMessage(id, { text: "❌ هذا المحارب غير مسجل." }, { quoted: m });
        }

        // 3. تحديد رسوم الاستعلام بناءً على ثروة الراسل
        const userGold = db[sender].gold || 0;
        const fee = userGold > 100000 ? 100 : 10;

        // 4. التحقق من القدرة على دفع الرسوم
        if (userGold < fee) {
            return sock.sendMessage(id, { text: `⚠️ لا تملك ${fee} ذهب لدفع رسوم فتح الخزينة!` }, { quoted: m });
        }

        // 5. خصم الرسوم
        db[sender].gold -= fee;

        const targetUser = db[target];
        const targetGold = targetUser.gold || 0;
        
        // استخدام اللقب (Name) إذا وجد، وإلا استخدام المنشن
        const displayName = targetUser.name ? `*${targetUser.name}*` : `@${target.split('@')[0]}`;

        // 6. تنسيق الرسالة
        let msg = `💰 *خزينة الذهب الملكية* 💰\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `👤 ${classTitle(targetUser)}: ${displayName}\n`;
        msg += `✨ الرصيد: *${targetGold.toLocaleString()}* ذهب\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `💸 رسوم الاستعلام: *-${fee}* ذهب\n`;
        
        if (targetGold > 500000) {
            msg += `🤴 ملوك المال! ثروة يحسدك عليها الجميع.`;
        } else if (targetGold > 100000) {
            msg += `💎 ثري ومعروف في أنحاء المملكة.`;
        } else {
            msg += `⚔️ القتال هو طريقك الوحيد للثراء.`;
        }

        await sock.sendMessage(id, { 
            text: msg, 
            mentions: [target] 
        }, { quoted: m });
    }
};
