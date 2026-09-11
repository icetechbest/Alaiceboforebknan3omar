const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'بوسه',
  aliases: ['قبله', 'امواح', 'بوسنى'],
  category: 'fun',
  async execute(sock, m, args, db, sender) {
    const id = m.key.remoteJid;
    const name = m.pushName || 'يا سكر';

    const responses = [
      `امواااااح 💋، دي أحلى بوسة جاتلي انهارده من ${name}!`,
      `يا روحي.. خجلتني أوي خد بوسة أكبر منها اهي "امواااح" 💋😘`,
      `البوسة دي سكر زي صاحبها بالظبط.. تسلملي يا ${name} ❤️`,
      `قلبي الصغير لا يتحمل كل هذا الحب 🎀💋.. ربنا يخليك ليا`,
      `💋 القبلة دي خلت يومي كله سعادة.. شكراً يا عسل!`,
      `أحلى بوسة من أغلى شخص.. تعيش وتدلعني كدة دايماً 🌸`,
      `امواه.. البوسة دي محتاجة ريكورد مخصوص عشان أعبر عن فرحتي 💋`,
      `يا نهار أبيض على الدلع! البوسة دي ثبتتني مكاني والله 😂❤️`,
      `بوسة مقبولة يا جميل.. بس متعودنيش على كدة عشان بضعف 😌💋`,
      `شفايغي نورت من بوستك يا ${name}.. ميرسي يا ذوق ✨`,
      `أنا بدأت أحبك بجد.. البوسة دي ليها مفعول السحر 🪄❤️`,
      `يا واد يا شقي.. بوسة في نص الجروب كدة؟ ماشي يا عم 🙈💋`,
      `امواااااح.. دي بوسة "آيس" خصوصي ليك عشان أنت غالي ❄️💖`,
      `الجروب كله حسدني على البوسة دي.. ربنا يحفظك ليا 💋🧿`,
      `أنت شكلك ناوي توقعني في حبك يا ${name}.. بوسة تجنن! 😘`,
      `يا أرض احفظي ما عليكي.. البوسة دي جاية من أحلى حد 💋👑`,
      `رقة وحنية ودلع.. كل ده في بوسة واحدة؟ 🎀✨`,
      `لو كل البوس كدة.. أنا عايز منك واحدة كل دقيقة 💋😉`,
      `يا عيني على الرومانسية.. البوسة دي دخلت قلبي مش بس شاشتي ❤️`,
      `تسلم شفايفك اللي بعتت السكر ده كله.. اموااااح 💋🍭`
    ];

    const randomText = responses[Math.floor(Math.random() * responses.length)];
    const dataDir = path.join(process.cwd(), 'data');
    const soundFiles = fs.readdirSync(dataDir).filter(file => file.startsWith('kiss'));
    const randomSound = soundFiles[Math.floor(Math.random() * soundFiles.length)];

    try {
      await sock.sendMessage(id, { text: `💋 | ${randomText}`, mentions: [sender] }, { quoted: m });

      if (randomSound) {
        await sock.sendMessage(id, { 
          audio: fs.readFileSync(path.join(dataDir, randomSound)), 
          mimetype: 'audio/mpeg', // عشان يشتغل كأغنية مش فويس معلق
          ptt: false 
        }, { quoted: m });
      }
      await sock.sendMessage(id, { react: { text: "😘", key: m.key } });
    } catch (e) { console.log(e); }
  }
};

