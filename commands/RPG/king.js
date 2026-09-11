const { classTitle, isArcher, getAssassinRank, AMBUSH_COOLDOWN_MS, VOLLEY_COOLDOWN_MS } = require('../../data/classSystem.js');
const { resolveTargetJid } = require('../../core/messageHandler.js');

module.exports = {
    name: 'مملكة',
    aliases: ['ملفي', 'احصائيات', 'مملكني'],
    async execute(sock, m, args, db, sender, isOwner) {
        const id = m.key.remoteJid;

        // تحديد الشخص المستهدف (منشن أو صاحب الرسالة المتعمولها ريبلاي أو صاحب الأمر نفسه)
        // ⚠️ الـ JID بتاع الشخص المستهدف (سواء من منشن أو من contextInfo.participant) ممكن
        // يجيلنا بصيغة "@lid" (نظام إخفاء الرقم بتاع واتساب) مش الرقم الحقيقي اللي مسجل بيه
        // اللاعب في الداتابيز — فلو استخدمناه زي ما هو، البحث في db بيفشل ويطلع "غير مسجل"
        // حتى لو اللاعب مسجل فعلاً. resolveTargetJid بتتولى حل ده (منشن أو ريبلاي، بنفس
        // منطق altJid → lidMap → groupMetadata → fallback للِد الخام لو فيه بيانات محفوظة تحته).
        const groupMetadata = id.endsWith('@g.us') ? await sock.groupMetadata(id).catch(() => null) : null;

        const target = resolveTargetJid(m, db, groupMetadata, { fallbackTo: sender });

        if (!db[target]) return sock.sendMessage(id, { text: "❌ لا توجد بيانات لهذا المحارب." }, { quoted: m });

        const user = db[target];
        const displayName = user.name || "محارب";

        // --- دالة حساب الوقت بناءً على إعدادات الداتابيز لديك ---
        const formatTime = (lastTime, featureKey) => {
            if (!lastTime) return "✅ متاح الآن";
            
            const now = Date.now();
            // جلب وقت الانتظار من قسم settings في ملفك
            const cooldown = db.settings?.cooldowns?.[featureKey] || 0;
            const diff = (lastTime + cooldown) - now;

            if (diff <= 0) return "✅ متاح الآن";
            
            const seconds = Math.floor(diff / 1000);
            if (seconds < 60) return `⏳ بعد ${seconds} ثانية`;
            const minutes = Math.floor(seconds / 60);
            return `⏳ بعد ${minutes} دقيقة`;
        };

        // نفس الفكرة بس بمدة كولداون ثابتة (مش من settings) لميزات نظام الفئات
        const formatFixedTime = (lastTime, cooldownMs) => {
            if (!lastTime) return "✅ متاح الآن";
            const diff = (lastTime + cooldownMs) - Date.now();
            if (diff <= 0) return "✅ متاح الآن";
            const seconds = Math.floor(diff / 1000);
            if (seconds < 60) return `⏳ بعد ${seconds} ثانية`;
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            if (hours > 0) return `⏳ بعد ${hours}س ${minutes % 60}د`;
            return `⏳ بعد ${minutes} دقيقة`;
        };

        // بناء الرسالة بشكل منسق واحترافي
        let statsMsg = `${classTitle(user)} *بطاقة تعريف* ${classTitle(user)}\n`;
        statsMsg += `━━━━━━━━━━━━━━━━━━\n`;
        statsMsg += `👤 *الاسم:* ${displayName}\n`;
        statsMsg += `🎭 الفئة: ${classTitle(user)}\n`;
        statsMsg += `🆙 المستوى: ${user.level || 1}\n`;
        statsMsg += `💰 الذهب: ${(user.gold || 0).toLocaleString()}\n`;
        statsMsg += `❤️ الهيل: ${user.hp || 0}\n`;
        statsMsg += `⚔️ الهجوم: ${user.atk || 0}\n`;
        statsMsg += `🛡️ الدفاع: ${user.defense || user.def || 0}\n`;
        statsMsg += `✨ الخبرة: ${user.xp || 0}\n`;
        
        if (user.currentPet) {
            statsMsg += `🐾 المرافق: ${user.currentPet}\n`;
        }

        statsMsg += `━━━━━━━━━━━━━━━━━━\n`;
        statsMsg += `🕒 *أوقات الفعاليات:*\n`;
        
        // ربط مباشر بمسميات ملفك (وحش، صيد، عجلة، سرقة)
        statsMsg += `🐲 الوحش: ${formatTime(user.lastMonsterBattle, 'وحش')}\n`;
        statsMsg += `🏹 الصيد: ${formatTime(user.lastHunt, 'صيد')}\n`;
        statsMsg += `🎡 العجلة: ${formatTime(user.lastSpin, 'عجلة')}\n`;
        statsMsg += `🥷 السرقة: ${formatTime(user.lastSteal, 'سرقة')}\n`;
        statsMsg += `⚔️ انتصارات PvP: ${user.pvpWins || 0}\n`;
        if (isArcher(user)) {
            statsMsg += `🎯 مرات الصيد: ${user.huntCount || 0}\n`;
            statsMsg += `🏹 الرشق: ${formatFixedTime(user.lastVolley, VOLLEY_COOLDOWN_MS)}\n`;
        }
        if (user.revealed && user.class === 'مغتال') {
            const rank = getAssassinRank(user);
            statsMsg += `🥷 الرتبة: ${rank.label}\n`;
            statsMsg += `🗡️ الاغتيال: ${formatFixedTime(user.lastAmbush, AMBUSH_COOLDOWN_MS)}\n`;
        }
        
        statsMsg += `━━━━━━━━━━━━━━━━━━\n`;
        statsMsg += `🆔 @${target.split('@')[0]}`;

        await sock.sendMessage(id, { 
            text: statsMsg, 
            mentions: [target] 
        }, { quoted: m });
    }
};
