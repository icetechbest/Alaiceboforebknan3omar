// 🏺 [ أمر .مزاد_عصابة ] --------------------------------------------------------
// قائد العصابة بيفتح مزاد داخلي على غنيمة/عنصر بين أعضاء عصابته بس. المزايدة
// بأمر .مزايدة (gangBid.js)، والفوز بيتحسم تلقائيًا في core/scheduler.js
// (tickGangAuctions) لما الوقت يخلص، وقيمة المزايدة الفائزة بتتحط في خزنة العصابة.
const MAX_DURATION_MINUTES = 24 * 60;

module.exports = {
    name: "مزاد_عصابة",
    aliases: ["مزاد-عصابة"],
    category: "العصابات",
    execute: async (sock, m, args, db, sender) => {
        const groupID = m.key.remoteJid;

        const myGang = Object.values(db.gangs || {}).find(g => g.owner === sender);
        if (!myGang) return sock.sendMessage(groupID, { text: "⚠️ لازم تكون قائد عصابة عشان تفتح مزاد!" });

        if (myGang.activeAuctionId && db.gangAuctions?.[myGang.activeAuctionId]) {
            return sock.sendMessage(groupID, { text: "⚠️ عصابتك فاتحة مزاد شغال بالفعل! استنى يخلص الأول." });
        }

        // آخر رقمين في args المفروض يكونوا السعر الابتدائي والمدة بالدقايق، والباقي اسم العنصر
        const numericTail = [];
        const wordsArgs = [...args];
        while (wordsArgs.length && !isNaN(wordsArgs[wordsArgs.length - 1]) && numericTail.length < 2) {
            numericTail.unshift(Number(wordsArgs.pop()));
        }
        const itemName = wordsArgs.join(" ").trim();
        const [startingBid, durationMinutes] = numericTail.length === 2 ? numericTail : [null, null];

        if (!itemName || !startingBid || startingBid <= 0 || !durationMinutes || durationMinutes <= 0 || durationMinutes > MAX_DURATION_MINUTES) {
            return sock.sendMessage(groupID, {
                text: "❌ الطريقة الصحيحة:\n*.مزاد_عصابة [اسم العنصر] [السعر الابتدائي] [المدة بالدقايق]*\nمثال: *.مزاد_عصابة سيف_أسطوري 5000 30*"
            });
        }

        const auctionId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        db.gangAuctions ??= {};
        db.gangAuctions[auctionId] = {
            id: auctionId,
            gangName: myGang.name,
            item: itemName,
            groupID,
            startingBid,
            currentBid: startingBid,
            currentBidder: null,
            endsAt: Date.now() + durationMinutes * 60 * 1000,
            startedBy: sender
        };
        myGang.activeAuctionId = auctionId;

        const msg = `🏺 *مزاد داخلي جديد في عصابة [ ${myGang.name} ]* 🏺\n━━━━━━━━━━━━━━━━━━\n` +
            `📦 العنصر: *${itemName}*\n` +
            `💰 السعر الابتدائي: ${startingBid.toLocaleString()}\n` +
            `⏳ المدة: ${durationMinutes} دقيقة\n\n` +
            `📜 أعضاء العصابة يقدروا يزايدوا بأمر: *.مزايدة [المبلغ]*\n` +
            `🏆 قيمة المزايدة الفائزة هتدخل خزنة العصابة.`;

        await sock.sendMessage(groupID, { text: msg });
    }
};
