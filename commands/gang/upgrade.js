module.exports = {
    name: "تطوير-العصابة",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        // 1. التأكد إن اللي بيبعت الأمر هو المالك
        const gang = Object.values(db.gangs || {}).find(g => g.owner === sender);
        if (!gang) return sock.sendMessage(groupID, { text: "⚠️ هذا الأمر لمؤسس العصابة فقط!" });

        // 2. حساب تكلفة التطوير (المعادلة: المستوى الحالي * 200,000)
        const currentLevel = gang.level || 1;
        const upgradeCost = currentLevel * 2000000000;

        // 3. التأكد من وجود ذهب كافي في "خزنة العصابة" وليس جيب المالك
        if (Number(gang.gold || 0) < upgradeCost) {
            return sock.sendMessage(groupID, { 
                text: `⚠️ خزنة العصابة لا تكفي للتطوير!\n📈 المستوى الحالي: ${currentLevel}\n💰 تكلفة التطوير للمستوى التالي: ${upgradeCost.toLocaleString()} ذهبة\n🏦 المتوفر في الخزنة: ${Number(gang.gold).toLocaleString()} ذهبة.` 
            });
        }

        // 4. تنفيذ التطوير
        gang.gold -= upgradeCost;
        gang.level = currentLevel + 1;

        let upgradeMsg = `🎊 *تـهـانـيـنـا! تـم تـطـويـر الـعـصـابـة* 🎊\n━━━━━━━━━━━━━━━\n`;
        upgradeMsg += `🏰 العصابة: *${gang.name}*\n`;
        upgradeMsg += `⬆️ من مستوى: ${currentLevel}\n`;
        upgradeMsg += `✅ إلى مستوى: ${gang.level}\n`;
        upgradeMsg += `💰 التكلفة المخصومة من الخزنة: ${upgradeCost.toLocaleString()} ذهبة\n`;
        upgradeMsg += `━━━━━━━━━━━━━━━\n👑 استمروا في جمع التبرعات للوصول للقمة!`;

        return sock.sendMessage(groupID, { text: upgradeMsg });
    }
};
