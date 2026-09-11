const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  name: 'بوم', // غيرتها من command لـ name عشان البوت يشوفها
  description: '💣 يبدأ العد التنازلي للبوم ثم يطرد الأعضاء!',
  category: 'DEVELOPER',

  async execute(sock, m, args, db, sender, isOwner) {
    const groupID = m.key.remoteJid;

    // 1. التأكد إن اللي بيبعت الأمر هو الاونر — أي حد تاني بيتجاهل تمامًا من غير أي رد
    if (!isOwner) {
      return;
    }

    // 2. التأكد إن الأمر في مجموعة
    if (!groupID.endsWith('@g.us')) {
      return sock.sendMessage(groupID, { text: '⚠️ هذا الأمر يعمل في المجموعات فقط!' });
    }

    try {
      // رسائل البداية
      await sock.sendMessage(groupID, { text: '🔥 *𝐀𝐂𝐓𝐈𝐕𝐀𝐓𝐄 𝐓𝐇𝐄 𝐓𝐈𝐌𝐄 𝐁𝐎𝐌𝐁* 💣' });
      await sleep(1000);
      await sock.sendMessage(groupID, { text: '⏳ *𝐒𝐓𝐀𝐑𝐓𝐈𝐍𝐆 𝐓𝐇𝐄 𝐂𝐎𝐔𝐍𝐓𝐃𝐎𝐖𝐍!* 🔥' });

      // العد التنازلي
      for (let i = 5; i >= 1; i--) {
        await sleep(1000);
        await sock.sendMessage(groupID, { text: `*⏰ ${i}...*` });
      }

      await sock.sendMessage(groupID, { text: '*💥 𝙱𝙾𝙾𝙼! 𝐆𝐀𝐌𝐄 𝐎𝐕𝐄𝐑* 💣🔥' });

      // 3. جلب الأعضاء وتنفيذ الطرد
      const groupMetadata = await sock.groupMetadata(groupID);
      const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      
      // استثناء البوت والمالك من الطرد
      const toRemove = groupMetadata.participants
        .filter(p => p.id !== botNumber && p.id !== sender && !p.admin) 
        .map(p => p.id);

      if (toRemove.length > 0) {
        // تنفيذ الطرد على دفعات (عشان الواتساب ميبندش البوت)
        await sock.groupParticipantsUpdate(groupID, toRemove, 'remove');
        
        await sock.sendMessage(groupID, {
          text: `🚀 *𝐄𝐗𝐄𝐂𝐔𝐓𝐈𝐎𝐍 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐄*\nتم تصفية ${toRemove.length} عضو بنجاح! 🔥`
        });
      } else {
        await sock.sendMessage(groupID, { text: '⚠️ لا يوجد أعضاء (غير المشرفين) لتصفيتهم!' });
      }

    } catch (error) {
      console.error(error);
      await sock.sendMessage(groupID, { text: '❌ البوت ليس مشرفاً (Admin) أو حدث خطأ في النظام!' });
    }
  }
};
