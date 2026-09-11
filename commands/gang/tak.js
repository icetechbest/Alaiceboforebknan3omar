const { ensurePlayerDefaults } = require('../../data/classSystem.js');

module.exports = {
    name: "سحب-خزنة",
    aliases: ["سحب_خزنة", "withdraw"],
    category: "gangs",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const amount = parseInt(args[0]);

        // 1. البحث عن العصابة التي يملكها الشخص
        const gang = Object.values(db.gangs || {}).find(g => g.owner === sender);
        if (!gang) return sock.sendMessage(groupID, { text: "⚠️ هذا الأمر للمؤسسين فقط! يجب أن تكون صاحب عصابة." });

        // 2. التحقق من المبلغ
        if (!amount || isNaN(amount) || amount <= 0) {
            return sock.sendMessage(groupID, { text: "⚠️ يرجى كتابة مبلغ السحب بشكل صحيح!\n📌 مثال: *.سحب-خزنة 1000*" });
        }

        // 3. التحقق من رصيد الخزينة
        if (Number(gang.gold || 0) < amount) {
            return sock.sendMessage(groupID, { text: `⚠️ رصيد الخزينة غير كافٍ! متاح حالياً: ${Number(gang.gold).toLocaleString()} ذهبة.` });
        }

        // 4. تنفيذ السحب وتحديث البيانات
        // خصم من الخزنة
        gang.gold = Number(gang.gold) - amount;

        // إضافة لجيب القائد الحقيقي (نفس db[jid].gold المستخدم في كل البوت)
        // ⚠️ كانت بتتحط قبل كده في db.users[sender] وهو مكان منفصل تماماً
        // ملوش أي علاقة بباقي البوت، فالذهب كان بيختفي فعلياً من منظور اللاعب.
        if (!db[sender]) db[sender] = {};
        ensurePlayerDefaults(db[sender]);
        db[sender].gold = (Number(db[sender].gold) || 0) + amount;

        return sock.sendMessage(groupID, { 
            text: `💸 *عملية سحب ناجحة*\n━━━━━━━━━━━━━━\n💰 المبلغ: ${amount.toLocaleString()} ذهبة\n👤 القائد: @${sender.split('@')[0]}\n🏦 رصيد الخزينة المتبقي: ${Number(gang.gold).toLocaleString()}\n\n✅ تم إضافة الذهب لرصيدك الشخصي يا ماستر.`,
            mentions: [sender]
        }, { quoted: m });
    }
};
