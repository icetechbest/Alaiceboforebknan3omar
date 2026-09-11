module.exports = {
    name: 'ترتيب',
    aliases: ['الاغنى', 'الاوائل'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // 1. تحويل قاعدة البيانات إلى مصفوفة (Array) لسهولة الترتيب
        let players = Object.keys(db).map(key => {
            return {
                jid: key,
                name: db[key].name || "لاعب مجهول",
                gold: db[key].gold || 0,
                level: db[key].level || 1
            };
        });

        // 2. ترتيب اللاعبين من الأكبر للأصغر بناءً على الذهب
        players.sort((a, b) => b.gold - a.gold);

        // 3. أخذ أول 10 لاعبين فقط
        let topTen = players.slice(0, 10);

        if (topTen.length === 0) {
            return sock.sendMessage(id, { text: "⚠️ لا يوجد لاعبين مسجلين بعد." }, { quoted: m });
        }

        // 4. بناء الرسالة
        let msg = `🏆 *قائمة أغنى 10 ملوك في المملكة* 🏆\n`;
        msg += `━━━━━━━━━━━━━━━━━━\n\n`;

        topTen.forEach((player, index) => {
            let medal = "";
            if (index === 0) medal = "🥇";
            else if (index === 1) medal = "🥈";
            else if (index === 2) medal = "🥉";
            else medal = `${index + 1}.`;

            msg += `${medal} *${player.name}*\n`;
            msg += `💰 الذهب: ${player.gold.toLocaleString()}\n`;
            msg += `⭐ المستوى: ${player.level}\n`;
            msg += `━━━━━━━━━━━━━━━━━━\n`;
        });

        msg += `\n👑 هل يمكنك الوصول للقمة؟`;

        await sock.sendMessage(id, { text: msg }, { quoted: m });
    }
};

