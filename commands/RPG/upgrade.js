module.exports = {
    name: 'تطور',
    aliases: ['up'],
    async execute(sock, m, args, db, sender, isOwner) {
        const { ensurePlayerDefaults, UPGRADE_COOLDOWN_MS } = require('../../data/classSystem.js');
        const id = m.key.remoteJid;

        // 1. التأكد من وجود بيانات للاعب
        if (!db[sender]) {
            db[sender] = { gold: 0, level: 1, xp: 0, hp: 100, atk: 10, def: 10 };
        }
        ensurePlayerDefaults(db[sender]);

        const user = db[sender];

        // --- [ كولداون التطور ] ---
        // كان الأمر بدون أي انتظار، فأي حد معاه ذهب كفاية يقدر يعمل "سبام"
        // تطور ورا بعض ويكدّس هجوم/دفاع بسرعة غير طبيعية، وده بيكسر توازن
        // المواجهات (.مواجهة) والكمائن حتى ضد لاعبين مستواهم أعلى فعلياً.
        const cooldown = db.settings?.cooldowns?.['تطور'] || UPGRADE_COOLDOWN_MS;
        const now = Date.now();
        if (user.lastUpgrade && now - user.lastUpgrade < cooldown) {
            const remaining = cooldown - (now - user.lastUpgrade);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            return sock.sendMessage(id, {
                text: `⌛ *جسدك محتاج راحة قبل التطور التاني!*\nعُد بعد: [ ${minutes}د و ${seconds}ث ] 💪`
            }, { quoted: m });
        }

        const currentLevel = user.level || 1;
        
        // 2. حساب تكلفة التطوير (تزيد كلما ارتفع المستوى)
        const upgradeCost = currentLevel * 1000; 

        // 3. التحقق من امتلاك الذهب الكافي
        if ((user.gold || 0) < upgradeCost) {
            return sock.sendMessage(id, { 
                text: `⚠️ تحتاج إلى *${upgradeCost.toLocaleString()}* ذهبة لتتطور للمستوى ${currentLevel + 1}.\n💰 رصيدك الحالي: *${(user.gold || 0).toLocaleString()}*` 
            }, { quoted: m });
        }

        // 4. تنفيذ التطوير وزيادة الإحصائيات
        db[sender].gold -= upgradeCost;
        db[sender].level = currentLevel + 1;
        db[sender].lastUpgrade = now;
        
        // زيادة الإحصائيات بشكل عشوائي أو ثابت
        const hpBoost = Math.floor(Math.random() * 20) + 10;   // زيادة الهيل بين 10-30
        const atkBoost = Math.floor(Math.random() * 5) + 2;    // زيادة الهجوم بين 2-7
        const defBoost = Math.floor(Math.random() * 5) + 2;    // زيادة الدفاع بين 2-7

        db[sender].hp = (user.hp || 100) + hpBoost;
        db[sender].atk = (user.atk || 10) + atkBoost;
        db[sender].def = (user.def || 10) + defBoost;

        // 5. رسالة النجاح
        let msg = `✨ *ارتقاء بمستوى المحارب* ✨\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `🆙 المستوى الجديد: *${db[sender].level}*\n`;
        msg += `❤️ زيادة الهيل: +${hpBoost}\n`;
        msg += `⚔️ زيادة الهجوم: +${atkBoost}\n`;
        msg += `🛡️ زيادة الدفاع: +${defBoost}\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n`;
        msg += `💰 تم خصم ${upgradeCost.toLocaleString()} ذهبة من رصيدك.`;

        await sock.sendMessage(id, { text: msg }, { quoted: m });

        // إشعار لو الدفاع الجديد تخطى عتبة مهمة (يفيد المحارب ضد الاغتيال)
        const { notifyDefenseMilestones } = require('../../data/classSystem.js');
        await notifyDefenseMilestones(sock, sender, db[sender], id);

        const { checkAchievements } = require('../../data/achievements.js');
        await checkAchievements(db, sender, sock, id);
    }
};
