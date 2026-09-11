// core/waVersion.js
// ------------------------------------------------------------------
// fetchLatestBaileysVersion() بتاعة Baileys بترجع نسخة "مخزّنة" جوه المكتبة نفسها،
// وده ممكن يبقى قديم بأسابيع لو مفيش تحديث لباكدج Baileys وقتها. واتساب بيرفض
// أي اتصال/طلب كود ربط بنسخة قديمة كده برسالة "Connection Closed" (428).
//
// الحل: بنجيب رقم النسخة الحقيقي مباشرة من واتساب نفسها (نفس الطريقة اللي أدوات
// زي WAHA و evolution-api بتستخدمها)، ولو فشل (مفيش نت لواتساب مثلاً)، بنرجع
// لنسخة Baileys الافتراضية كـ fallback أخير.
// ------------------------------------------------------------------

const axios = require("axios");
const { fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");

const CACHE_TTL_MS = 60 * 60 * 1000; // ساعة — مفيش داعي نطلب من واتساب كل ثانية
let cached = null;
let cachedAt = 0;

async function fetchRealWaWebVersion() {
    const { data } = await axios.get("https://web.whatsapp.com/sw.js", {
        timeout: 8000,
        headers: {
            "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
    });
    const match = String(data).match(/\\?"client_revision\\?":\s*(\d+)/);
    if (!match) return null;
    return [2, 3000, Number(match[1])];
}

/**
 * بترجع أحدث نسخة واتساب ويب معروفة، بأولوية لمصدر واتساب المباشر،
 * ولو فشل بترجع نسخة Baileys الافتراضية.
 */
async function getCurrentWaVersion() {
    const now = Date.now();
    if (cached && (now - cachedAt) < CACHE_TTL_MS) return cached;

    let version;
    try {
        version = (await fetchLatestBaileysVersion()).version;
    } catch (e) {
        version = [2, 3000, 1015901307]; // fallback أخير جدًا لو كل حاجة فشلت
    }

    try {
        const real = await fetchRealWaWebVersion();
        if (real) version = real;
    } catch (e) {
        // مفيش نت لـ web.whatsapp.com دلوقتي (شبكة موبايل متقطعة مثلاً) — هنكتفي بالنسخة اللي عندنا
        console.log("⚠️ تعذر جلب نسخة واتساب ويب الحقيقية، هنستخدم نسخة Baileys الافتراضية.");
    }

    cached = version;
    cachedAt = now;
    return version;
}

module.exports = { getCurrentWaVersion };
