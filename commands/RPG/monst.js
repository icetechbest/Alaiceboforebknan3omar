module.exports = {
    name: 'وحش',
    async execute(sock, m, args, db, sender) {
        const user = db[sender];
        const id = m.key.remoteJid;

        // 1. التحقق من وجود حساب للاعب
        if (!user) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ *.لاعب جديد*" }, { quoted: m });
        }

        // 2. التحقق من صحة اللاعب
        if (user.hp <= 0) {
            return sock.sendMessage(id, { text: "💔 *مُنهك!* صحتك [0]، استعمل الجرعة أولاً لتتمكن من القتال." }, { quoted: m });
        }

        // 3. نظام الوقت الديناميكي
        const now = Date.now();
        const cooldown = db.settings?.cooldowns?.['وحش'] !== undefined ? db.settings.cooldowns['وحش'] : 90000;
        
        if (user.lastMonsterBattle && now - user.lastMonsterBattle < cooldown) {
            const remaining = cooldown - (now - user.lastMonsterBattle);
            const seconds = Math.ceil(remaining / 1000);
            return sock.sendMessage(id, { text: `⏳ *هدوء:* عُد بعد [ *${seconds}* ] ثانية.` }, { quoted: m });
        }

        // 4. إعداد الوحش بناءً على المستوى المطلوب
        const monsterLevel = Math.max(1, parseInt(args[0]) || 1);
        const monsterNames = ["سلايم 💧", "ذئب جائع 🐺", "غول الغابة 👹", "فارس الظلام 🌑", "تنين صغير 🐉", "ملك العمالقة 🗿"];
        const nameIdx = Math.min(Math.floor(monsterLevel / 5), monsterNames.length - 1);
        
        const monster = {
            name: monsterNames[nameIdx],
            hp: Math.floor((30 + (monsterLevel * 12)) * 2), 
            atk: Math.floor((5 + (monsterLevel * 4)) * 2),  
            gold: monsterLevel * 10, 
            xp: monsterLevel * 20
        };

        let userHP = user.hp;
        let monsterHP = monster.hp;
        const userDisplayName = user.name || "مقاتل مجهول";

        // 5. بناء سجل القتال
        let log = `🛡️ *تَـقْـرِيرُ الـقِـتَـالِ المَلْحَمِي* 🛡️\n`;
        log += `━━━━━━━━━━━━━━━━━━━━\n`;
        log += `👤 *الْبَطَل:* ${userDisplayName}\n`; 
        log += `📊 [ الصحة: ${userHP} | الهجوم: ${user.atk} ]\n`;
        log += `━━━━━━━━━━━━━━━━━━━━\n`;
        log += `👾 *الْخَصْم:* ${monster.name} (Lv.${monsterLevel})\n`;
        log += `📊 [ الصحة: ${monster.hp} | الهجوم: ${monster.atk} ]\n`;
        log += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        // 6. محاكاة المعركة
        while (userHP > 0 && monsterHP > 0) {
            // ضربة البطل
            monsterHP -= user.atk;
            if (monsterHP <= 0) break;

            // ضربة الوحش (مع مراعاة دفاع اللاعب)
            let userDef = user.defense || user.def || 0;
            userHP -= Math.max(1, monster.atk - userDef);
        }

        // تحديث وقت آخر قتال
        user.lastMonsterBattle = now;

        // 7. نتائج المعركة
        if (monsterHP <= 0) {
            // في حالة الفوز: يحصل على الجوائز
            user.gold += monster.gold;
            user.xp += monster.xp;
            user.hp = Math.max(0, userHP);

            log += `✨ *انْتِصَارٌ سَاحِق!* لقد هزمت ${monster.name}.\n\n`;
            log += `💰 الذهب: +${monster.gold.toLocaleString()}\n`;
            log += `✨ الخبرة: +${monster.xp}\n`;
            log += `❤️ الصحة المتبقية: ${user.hp}\n`;

            // نظام الارتقاء (Level Up)
            if (user.xp >= user.level * 100) {
                user.level++;
                user.xp = 0;
                user.hp = 100 + (user.level * 25); 
                log += `\n🌟 *ارْتِقَاء (Lv.${user.level})* لقد زادت قوتك!`;
            }
        } else {
            // في حالة الخسارة: لا يحصل على أي شيء وصحته تصبح 0
            user.hp = 0;
            log += `💀 *لَقَدْ سَقَطْتَ!* الوحش كان أقوى منك.\n\n`;
            log += `❌ لم تحصل على أي ذهب أو خبرة هذه المرة.\n`;
            log += `💡 *نصيحة:* ارفع دفاعك ليكون أعلى من [ ${monster.atk} ] لتتجنب ضرر الوحش.`;
        }

        await sock.sendMessage(id, { text: log }, { quoted: m });
    }
};
