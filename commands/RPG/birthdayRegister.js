module.exports = {
    name: 'تسجيل-ميلاد',
    aliases: ['تسجيل_ميلاد', 'عيد-ميلادي'],
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;

        const input = (args[0] || '').trim();
        const match = /^(\d{1,2})-(\d{1,2})$/.exec(input);
        if (!match) {
            return sock.sendMessage(id, {
                text: "📖 *طريقة الاستخدام:*\n.تسجيل-ميلاد [يوم-شهر]\n\nمثال: .تسجيل-ميلاد 25-12\n(يوم وشهر بس، من غير سنة)"
            }, { quoted: m });
        }

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        if (day < 1 || day > 31 || month < 1 || month > 12) {
            return sock.sendMessage(id, { text: "❌ التاريخ ده مش صحيح، تأكد من اليوم والشهر." }, { quoted: m });
        }

        db[sender] ??= { gold: 0 };
        const key = `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}`;
        db[sender].birthday = key;

        await sock.sendMessage(id, { text: `🎂 تم تسجيل عيد ميلادك في ${key}. هنبعتلك تهنئة تلقائية في كل جروب موجود فيه في نفس اليوم كل سنة!` }, { quoted: m });
    }
};
