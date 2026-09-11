const { isParticipantAdmin } = require('../../core/messageHandler.js');
const fs = require('fs');

module.exports = {
    name: 'الاعضاء-الصامتين',
    aliases: ['الاعضاء-الغير-نشطين'],
    async execute(sock, m, args, db, sender, isOwner) {
        const groupID = m.key.remoteJid;
        if (!groupID.endsWith('@g.us')) {
            return sock.sendMessage(groupID, { text: "⚠️ الأمر ده يشتغل في الجروبات بس." }, { quoted: m });
        }

        const groupMetadata = await sock.groupMetadata(groupID).catch(() => null);
        if (!isOwner && !isParticipantAdmin(groupMetadata, sender, db)) {
            return sock.sendMessage(groupID, { text: "❌ الأمر ده لأدمن الجروب فقط." }, { quoted: m });
        }

        const days = parseInt(args[0], 10) || 7;

        let stats = {};
        try { stats = JSON.parse(fs.readFileSync('./stats.json', 'utf-8')); } catch (e) { /* فاضية */ }
        const groupStats = stats[groupID] || {};

        // بنجمع كل الـ dayKeys اللي دخلت في نطاق الفترة المطلوبة
        const dayKeys = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dayKeys.push(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
        }

        const activeMembers = new Set(
            Object.keys(groupStats).filter(jid =>
                dayKeys.some(dk => (groupStats[jid]?.daily?.[dk] || 0) > 0)
            )
        );

        const allMembers = (groupMetadata?.participants || []).map(p => p.id);
        const silent = allMembers.filter(jid => !activeMembers.has(jid));

        if (silent.length === 0) {
            return sock.sendMessage(groupID, { text: `🎉 كل الأعضاء كتبوا رسالة واحدة على الأقل في آخر ${days} يوم.` }, { quoted: m });
        }

        let msg = `🤐 *الأعضاء الصامتين (آخر ${days} يوم)* — ${silent.length} عضو\n━━━━━━━━━━━━━━━━━━\n`;
        silent.slice(0, 50).forEach((jid, i) => { msg += `${i + 1}. @${jid.split('@')[0]}\n`; });
        if (silent.length > 50) msg += `\n... و${silent.length - 50} عضو تاني`;

        await sock.sendMessage(groupID, { text: msg, mentions: silent.slice(0, 50) }, { quoted: m });
    }
};
