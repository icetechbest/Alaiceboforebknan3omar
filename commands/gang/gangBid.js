// 💰 [ أمر .مزايدة ] -------------------------------------------------------------
// عضو في عصابة عندها مزاد شغال (.مزاد_عصابة) يقدر يزايد بمبلغ أعلى من المزايدة
// الحالية. الفلوس متتخصمش فورًا (عشان لو حد زايد أعلى منه يترد له تلقائيًا من
// غير أي عملية استرجاع) — بتتخصم من الفائز بس وقت ما المزاد يقفل.
module.exports = {
    name: "مزايدة",
    aliases: ["bid"],
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        const myGang = Object.values(db.gangs || {}).find(g => g.members?.includes(sender));
        if (!myGang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون عضو في عصابة عشان تزايد!" });

        const auction = myGang.activeAuctionId ? db.gangAuctions?.[myGang.activeAuctionId] : null;
        if (!auction) return sock.sendMessage(groupID, { text: "⚠️ عصابتك مفيهاش مزاد شغال حاليًا." });

        const amount = parseInt(args[0]);
        if (!amount || amount <= auction.currentBid) {
            return sock.sendMessage(groupID, {
                text: `❌ لازم تزايد بمبلغ أعلى من ${auction.currentBid.toLocaleString()}.\nمثال: *.مزايدة ${(auction.currentBid + 500).toLocaleString()}*`
            });
        }

        const bidderData = db[sender];
        if (!bidderData || (bidderData.gold || 0) < amount) {
            return sock.sendMessage(groupID, { text: "💰 رصيدك من الذهب لا يكفي عشان تزايد بالمبلغ ده!" });
        }

        auction.currentBid = amount;
        auction.currentBidder = sender;

        await sock.sendMessage(groupID, {
            text: `💰 @${sender.split('@')[0]} زايد بـ *${amount.toLocaleString()}* على [ ${auction.item} ]!\n👑 هو صاحب أعلى مزايدة دلوقتي.`,
            mentions: [sender]
        });
    }
};
