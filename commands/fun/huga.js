const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'حضن',
  aliases: ['احضني', 'طبطبه', 'ضمني'],
  category: 'fun',
  async execute(sock, m, args, db, sender) {
    const id = m.key.remoteJid;
    const name = m.pushName || 'يا قمر';

    const responses = [
      `تعالى في حضني يا ${name}.. كلك حنية والله 🤗❤️`,
      `أقوى حضن في الدنيا لعيونك.. ربي ما يحرمني منك ✨`,
      `أحلى وأجمل حضن دافي.. حسيته وصل لقلبي بجد 🌸💖`,
      `يا روحي.. خد حضن كبير أوي أهو "🫂" عشان تفرفش!`,
      `طبطبة كبيرة على قلبك يا ${name}.. أنت تستاهل كل خير 🧸`,
      `الحضن ده مخصوص ليك عشان أنت حد سكر وعسول خالص 💋🫂`,
      `🫂 أحلى حضن ده ولا إيه؟ حاسس بالدفا من هنا!`,
      `لو زعلان فـ الحضن ده عشانك.. ارمي حمولك عليا يا ${name} 💖`,
      `حضن ملكي مخصوص لأغلى ${name} في المجرة 🫂👑`,
      `غمض عينك واستمتع بالحضن ده.. كلك طاقة إيجابية 🫂✨`,
      `محتاجين الحضن ده من زمان.. ريحت قلبي والله 🤗`,
      `يا بختي بيك وبحضنك اللي يرد الروح ده 🫂❤️`,
      `أنا والحضن ملك ايديك.. اؤمر يا قمر 💖🫂`,
      `خليك في حضني شوية.. الجو بره برد وأنت دفايا ❄️🫂`,
      `أجدع وأطمن حضن ممكن تاخده في حياتك هو ده 🫂💪`,
      `ممنوع الخروج من الحضن ده قبل 5 دقايق.. ده قانون الجمال! 🫂😂`,
      `يا روح قلبي من جوه.. الحضن ده طبطبة على كل وجع 🫂🩹`,
      `أنت أصلاً حتة من قلبي.. فـ الحضن ده مكانك الطبيعي 🫂❤️`,
      `تعالى استخبي في حضني من العالم كله.. أنا أمانك 🫂🛡️`,
      `يا جماله يا جماله.. حضن ينسي الهموم والله 🤗✨`
    ];

    const randomText = responses[Math.floor(Math.random() * responses.length)];
    const dataDir = path.join(process.cwd(), 'data');
    const soundFiles = fs.readdirSync(dataDir).filter(file => file.startsWith('hug'));
    const randomSound = soundFiles[Math.floor(Math.random() * soundFiles.length)];

    try {
      await sock.sendMessage(id, { text: `🫂 | ${randomText}`, mentions: [sender] }, { quoted: m });

      if (randomSound) {
        await sock.sendMessage(id, { 
          audio: fs.readFileSync(path.join(dataDir, randomSound)), 
          mimetype: 'audio/mpeg',
          ptt: false 
        }, { quoted: m });
      }
      await sock.sendMessage(id, { react: { text: "🫂", key: m.key } });
    } catch (e) { console.log(e); }
  }
};
