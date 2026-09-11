const { resolveTargetJid } = require('../../core/messageHandler.js');
module.exports = {
    name: 'تحرش',
    aliases: ['ت'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        
        // 1. التأكد من المنشن
        const mentionedJid = resolveTargetJid(m, db, null, {});
        if (!mentionedJid) return sock.sendMessage(id, { text: "⚠️ ┇ منشن الشخص اللي عايز تهزر معاه!" }, { quoted: m });

        if (mentionedJid === sender) return sock.sendMessage(id, { text: "🧐 ┇ بلاش قلة أدب مع نفسك يا حبيبي!" }, { quoted: m });

        // 2. قائمة الردود الكوميدية (الهزار)
        const pranks = [
            "🌚 ┇ حاول يتحرش بيه بس الضحية طلع معاه حزام أسود واداله علقة موت!",
            "🏃‍♂️ ┇ اول ما قرب منه، الضحية صرخ 'حراميييي' والمنطقة كلها جريت وراه!",
            "💖 ┇ قلب لموقف رومانسي وفجأة بقوا أعز أصحاب.. سيبوا القرف ده بقى!",
            "👮‍♂️ ┇ البوت قفشك وأنت بتتحرش وبلغ عنك الحكومة، استعد للبوكس!",
            "🤮 ┇ الضحية طلع مش مستحمي بقاله أسبوع، السارق جاله إغماء من الريحة!",
            "🤡 ┇ قعد يغمزله ساعة والضحية طلع أصلاً مش شايفه.. شكلك وحش أوي!",
            "👊 ┇ خد قلم محترم خلى سنانه تقع في إيده.. تستاهل!",
            "📸 ┇ تم تصويرك وأنت بتحاول تتحرش، الفيديو نزل على تيك توك وفضحتنا!",
            "🤫 ┇ الضحية قاله: 'هقول لمراتك'.. السارق جري واختفى من الجروب!"
        ];

        // اختيار رد عشوائي
        const result = pranks[Math.floor(Math.random() * pranks.length)];

        // 3. إرسال الرسالة بشكل منسق
        const response = `🎭 ┇ *مَوقف كوميدي - SUNG*\n━━━━━━━━━━━━━━\n👤 ┇ *المتحرش:* @${sender.split('@')[0]}\n🎯 ┇ *الضحية:* @${mentionedJid.split('@')[0]}\n\n🎬 ┇ *اللي حصل:* \n${result}\n━━━━━━━━━━━━━━`;

        await sock.sendMessage(id, { 
            text: response, 
            mentions: [sender, mentionedJid] 
        }, { quoted: m });
    }
};
