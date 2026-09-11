module.exports = {
    name: 'طلاق',
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        if (!db[sender]?.married) return sock.sendMessage(id, { text: "⚠️ أنت لست متزوجاً أصلاً!" });

        const partner = db[sender].married;
        delete db[sender].married;
        if (db[partner]) delete db[partner].married;

        await sock.sendMessage(id, { text: "💔 تم الطلاق رسمياً.. نتمنى لك حياة أفضل." });
    }
};
