const { checkAchievements } = require('../../data/achievements.js');

const cooldowns = new Map();

module.exports = {
    name: "هجوم",
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;
        const targetGangName = args.join(" ");

        // 1. البحث عن عصابة المهاجم (يجب أن يكون المؤسس)
        const myGang = Object.values(db.gangs || {}).find(g => g.owner === sender);
        if (!myGang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون قائد عصابة عشان تبدأ هجوم!" });

        // 2. التحقق من وقت الانتظار (ساعة واحدة بين كل هجوم)
        const lastRaid = cooldowns.get(sender) || 0;
        const waitTime = 60 * 60 * 1000; // ساعة بالملي ثانية
        if (Date.now() - lastRaid < waitTime) {
            const remaining = Math.ceil((waitTime - (Date.now() - lastRaid)) / 60000);
            return sock.sendMessage(groupID, { text: `⏳ جنودك تعبانين يا قائد! تقدر تهجم تاني بعد ${remaining} دقيقة.` });
        }

        if (!targetGangName) return sock.sendMessage(groupID, { text: "⚠️ منشن العصابة اللي عايز تنهبها! مثال: .هجوم التنانين" });

        // 3. البحث عن عصابة الخصم
        const targetGang = db.gangs[targetGangName];
        if (!targetGang) return sock.sendMessage(groupID, { text: "⚠️ العصابة دي مش موجودة في سجلاتنا!" });
        if (targetGang.name === myGang.name) return sock.sendMessage(groupID, { text: "⚠️ عايز تهجم على رجالتك؟ بلاش جنون!" });

        // 🤝 ممنوع الغارة على عصابة متحالفة معاك (.تحالف)
        if (myGang.allies?.includes(targetGang.name)) {
            return sock.sendMessage(groupID, { text: "🤝 دي عصابة حليفة! مينفعش تهجم عليها طول ما التحالف قايم." });
        }

        // 4. حساب القوة الاحتمالية للفوز
        // القوة = (المستوى * 15) + (عدد الأعضاء * 2)
        const myPower = (myGang.level * 15) + (myGang.members.length * 2);
        const targetPower = (targetGang.level * 15) + (targetGang.members.length * 2);
        
        const totalPower = myPower + targetPower;
        const randomHit = Math.random() * totalPower;

        cooldowns.set(sender, Date.now()); // تسجيل وقت الهجوم

        if (randomHit < myPower) {
            // --- [ فوز المهاجم ] ---
            // سرقة 15% من ذهب خزنة الخصم
            const loot = Math.floor(Number(targetGang.gold || 0) * 0.15);
            targetGang.gold = Number(targetGang.gold) - loot;
            myGang.gold = Number(myGang.gold) + loot;

            let winMsg = `⚔️ *غارة ناجحة!* ⚔️\n━━━━━━━━━━━━━━━\n`;
            winMsg += `🏰 قادت عصابة *[ ${myGang.name} ]* هجوماً غادراً على حصون *[ ${targetGang.name} ]*.\n\n`;
            winMsg += `🔥 النتيجة: انتصار ساحق للمهاجمين!\n`;
            winMsg += `💰 الغنائم: تم نهب *${loot.toLocaleString()}* ذهبة وإضافتها لخزنتكم.`;

            await sock.sendMessage(groupID, { text: winMsg });

            // 🏅 يفتح إنجاز "أول انتصار في هجوم عصابة" (وبعدها "قائد حروب" مع تكرار الانتصارات)
            db[sender] ??= {};
            db[sender].gangRaidWins = (db[sender].gangRaidWins || 0) + 1;
            return checkAchievements(db, sender, sock, groupID);
        } else {
            // --- [ فوز المدافع ] ---
            // خسارة 10% من ذهب المهاجم كتعويض للخصم
            const penalty = Math.floor(Number(myGang.gold || 0) * 0.10);
            myGang.gold = Number(myGang.gold) - penalty;
            targetGang.gold = Number(targetGang.gold) + penalty;

            let loseMsg = `🛡️ *هزيمة نكراء!* 🛡️\n━━━━━━━━━━━━━━━\n`;
            loseMsg += `حاولت عصابة *[ ${myGang.name} ]* الهجوم على *[ ${targetGang.name} ]*، لكن الدفاعات كانت حديدية!\n\n`;
            loseMsg += `💀 النتيجة: تشتت شمل جنودك وانسحاب مخزي.\n`;
            loseMsg += `💸 الخسائر: اضطررتم لدفع *${penalty.toLocaleString()}* ذهبة تعويضات للخصم.`;

            return sock.sendMessage(groupID, { text: loseMsg });
        }
    }
};
