module.exports = {
    name: 'خزينة',
    aliases: ['خزينة_المملكة'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const treasury = db.treasury || 0;

        await sock.sendMessage(id, {
            text: `🏛️ *خزينة المملكة* 🏛️\n━━━━━━━━━━━━━━━━━━━━\n💰 الرصيد الحالي: ${treasury.toLocaleString()} ذهب\n📜 المصادر:\n  • ضريبة 5% من كل عملية اغتيال ناجحة\n  • ضريبة كل عملية .تحويل بين اللاعبين\n  • ضريبة كل .تبرع لخزينة عصابة\n━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: m });
    }
};
