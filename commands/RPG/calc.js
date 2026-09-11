const fs = require('fs');

module.exports = {
    name: 'احسب',
    aliases: ['توقع', 'تحليل', 'رادار'],
    async execute(sock, m, args, db, sender) {
        const user = db[sender];
        const id = m.key.remoteJid;

        // 1. التحقق من وجود حساب
        if (!user) return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ *.لاعب جديد*" }, { quoted: m });

        // 2. رسوم التحليل
        const fee = 100;
        if (user.gold < fee) {
            return sock.sendMessage(id, { text: `❌ *مرفوض!* تكلفة استخدام الرادار هي [ ${fee} ] ذهبة، وأنت لا تملكها.` }, { quoted: m });
        }

        // 3. التحقق من المدخلات
        const monsterLevel = parseInt(args[0]);
        if (!monsterLevel || isNaN(monsterLevel) || monsterLevel < 1) {
            return sock.sendMessage(id, { text: "❓ *تحديد الهدف:* يرجى كتابة مستوى الوحش لتحليله.\nمثال: *.احسب 15*" }, { quoted: m });
        }

        // خصم الرسوم
        user.gold -= fee;

        // 4. إعداد بيانات الوحش (مطابقة تماماً لأمر .وحش - 10 ذهب)
        const monster = {
            hp: Math.floor((30 + (monsterLevel * 12)) * 2), 
            atk: Math.floor((5 + (monsterLevel * 4)) * 2),  
            gold: monsterLevel * 10, // تم التعديل ليكون 10 ذهبات ليتوافق مع أمر وحش
            xp: monsterLevel * 20
        };

        let simUserHP = user.hp;
        let simMonsterHP = monster.hp;
        let maxHP = 100 + (user.level * 25);
        let isDeadStart = false;
        
        // إذا كان اللاعب ميتاً، المحاكاة تفترض أنه سيعالج نفسه بالكامل أولاً
        if (simUserHP <= 0) {
            simUserHP = maxHP;
            isDeadStart = true;
        }

        // 5. محاكاة المعركة
        while (simUserHP > 0 && simMonsterHP > 0) {
            simMonsterHP -= user.atk;
            if (simMonsterHP <= 0) break;
            let userDef = user.defense || user.def || 0;
            simUserHP -= Math.max(1, monster.atk - userDef);
        }

        // 6. تنسيق الرسالة الناتجة
        let resultMsg = `📡 *الرَّادَارُ الاسْتِرَاتِيـجِي (V4.2)* 📡\n`;
        resultMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
        resultMsg += `🔍 *تحليل الهدف:* [ Lv.${monsterLevel} ]\n`;
        resultMsg += `📋 بَيَانَاتُ الطَّرَفَيْن:\n`;
        resultMsg += `👤 أَنْتَ ⇠ ⚔️ ${user.atk} | 🛡️ ${user.defense || user.def || 0}\n`;
        resultMsg += `👾 الوحش ⇠ ❤️ ${monster.hp} | ⚔️ ${monster.atk}\n`;
        resultMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        if (simMonsterHP <= 0) {
            const healthLost = (isDeadStart ? maxHP : user.hp) - simUserHP;
            resultMsg += `✅ *الـتـقـدير:* فَوْزٌ مُؤَكَّد 🟢\n`;
            resultMsg += `📉 ضَرَرٌ مُتَوَقَّع: [ ${healthLost} ] نُقْطَة\n`;
            resultMsg += `💰 الرِّبْحُ الصَّافِي: [ ${monster.gold.toLocaleString()} ] ذَهَبَة\n`;
            if (isDeadStart) resultMsg += `\n⚠️ *تنبيه:* الحساب تم بناءً على شفاء كامل.`;
        } else {
            resultMsg += `💀 *الـتـقـدير:* مَهْمَةٌ انْتِحَارِيَّة 🔴\n`;
            resultMsg += `⚠️ سَيَبْقَى لِلْوحْش: [ ${simMonsterHP} ] نُقْطَة حَيَاة\n`;
            resultMsg += `💡 *خُطَّةُ الْعَمَل:* زِدْ دِفَاعَكَ لِيَتَجَاوَزَ [ ${monster.atk} ].\n`;
        }
        
        resultMsg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        resultMsg += `💳 *تَمَّ خَصْمُ 100 ذَهَبَةٍ لِلْمُعَالَجَةِ الْفَنِّيَّة.*`;

        await sock.sendMessage(id, { text: resultMsg }, { quoted: m });
    }
};
