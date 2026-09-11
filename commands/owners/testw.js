module.exports = {
  name: 'تستو',
  category: 'tools',
  async execute(sock, m) {
    try {
      const id = m.key.remoteJid;
      const sender = m.key.participant || m.participant || id;
      
      // حساب سرعة الرد (بنج وهمي سريع)
      const ping = Math.floor(Math.random() * 50) + 10; 

      const messageText = `
🌑 *𝐒𝐔𝐍𝐆 𝐉𝐈𝐍-𝐖𝐎𝐎 | 𝐈𝐂𝐄*
━━━━━━━━━━━━━━
💠 *𝐒𝐲𝐬𝐭𝐞𝐦:* Online
🔋 *𝐄𝐧𝐞𝐫𝐠𝐲:* 𝐈𝐧𝐟𝐢𝐧𝐢𝐭𝐞
⚡ *𝐏𝐢𝐧𝐠:* ${ping}ms
👤 *𝐌𝐚𝐬𝐭𝐞𝐫:* @${sender.split('@')[0]}
━━━━━━━━━━━━━━
   *“ 𝐀 𝐑 𝐈 𝐒 𝐄 . . ”*
      `.trim();

      // إرسال النص مع المنشن (بدون AdReply المعقد عشان ما يهنجش)
      await sock.sendMessage(id, { 
        text: messageText,
        mentions: [sender]
      }, { quoted: m });

    } catch (error) {
      console.error('❌ Error in Testo:', error);
    }
  }
};

