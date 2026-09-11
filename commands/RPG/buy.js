const { ITEMS, getMaxHP } = require('../../data/shopItems.js');
const {
    getUserClass,
    notifyIfProgressed,
    notifyArcherIfProgressed,
    notifyDefenseMilestones,
    ASSASSIN_REQUIREMENTS,
    ARCHER_REQUIREMENTS
} = require('../../data/classSystem.js');

module.exports = {
    name: 'شراء',
    async execute(sock, m, args, db, sender) {
        const id = m.key.remoteJid;
        const user = db[sender];
        const itemID = args[0];
        // تحديد العدد: إذا لم يكتب اللاعب عدداً، يفترض البوت أنه 1
        let count = parseInt(args[1]) || 1;

        if (!user) return sock.sendMessage(id, { text: "⚠️ سجل أولاً بـ .لاعب جديد" }, { quoted: m });

        const item = ITEMS[itemID];
        if (!item) return sock.sendMessage(id, { text: "❌ هذا العنصر غير موجود في المتجر." }, { quoted: m });

        // عناصر حصرية على فئة معينة (محارب/مغتال) - الرسالة مقصود تكون عامة
        // وماتكشفش فئة المشتري الحقيقية لو كان مغتال سري.
        if (item.classOnly && item.classOnly !== getUserClass(user)) {
            return sock.sendMessage(id, {
                text: `❌ العنصر ده مش متاح لفئتك الحالية.`
            }, { quoted: m });
        }

        // منع شراء أكثر من وحش واحد في المرة الواحدة
        if (item.type === "pet" && count > 1) {
            return sock.sendMessage(id, { text: "⚠️ لا يمكنك امتلاك أكثر من رفيق واحد في نفس الوقت. تم تعديل الكمية إلى 1." }, { quoted: m });
        }

        if (item.type === "pet") count = 1; // إجبار العدد على 1 للرفقاء

        // --- [ منع شراء صحة أكثر من الحد الأقصى المسموح به حسب المستوى ] ---
        if (item.type === "use" && item.hp) {
            const maxHP = getMaxHP(user);
            user.hp = user.hp || 0;

            if (user.hp >= maxHP) {
                return sock.sendMessage(id, { text: `❤️ صحتك ممتلئة بالفعل! (${user.hp}/${maxHP})\nلا حاجة لشراء المزيد الآن.` }, { quoted: m });
            }

            // نحسب أقصى عدد جرعات يمكن استخدامه فعلياً بدون تجاوز الحد الأقصى
            const missingHP = maxHP - user.hp;
            const maxUsefulCount = Math.max(1, Math.ceil(missingHP / item.hp));
            if (count > maxUsefulCount) {
                count = maxUsefulCount;
            }
        }

        const totalCost = item.cost * count;

        if (user.gold < totalCost) {
            return sock.sendMessage(id, { text: `💰 ذهبك لا يكفي! الرصيد المطلوب لـ ${count} من هذا العنصر: ${totalCost.toLocaleString()} ذهبة.` }, { quoted: m });
        }

        let log = "";

        if (item.type === "stack") {
            if (item.atk) user.atk = (user.atk || 0) + (item.atk * count);
            if (item.def) {
                if (user.defense !== undefined) user.defense += (item.def * count);
                else user.def = (user.def || 0) + (item.def * count);
            }
            log = `✅ تم شراء وتطوير عتادك بـ [${count}] من *${item.name}*!`;
        } else if (item.type === "pet") {
            // حذف قوة الرفيق القديم قبل إضافة الجديد
            let oldPet = Object.values(ITEMS).find(i => i.name === user.currentPet);
            if (oldPet) {
                user.atk = Math.max(0, (user.atk || 0) - (oldPet.atk || 0));
                let oldDefValue = oldPet.def || 0;
                if (user.defense !== undefined) user.defense = Math.max(0, user.defense - oldDefValue);
                else user.def = Math.max(0, (user.def || 0) - oldDefValue);
            }

            user.currentPet = item.name;
            user.atk = (user.atk || 0) + (item.atk || 0);
            let newDefValue = item.def || 0;
            if (user.defense !== undefined) user.defense += newDefValue;
            else user.def = (user.def || 0) + newDefValue;
            log = `🔄 تم استبدال رفيقك بـ *${item.name}*!`;
        } else if (item.type === "use") {
            const maxHP = getMaxHP(user);
            user.hp = Math.min(maxHP, (user.hp || 0) + (item.hp * count));
            log = `🧪 استخدمت [${count}] من *${item.name}* وزادت صحتك!`;
        }

        user.gold -= totalCost;

        // تسجيل شراء الخنجر المسموم (شرط التحول لمغتال)
        if (itemID === ASSASSIN_REQUIREMENTS.itemId) {
            user.boughtPoisonDagger = true;
        }
        // تسجيل شراء قوس الصياد الطويل (شرط التحول لرامي)
        if (itemID === ARCHER_REQUIREMENTS.itemId) {
            user.boughtLongBow = true;
        }

        const finalDef = user.defense !== undefined ? user.defense : user.def;
        let status = `\n\n📊 *إحصائياتك الجديدة:*\n⚔️ الهجوم: ${user.atk.toLocaleString()}\n🛡️ الدفاع: ${finalDef.toLocaleString()}\n❤️ الصحة: ${user.hp}/${getMaxHP(user)}\n💰 المتبقي: ${user.gold.toLocaleString()}`;

        await sock.sendMessage(id, { text: log + status }, { quoted: m });

        // إشعارات خاصة لو الشراء ده حقق تقدم في أي من مسارات التحول
        await notifyIfProgressed(sock, db, sender);
        await notifyArcherIfProgressed(sock, db, sender);
        // إشعار لو الدفاع الجديد تخطى عتبة مهمة (يفيد المحارب ضد الاغتيال)
        await notifyDefenseMilestones(sock, sender, user);
    }
};
