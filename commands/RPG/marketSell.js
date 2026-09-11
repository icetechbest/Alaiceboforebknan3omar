module.exports = {
    name: 'بيع',
    aliases: ['اعرض-للبيع'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        if (!db[sender]) {
            return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });
        }

        const price = parseInt(args[args.length - 1], 10);
        const item = args.slice(0, -1).join(' ').trim();

        if (!item || !price || price < 1) {
            return sock.sendMessage(id, {
                text: "📖 *طريقة الاستخدام:*\n.بيع [اسم الآيتم] [السعر]\n\nمثال: .بيع خنجر مسموم 5000"
            }, { quoted: m });
        }

        db.marketplace ??= [];
        db.marketplaceNextId ??= 1;

        const offer = { id: db.marketplaceNextId++, seller: sender, item, price };
        db.marketplace.push(offer);

        await sock.sendMessage(id, {
            text: `🛒 تم عرض *${item}* للبيع بسعر ${price.toLocaleString()} ذهب.\n🆔 رقم العرض: #${offer.id}\n\nأي حد يقدر يشتريه بـ .شراء-عرض ${offer.id}\nغيّرت رأيك؟ الغيه بـ .الغاء-عرض ${offer.id}`
        }, { quoted: m });
    }
};
