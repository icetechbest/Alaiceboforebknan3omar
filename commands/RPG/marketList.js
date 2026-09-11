module.exports = {
    name: 'سوق-اللاعبين',
    aliases: ['سوق-الاعبين'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        const offers = db.marketplace || [];
        if (offers.length === 0) {
            return sock.sendMessage(id, { text: "📭 مفيش عروض في سوق اللاعبين حاليًا.\nاعرض حاجة بـ .بيع [آيتم] [سعر]" }, { quoted: m });
        }

        const mentions = [];
        let msg = `🛒 *سوق اللاعبين* 🛒\n━━━━━━━━━━━━━━━━━━\n`;
        for (const o of offers.slice(-20)) {
            msg += `#${o.id} — ${o.item} | 💰 ${o.price.toLocaleString()} | البائع: @${o.seller.split('@')[0]}\n`;
            mentions.push(o.seller);
        }
        msg += `━━━━━━━━━━━━━━━━━━\nللشراء: .شراء-عرض [رقم]`;

        await sock.sendMessage(id, { text: msg, mentions }, { quoted: m });
    }
};
