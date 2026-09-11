const { ITEMS } = require('../../data/shopItems.js');

module.exports = {
    name: 'متجر حيوانات',
    aliases: ['متجر_حيوانات', 'السوق حيوانات', 'shop animals', 'حيوانات المتجر'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // متجر الحيوانات/الرفقاء فقط - بنفس الأرقام الأصلية في المتجر العام
        const entries = Object.entries(ITEMS).filter(([, item]) => item.type === "pet");

        let shopMsg = `🐾 *مَتْجَرُ الْحَيَوَانَاتِ - الرُّفَقَاء* 🐾\n`;
        shopMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        entries.forEach(([num, item], index) => {
            const priceLabel = item.cost >= 1000000
                ? `${(item.cost / 1000000).toLocaleString()}M`
                : item.cost.toLocaleString();
            shopMsg += `*${num}.* ${item.name} ⇠ [ *${priceLabel}* ]\n`;
            if ((index + 1) % 20 === 0) {
                shopMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
            }
        });

        shopMsg += `\n🛒 لِلشِّرَاء ارْسِل: *.شراء [الرقم]*\n📖 لِلتَّفَاصِيل ارْسِل: *.تفاصيل [الرقم]*\n⚠️ ملاحظة: شراء رفيق جديد يستبدل رفيقك الحالي تلقائياً.\n🏛️ لِمَتْجَرِ الْعَنَاصِرِ ارْسِل: *.متجر*`;

        await sock.sendMessage(id, { text: shopMsg }, { quoted: m });
    }
};
