const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'تنمر',
  description: 'أمر التنمر على الضعفاء',
  category: 'fun',
  async execute(sock, m, args, db, sender) {
    const id = m.key.remoteJid;
    const name = m.pushName || 'يا هلفوت';

    // قائمة الجمل التنمورية المستفزة
    const roastResponses = [
      `بص في المراية الأول وبعدين تعالى كلمني يا ${name}.. 🤮`,
      `أنا لو مكالك أختفي من الجروب ده فوراً، جبهتك طارت! 😂`,
      `هو ده شكلك الحقيقي ولا أنت عامل "فلتر" الرعب؟ 🤡`,
      `يا جماعة حد يدي ${name} أي اهتمام، شكله هيعيط من التهميش.. 🤫`,
      `ذكائك عامل زي رصيد موبايلي.. خلصان ومحتاج شحن! 📉`,
      `أنت محتاج كتالوج عشان تفهم إحنا بنقول إيه يا بطيء.. 🐢`,
      `وجهك ده محتاج "إعادة ضبط مصنع" من كتر القبح.. 🛠️`,
      `مستواك تحت الصفر.. متتعبش نفسك وتحاول تظهر يا ${name}.`
    ];

    const randomRoast = roastResponses[Math.floor(Math.random() * roastResponses.length)];
    const audioPath = path.join(process.cwd(), 'data', 'fakelaug.mp3');

    try {
      // 1. إرسال الجملة التنمورية
      await sock.sendMessage(id, { 
        text: `😈 | ${randomRoast}`,
        mentions: [sender]
      }, { quoted: m });

      // 2. إرسال صوت الضحكة المستفزة (fakelaug.mp3)
      if (fs.existsSync(audioPath)) {
        await sock.sendMessage(id, { 
          audio: fs.readFileSync(audioPath), 
          mimetype: 'audio/mpeg',
          ptt: false // يتبعت كملف صوتي عشان يشتغل دايماً
        }, { quoted: m });
      }

      // 3. رياكشن مستفز
      await sock.sendMessage(id, { 
        react: { text: "🤣", key: m.key } 
      });

    } catch (error) {
      console.error('Error in Roast Command:', error);
    }
  }
};
