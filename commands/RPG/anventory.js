module.exports = {
    name: 'مخزن',
    aliases: ['حقيبتي', 'المخزن'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];

        if (!user) {
            return await sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        // --- [ حساب رسوم فتح المخزن ] ---
        const userGold = user.gold || 0;
        const fee = userGold > 100000 ? 100 : 10;

        // التحقق من القدرة على دفع الرسوم
        if (userGold < fee) {
            return sock.sendMessage(id, { text: `⚠️ لا تملك ${fee} ذهب لفتح حقيبتك، اذهب لجمع المال أولاً!` }, { quoted: m });
        }

        // خصم الرسوم
        user.gold -= fee;

        // 1. تحضير الحيوان الأليف الحالي
        const activePet = user.currentPet || "لا يوجد مرافق نشط ❌";

        // 2. تحضير قائمة كل الرفقاء
        let petsList = "لا يوجد رفقاء في الحقيبة 🥚";
        if (Array.isArray(user.pets) && user.pets.length > 0) {
            petsList = user.pets.map((pet, index) => `   ${index + 1}. ${pet}`).join('\n');
        }

        // 3. بناء الرسالة
        let inventoryMsg = `🎒 *مخزن الملك: ${user.name || "محارب"}* 🎒\n` +
                           `━━━━━━━━━━━━━━━━━━\n\n` +
                           `📊 *الإحصائيات الحالية:*\n` +
                           `⚔️ الهجوم: ${user.atk || 0}\n` +
                           `🛡️ الدفاع: ${user.defense || user.def || 0}\n` +
                           `❤️ الصحة: ${user.hp || 0}\n` +
                           `💰 الذهب: ${user.gold.toLocaleString()}\n\n` +
                           `🐾 *المرافق الحالي:* \n » ${activePet}\n\n` +
                           `🐉 *قائمة الرفقاء:* \n${petsList}\n\n` +
                           `━━━━━━━━━━━━━━━━━━\n` +
                           `💸 رسوم فتح الحقيبة: *-${fee}* ذهب\n` +
                           `💡 نصيحة: استمر في قتال الوحوش لتطوير معداتك!`;

        await sock.sendMessage(id, { text: inventoryMsg }, { quoted: m });
    }
};
