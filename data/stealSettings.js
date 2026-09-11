// ============================================================
//  إعدادات أمر "سرقة" العام (متاح لكل اللاعبين، بعكس .اغتيال
//  اللي حصري للمغتال). المطور يتحكم في نسبة النجاح وحالة
//  الأمر (مفتوح/مقفول) عن طريق .اعدادات-سرقة
// ============================================================

const DEFAULT_STEAL_SETTINGS = {
    enabled: true,      // هل الأمر شغال ولا مقفول من المطور
    successRate: 36,    // نسبة النجاح الأساسية % (كانت 40، اتخفضت 10% عشان تبقى أصعب)
    stealPct: 15,        // نسبة الذهب المسروقة من الهدف عند النجاح
    failPenaltyPct: 8,   // نسبة الذهب اللي بيخسرها السارق لو فشل
    cooldownMs: 2 * 60 * 60 * 1000 // ساعتين بين كل محاولة
};

// بيرجع إعدادات السرقة الحالية، وينشئها بالقيم الافتراضية لو مش موجودة
function getStealSettings(db) {
    if (!db.settings) db.settings = {};
    if (!db.settings.steal) {
        db.settings.steal = { ...DEFAULT_STEAL_SETTINGS };
    }
    return db.settings.steal;
}

module.exports = { DEFAULT_STEAL_SETTINGS, getStealSettings };
