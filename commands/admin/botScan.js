module.exports = {
    name: 'فحص-بوتات',
    aliases: ['كشف-بوتات'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        const participantInfo = groupMetadata?.participants?.find(p => p.id === sender);
        const isAdmin = participantInfo?.admin === 'admin' || participantInfo?.admin === 'superadmin';
        if (!isAdmin && !isOwner) {
            return sock.sendMessage(groupID, { text: "🚫 هذا الأمر للمشرفين أو المالك فقط!" }, { quoted: m });
        }

        const suspects = db[groupID]?.suspectedBots || {};
        const entries = Object.entries(suspects).filter(([, v]) => !v.whitelisted && v.hits > 0);

        if (entries.length === 0) {
            return sock.sendMessage(groupID, { text: "✅ مفيش أي حساب مشتبه فيه حاليًا في هذا الجروب." }, { quoted: m });
        }

        let msg = `🤖 *حسابات مشتبه بيها كبوتات*\n━━━━━━━━━━━━━━\n`;
        msg += `⚠️ ده كشف تقديري مش مضمون ١٠٠٪، راجع كل حالة يدويًا قبل أي إجراء.\n\n`;
        const mentions = [];
        entries.forEach(([jid, info], i) => {
            mentions.push(jid);
            msg += `${i + 1}. @${jid.split('@')[0]}\n   الإشارات: ${info.reasons.join('، ')}\n   عدد المرات: ${info.hits}\n`;
        });
        msg += `\nلو أي حساب موثوق، رد على رسالته بـ .استثناء-بوت`;

        await sock.sendMessage(groupID, { text: msg, mentions }, { quoted: m });
    }
};
