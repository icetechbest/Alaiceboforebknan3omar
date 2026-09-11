module.exports = {
  name: 'الدخول',
  description: 'إرسال روابط جميع المجموعات للمطور',
  category: 'owner',

  async execute(sock, m, args, db, sender, isOwner) {
    // التحقق إن اللي بيستخدم الأمر هو ايس
    if (!isOwner) return sock.sendMessage(m.key.remoteJid, { text: '🌑 *هذا الأمر خاص بملك الظلال ايس فقط.*' }, { quoted: m });

    try {
      const getGroups = await sock.groupFetchAllParticipating();
      const groups = Object.values(getGroups);
      
      if (groups.length === 0) return sock.sendMessage(m.key.remoteJid, { text: '⚠️ البوت لا يتواجد في أي مجموعة حالياً.' }, { quoted: m });

      await sock.sendMessage(m.key.remoteJid, { text: `❄️ *جاري تحضير بوابات الدخول.. تفقد الخاص يا ايس.*` }, { quoted: m });

      let report = `🌑 *𝐌𝐘 𝐊𝐈𝐍𝐆𝐃𝐎𝐌𝐒 (𝐆𝐑𝐎𝐔𝐏𝐒)* 🌑\n━━━━━━━━━━━━━━\n`;
      
      for (let group of groups) {
        try {
          // البوت بيحاول يجيب رابط الدعوة
          const code = await sock.groupInviteCode(group.id);
          report += `🔹 *المملكة:* ${group.subject}\n🔗 *الرابط:* https://chat.whatsapp.com/${code}\n\n`;
        } catch {
          // لو البوت مش أدمن مش هيقدر يجيب الرابط
          report += `🔹 *المملكة:* ${group.subject}\n❌ (البوت ليس أدمن لاستخراج الرابط)\n\n`;
        }
      }

      report += `━━━━━━━━━━━━━━\n✍︎ 𝐃𝐄𝐕: 𝐈𝐂𝐄\n*“ 𝐀 𝐑 𝐈 𝐒 𝐄 ”*`;

      // إرسال الروابط للمطور في الخاص
      await sock.sendMessage(sender, { text: report });

    } catch (error) {
      console.error('❌ Error:', error);
      await sock.sendMessage(m.key.remoteJid, { text: '⚠️ حدث خطأ أثناء فتح البوابات.' }, { quoted: m });
    }
  }
};
