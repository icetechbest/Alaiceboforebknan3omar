// 🧮 حساب "مفتاح الأسبوع" بمعيار ISO 8601 (مثال: "2026-W37") لأي تاريخ.
// بنستخدمه عشان نجمع إحصائيات كل أسبوع لوحده (نظام الإحصائيات الأسبوعية التلقائية)
// من غير ما نحتاج نخزن تواريخ خام أو نتعامل مع مشاكل بداية الأسبوع المختلفة بين الدول.
function getWeekKey(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // بنحول الأحد (0) عشان يبقى آخر يوم في الأسبوع بدل أول يوم (معيار ISO: الاثنين = أول يوم)
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    const weekNum = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + firstDayNum) / 7);
    return `${d.getUTCFullYear()}-W${weekNum}`;
}

module.exports = { getWeekKey };
