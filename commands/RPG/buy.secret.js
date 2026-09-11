const { getMaxHP } = require('../../data/shopItems.js');

module.exports = {
    name: 'شراء_سري',
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];
        const itemID = args[0];

        if (!user) return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });

        const vault = {
            // --- [ أدوات برمجية - تراكمية ] ---
            "404": { name: "خَطَأُ النِّظَامِ ⚠️", cost: 1500000000, atk: 80000, type: "stack" },
            "77":  { name: "كُودُ الْغِشِّ ⌨️", cost: 5000000000, hp: 500000, type: "use" },
            "502": { name: "بَوَّابَةُ السِّيرْفَرِ 🛡️", cost: 40000000000, def: 250000, type: "stack" },
            "101": { name: "خُوذَةُ الْمُشْرِفِ 🎧", cost: 100000000000, def: 600000, type: "stack" },
            "999": { name: "صَلَاحِيَّةُ الْجَذْرِ (ROOT) 🔑", cost: 1000000000000, atk: 1500000, type: "stack" },

            // --- [ كائنات غريبة - استبدال ] ---
            "0":   { name: "جَوْهَرَةُ الْعَدَمِ 🌑", cost: 15000000000, atk: 200000, def: 200000, type: "pet" },
            "666": { name: "عَقْدُ الشَّيْطَانِ 📜", cost: 300000000000, atk: 900000, def: 400000, type: "pet" },
            "7":   { name: "شَبَحُ الْمُطَوِّرِ 👻", cost: 600000000000, atk: 1200000, def: 1200000, type: "pet" }
        };

        const item = vault[itemID];
        if (!item) return sock.sendMessage(id, { text: "❌ هذا الرقم غير موجود في الخزينة المحظورة." }, { quoted: m });

        if (user.gold < item.cost) {
            return sock.sendMessage(id, { text: `💰 ذهبك لا يكفي! تحتاج: ${item.cost.toLocaleString()} ذهبة.` }, { quoted: m });
        }

        let log = "";
        // --- نظام التراكم (Stack) ---
        if (item.type === "stack") {
            if (item.atk) user.atk = (user.atk || 0) + item.atk;
            if (item.def) {
                if (user.defense !== undefined) user.defense += item.def;
                else user.def = (user.def || 0) + item.def;
            }
            log = `☣️ تَمَّ حَقْنُ بَيَانَاتِ *${item.name}* فِي شَفْرَتِكَ الْخَاصَّة!`;
        } 
        // --- نظام الاستبدال للرفقاء (Pet) ---
        else if (item.type === "pet") {
            let oldPet = Object.values(vault).find(i => i.name === user.currentPet);
            if (oldPet) {
                user.atk = Math.max(0, (user.atk || 0) - (oldPet.atk || 0));
                let d = oldPet.def || 0;
                if (user.defense !== undefined) user.defense = Math.max(0, user.defense - d);
                else if (user.def !== undefined) user.def = Math.max(0, user.def - d);
            }
            user.currentPet = item.name;
            user.atk = (user.atk || 0) + (item.atk || 0);
            let nd = item.def || 0;
            if (user.defense !== undefined) user.defense += nd;
            else user.def = (user.def || 0) + nd;
            log = `🌑 تَمَّ اسْتِدْعَاءُ الْكِيَانِ الْمَحْظُور: *${item.name}*!`;
        } 
        // --- نظام الاستخدام الفوري (Use) ---
        else if (item.type === "use") {
            const maxHP = getMaxHP(user);
            user.hp = Math.min(maxHP, (user.hp || 0) + (item.hp || 0));
            log = `⚡ تَمَّ تَنْفِيذُ الْأَمْرِ: *${item.name}*! زادت طاقتك بشكل خارق.`;
        }

        user.gold -= item.cost;
        let status = `\n\n📊 *البيانات المحقونة:*\n⚔️ الهجوم: ${user.atk.toLocaleString()}\n🛡️ الدفاع: ${(user.defense || user.def || 0).toLocaleString()}\n💰 الذهب المتبقي: ${user.gold.toLocaleString()}`;
        
        await sock.sendMessage(id, { text: log + status }, { quoted: m });
    }
};
