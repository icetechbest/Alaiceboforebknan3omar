const { isParticipantAdmin } = require('../../core/messageHandler.js');

module.exports = {
    name: 'فحص-المحذوفين',
    aliases: ['تنظيف-الاعضاء'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        await sock.sendMessage(groupID, { text: "🔎 جاري فحص أعضاء الجروب... ممكن ياخد شوية وقت." }, { quoted: m });

        const participants = groupMetadata?.participants || [];
        const deletedAccounts = [];

        for (const p of participants) {
            if (p.id.endsWith('@lid')) continue; // مينفعش نفحصه مباشرة من غير رقمه الحقيقي
            try {
                const [result] = await sock.onWhatsApp(p.id);
                // لو onWhatsApp رجّع إن الرقم مش موجود على واتساب خالص، يبقى الحساب اتمسح فعليًا
                if (!result?.exists) {
                    deletedAccounts.push(p.id);
                }
            } catch (e) { /* تجاهل أي خطأ في فحص عضو واحد ومتكملش */ }
        }

        if (deletedAccounts.length === 0) {
            return sock.sendMessage(groupID, { text: "✅ كل الأعضاء عندهم حسابات فعّالة على واتساب." }, { quoted: m });
        }

        let msg = `🗑️ *حسابات محتمل إنها اتمسحت من واتساب* (${deletedAccounts.length})\n━━━━━━━━━━━━━━━━━━\n`;
        deletedAccounts.forEach((jid, i) => { msg += `${i + 1}. @${jid.split('@')[0]}\n`; });
        msg += `━━━━━━━━━━━━━━━━━━\n⚠️ ده فحص تقديري، متأكدش 100%. راجع الأعضاء يدويًا قبل الطرد (مفيش طرد تلقائي).`;

        await sock.sendMessage(groupID, { text: msg, mentions: deletedAccounts }, { quoted: m });
    }
};
