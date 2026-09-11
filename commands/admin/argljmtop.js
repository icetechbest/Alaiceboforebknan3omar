const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'توب',
    aliases: ['توب-الرسائل', 'متفاعلين', 'top'],
    async execute(sock, m, args, db, sender, isOwner, botData) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) return sock.sendMessage(groupID, { text: "❌ هذا الأمر للمجموعات فقط." });

        // تحديد مسار ملف الإحصائيات (يفضل فصله عن الداتابيز الأساسية لسرعة الأداء)
        const statsPath = path.join(__dirname, '../../stats.json');
        if (!fs.existsSync(statsPath)) fs.writeFileSync(statsPath, JSON.stringify({}));
        
        let stats = JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
        
        if (!stats[groupID]) {
            return sock.sendMessage(groupID, { text: "⚠️ لا توجد إحصائيات مسجلة لهذه المجموعة بعد. ابدأوا بالدردشة الآن!" });
        }

        const type = args[0]; // (يوم / شهر / سنة)
        const now = new Date();
        let key = "";
        let typeName = "";

        // ذكاء التحديد الزمني
        if (type === 'يوم' || type === 'اليوم') {
            key = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
            typeName = "اليوم";
        } else if (type === 'شهر' || type === 'الشهر') {
            key = `${now.getFullYear()}-${now.getMonth()+1}`;
            typeName = "هذا الشهر";
        } else {
            key = `${now.getFullYear()}`;
            typeName = "هذا العام";
        }

        // جلب وترتيب المتفاعلين
        const groupData = stats[groupID];
        let sorted = Object.keys(groupData)
            .map(user => {
                let count = 0;
                if (typeName === "اليوم") count = groupData[user].daily?.[key] || 0;
                else if (typeName === "هذا الشهر") count = groupData[user].monthly?.[key] || 0;
                else count = groupData[user].yearly?.[key] || 0;
                return { user, count };
            })
            .filter(u => u.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // توب 10

        if (sorted.length === 0) {
            return sock.sendMessage(groupID, { text: `❌ لا توجد رسائل مسجلة لـ ${typeName} حتى الآن.` });
        }

        // الحصول على اسم الجروب
        const groupMetadata = await sock.groupMetadata(groupID);
        
        // بناء الرسالة بتنسيق "آيس" الملكي
        let txt = `🏆 *﹝ لَوْحَةُ شَرَفِ المُتَفَاعِلِينَ ﹞* 🏆\n`;
        txt += `📊 الفئة: *${typeName}*\n`;
        txt += `📍 المجموعة: *${groupMetadata.subject}*\n`;
        txt += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        sorted.forEach((u, i) => {
            let medal = "";
            if (i === 0) medal = "🥇 الملك: ";
            else if (i === 1) medal = "🥈 الوصيف: ";
            else if (i === 2) medal = "🥉 القائد: ";
            else medal = `🎖️ المركز ${i + 1}: `;
            
            txt += `${medal} @${u.user.split('@')[0]}\n`;
            txt += `╰┈✨ الرسائل: [ *${u.count}* ]\n\n`;
        });

        txt += `━━━━━━━━━━━━━━━━━━━━\n`;
        txt += `👑 نـظـام آيـس لـلإحـصـائـيـات`;

        await sock.sendMessage(groupID, { 
            text: txt, 
            mentions: sorted.map(u => u.user),
            contextInfo: {
                externalAdReply: {
                    title: `إحصائيات التفاعل الزمني`,
                    body: `يتم التحديث تلقائياً مع كل رسالة`,
                    mediaType: 1,
                    thumbnailUrl: "https://telegra.ph/file/default-icon.jpg", // ضع صورتك هنا
                    sourceUrl: ""
                }
            }
        }, { quoted: m });
    }
};
