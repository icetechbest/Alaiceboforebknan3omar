module.exports = {
    name: 'رسترت',
    aliases: ['اعادة-تشغيل'],
    async execute(sock, m, args, db, sender, isOwner) {
        // التحقق إن اللي بيكتب الأمر هو المطور (آيس)
        // المتغير isOwner مبعوت جاهز من الملف الرئيسي
        if (!isOwner) {
            return sock.sendMessage(m.key.remoteJid, { text: "⚠️ هذا الأمر مخصص للمطور *آيس* فقط." });
        }

        await sock.sendMessage(m.key.remoteJid, { 
            text: "🔄 جارٍ إعادة تشغيل النظام... سأعود خلال ثوانٍ يا آيس." 
        }, { quoted: m });

        // تنفيذ الإغلاق بعد 2 ثانية
        // وبما إننا بنشغل البوت من launcher.js، هو هيقوم بالباقي ويفتحه تاني
        setTimeout(() => {
            process.exit();
        }, 2000);
    }
};
