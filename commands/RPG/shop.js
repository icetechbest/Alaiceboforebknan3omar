const { getShopItems } = require('../../core/shopCatalog.js');
const { classTitle } = require('../../data/classSystem.js');

module.exports = {
    name: 'متجر',
    aliases: ['السوق', 'shop', 'متجر عناصر', 'متجر_عناصر'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        // ⚠️ الكتالوج بيتعرض كامل لكل الناس (بما فيهم العناصر الحصرية لفئة
        // معينة) - عشان عرض المتجر نفسه ميبقاش وسيلة لمعرفة فئة حد سرية.
        // القيد الفعلي بيتطبق وقت الشراء بس (.شراء)، برسالة عامة مش بتفضح حد.
        const entries = Object.entries(getShopItems(db)).filter(([, item]) => item.type !== "pet");

        let shopMsg = `🏛️ *مَتْجَرُ الْعَنَاصِرِ - أَدَوَاتٌ وَعَتَادٌ* 🏛️\n`;
        shopMsg += `فِئَتُكَ الحَالِيَّة: ${classTitle(db[sender])}\n`;
        shopMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        entries.forEach(([num, item], index) => {
            const priceLabel = item.cost >= 1000000
                ? `${(item.cost / 1000000).toLocaleString()}M`
                : item.cost.toLocaleString();
            const tag = item.classOnly ? ` 🔒${item.classOnly}` : '';
            shopMsg += `*${num}.* ${item.name}${tag} ⇠ [ *${priceLabel}* ]\n`;
            if ((index + 1) % 20 === 0) {
                shopMsg += `━━━━━━━━━━━━━━━━━━━━\n`;
            }
        });

        shopMsg += `\n🛒 لِلشِّرَاء ارْسِل: *.شراء [الرقم]*\n📖 لِلتَّفَاصِيل ارْسِل: *.تفاصيل [الرقم]*\n🐾 لِمَتْجَرِ الْحَيَوَانَات ارْسِل: *.متجر حيوانات*`;

        await sock.sendMessage(id, { text: shopMsg }, { quoted: m });
    }
};
