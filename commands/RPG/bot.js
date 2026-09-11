const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'بوت',
    aliases: [ 'song'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const isGroup = id.endsWith('@g.us');
        
        // جلب اسم الجروب
        let groupName = "الرسائل الخاصة";
        try {
            if (isGroup) {
                const metadata = await sock.groupMetadata(id);
                groupName = metadata.subject;
            }
        } catch (e) { groupName = "المجموعة"; }

        // إعدادات الوقت والتاريخ
        const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        const date = new Date().toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });

        // الرسالة النصية
        let welcomeMsg = `┏━━━ ❪ *𝐒𝐔𝐍𝐆 𝐁𝐎𝐓* ❫ ━━━┓\n\n`;
        welcomeMsg += `✨ *أهلاً بك يا* ${m.pushName || 'بطل'} *في:*\n`;
        welcomeMsg += `🔱 *${groupName}*\n\n`;
        welcomeMsg += `⏰ *الـوقت:* ${time}\n`;
        welcomeMsg += `📅 *التاريخ:* ${date}\n\n`;
        welcomeMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
        welcomeMsg += `👋 أنا خادمكم المطيع *𝐒𝐔𝐍𝐆 𝐁𝐎𝐓*\n\n`;
        welcomeMsg += `⚔️ جاهز لخوض الحروب وتطوير الممالك\n`;
        welcomeMsg += `🎮 وقت المتعة والفعاليات قد بدأ الآن\n`;
        welcomeMsg += `🛡️ حماية وتطوير ونظام كامل بين يديك\n\n`;
        welcomeMsg += `━━━━━━━━━━━━━━━━━━\n\n`;
        welcomeMsg += `👑 *المطور العظيم:* ( *ايـس* ❤️ )\n\n`;
        welcomeMsg += `🛡️ *جروب التجارب:* \nhttps://chat.whatsapp.com/Lcg43LplrYI19z8i7lx1t0\n\n`;
        welcomeMsg += `💎 *الجروب الأساسي:* \nhttps://chat.whatsapp.com/GF0i4pbpkzXIMC2udhelNT\n\n`;
        welcomeMsg += `┗━━ ❪ *𝐒𝐔𝐍𝐆 𝐁𝐎𝐓* ❫ ━━┛`;

        // تحديد مسار الصورة في مجلد data
        // المسار يفترض أن مجلد data بجانب مجلد الأوامر
        const imagePath = path.join(__dirname, '../../data/song.jpg'); 

        try {
            // التحقق من وجود الملف قبل الإرسال
            if (fs.existsSync(imagePath)) {
                await sock.sendMessage(id, { 
                    image: fs.readFileSync(imagePath), // قراءة الملف من الجهاز
                    caption: welcomeMsg,
                    contextInfo: {
                        mentionedJid: [sender],
                        externalAdReply: {
                            title: `𝐒𝐔𝐍𝐆 𝐒𝐘𝐒𝐓𝐄𝐌: ${groupName}`,
                            body: "Developed by Ice ❤️",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }, { quoted: m });
            } else {
                // إذا لم يجد الصورة في المجلد يرسل النص ويخبرك في الكونسول
                console.log("⚠️ تنبيه: لم يتم العثور على الصورة في المسار: " + imagePath);
                await sock.sendMessage(id, { text: welcomeMsg }, { quoted: m });
            }
        } catch (error) {
            console.error("خطأ أثناء إرسال الصورة المحلية:", error);
            await sock.sendMessage(id, { text: welcomeMsg }, { quoted: m });
        }
    }
};
