const { ITEMS } = require('../../data/shopItems.js');

module.exports = {
    name: 'تفاصيل',
    aliases: ['شرح'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const itemID = args[0];

        if (!itemID) return sock.sendMessage(id, { text: "⚠️ اكتب رقم العنصر بعد الأمر، مثال: *.تفاصيل 30*" }, { quoted: m });

        const item = ITEMS[itemID];
        if (!item) return sock.sendMessage(id, { text: "❌ هذا الرقم غير موجود في قائمة المتجر حالياً." }, { quoted: m });

        let typeName, effect, note;

        if (item.type === "use") {
            typeName = "🧪 جرعة (مستهلك)";
            effect = `❤️ زيادة الصحة: *+${item.hp.toLocaleString()}*`;
            note = "تُستخدم فور الشراء لرفع نقاط حياتك (لا تتجاوز الحد الأقصى المسموح لمستواك).";
        } else if (item.type === "stack") {
            typeName = "⚔️ عتاد (تراكمي)";
            effect = `${item.atk ? `⚔️ هجوم: *+${item.atk.toLocaleString()}*\n` : ""}${item.def ? `🛡️ دفاع: *+${item.def.toLocaleString()}*` : ""}`;
            note = "قوة ثابتة تضاف لشخصيتك للأبد، يمكنك شراء أكثر من قطعة وتراكم القوة.";
        } else if (item.type === "pet") {
            typeName = "🐾 رفيق (حيوان/كائن)";
            effect = `⚔️ هجوم الرفيق: *+${item.atk.toLocaleString()}*\n🛡️ دفاع الرفيق: *+${item.def.toLocaleString()}*`;
            note = "🔄 نظام الاستبدال: عند شراء رفيق جديد يتم حذف ميزات الرفيق القديم تلقائياً.";
        }

        let detailMsg = `✦━━━━━『 *𝐒𝐔𝐍𝐆 𝐈𝐍𝐅𝐎* 』━━━━━✦\n\n`;
        detailMsg += `📦 *الاسـم:* ${item.name}\n`;
        detailMsg += `💰 *السـعر:* ${item.cost.toLocaleString()} ذهب\n`;
        detailMsg += `🏷️ *النوع:* ${typeName}\n\n`;
        detailMsg += `✨ *الميزات:* \n${effect}\n\n`;
        detailMsg += `📝 *مـلاحظة:* ${note}\n\n`;
        detailMsg += `✦━━━━━━━━━━━━━━━━━━━✦`;

        await sock.sendMessage(id, { text: detailMsg }, { quoted: m });
    }
};
