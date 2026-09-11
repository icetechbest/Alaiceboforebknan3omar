// مصدر موحد لبيانات المتجر (مستخدم في: شراء، تفاصيل، متجر، متجر حيوانات)
// أي تعديل على سعر/قيمة عنصر يتم هنا فقط، ويظهر تلقائياً في كل الأوامر.

const ITEMS = {
    // --- [ أدوات ومستهلكات 1-15 ] ---
    "1": { name: "جرعة دم صغيرة 🧪", cost: 50, hp: 20, type: "use" },
    "2": { name: "جرعة دم متوسطة 🧪", cost: 150, hp: 60, type: "use" },
    "3": { name: "جرعة الملك ✨", cost: 5000, hp: 400, type: "use" },
    "4": { name: "ترياق الطاقة ⚡", cost: 300, hp: 80, type: "use" },
    "5": { name: "عشبة الشفاء 🌿", cost: 20, hp: 10, type: "use" },
    "6": { name: "كرة النار 🔥", cost: 400, atk: 8, type: "stack" },
    "7": { name: "صاعقة البرق ⚡", cost: 800, atk: 15, type: "stack" },
    "8": { name: "درع الماء 💧", cost: 500, def: 10, type: "stack" },
    "9": { name: "غضب الأرض 🌍", cost: 1000, atk: 25, type: "stack" },
    "10": { name: "ريح الشمال 🌬️", cost: 600, def: 15, type: "stack" },
    "11": { name: "لعنة الضعف 💀", cost: 1000, atk: 22, type: "stack" },
    "12": { name: "نور الفجر 🌅", cost: 500, hp: 70, type: "use" },
    "13": { name: "استدعاء النيازك 🌠", cost: 2000, atk: 50, type: "stack" },
    "14": { name: "حقل المانا 🔮", cost: 1500, def: 35, type: "stack" },
    "15": { name: "سحر السرعة 🏹", cost: 300, atk: 5, type: "stack" },

    // --- [ أسلحة ودروع تراكمية 16-30 ] ---
    "16": { name: "سيف برونزي ⚔️", cost: 200, atk: 10, type: "stack" },
    "17": { name: "سيف فولاذي ⚔️", cost: 800, atk: 25, type: "stack" },
    "18": { name: "نصل الجليد ❄️", cost: 2000, atk: 60, type: "stack" },
    "19": { name: "خنجر مسموم 🗡️", cost: 600, atk: 20, type: "stack" },
    "20": { name: "فأس الدمار 🪓", cost: 4000, atk: 120, type: "stack" },
    "21": { name: "رمح سماوي 🔱", cost: 3000, atk: 90, type: "stack" },
    "22": { name: "قوس السحاب 🏹", cost: 1000, atk: 35, type: "stack" },
    "23": { name: "درع جلدي 🧥", cost: 150, def: 5, type: "stack" },
    "24": { name: "درع حديدي 🛡️", cost: 500, def: 18, type: "stack" },
    "25": { name: "درع الفارس 🛡️", cost: 1500, def: 45, type: "stack" },
    "26": { name: "درع التنين 🐲", cost: 5000, def: 130, type: "stack" },
    "27": { name: "خوذة الملك 👑", cost: 2500, def: 65, type: "stack" },
    "28": { name: "قفازات القوة 💪", cost: 1000, atk: 30, type: "stack" },
    "29": { name: "حذاء الريح 👟", cost: 500, def: 15, type: "stack" },
    "30": { name: "سيف الضوء ✨", cost: 10000, atk: 300, type: "stack" },

    // --- [ رفقاء (حيوانات) استبدال 31-90 ] ---
    "31": { name: "قطة 🐱", cost: 300, atk: 10, def: 10, type: "pet" },
    "32": { name: "كلب 🐶", cost: 600, atk: 25, def: 25, type: "pet" },
    "33": { name: "بومة 🦉", cost: 1000, atk: 50, def: 50, type: "pet" },
    "34": { name: "ذئب 🐺", cost: 2500, atk: 150, def: 150, type: "pet" },
    "35": { name: "نمر 🐯", cost: 5000, atk: 300, def: 300, type: "pet" },
    "36": { name: "أسد 🦁", cost: 10000, atk: 600, def: 600, type: "pet" },
    "37": { name: "دب 🐻", cost: 15000, atk: 900, def: 900, type: "pet" },
    "38": { name: "صقر 🦅", cost: 25000, atk: 1500, def: 1500, type: "pet" },
    "39": { name: "وحيد قرن 🦄", cost: 40000, atk: 2200, def: 2200, type: "pet" },
    "40": { name: "عنقاء 🔥", cost: 60000, atk: 3000, def: 3000, type: "pet" },
    "41": { name: "قرش 🦈", cost: 80000, atk: 3800, def: 3800, type: "pet" },
    "42": { name: "تنين 🐉", cost: 100000, atk: 5000, def: 5000, type: "pet" },
    "43": { name: "غول 👹", cost: 130000, atk: 6500, def: 6500, type: "pet" },
    "44": { name: "آلي 🤖", cost: 180000, atk: 8000, def: 8000, type: "pet" },
    "45": { name: "شيطان 👿", cost: 220000, atk: 10000, def: 10000, type: "pet" },
    "46": { name: "ملاك ✨", cost: 280000, atk: 12000, def: 12000, type: "pet" },
    "47": { name: "فضائي 👽", cost: 350000, atk: 15000, def: 15000, type: "pet" },
    "48": { name: "كراكن 🐙", cost: 450000, atk: 18000, def: 18000, type: "pet" },
    "49": { name: "رفيق أسطوري 🔮", cost: 600000, atk: 25000, def: 25000, type: "pet" },
    "50": { name: "حاكم الممالك 👑", cost: 900000, atk: 35000, def: 35000, type: "pet" },
    "51": { name: "غوليم 🗿", cost: 25000, atk: 1000, def: 2500, type: "pet" },
    "52": { name: "حارس الرعد 🌩️", cost: 40000, atk: 2500, def: 1000, type: "pet" },
    "53": { name: "كلب الجحيم 🐕‍🦺", cost: 50000, atk: 3000, def: 1500, type: "pet" },
    "54": { name: "حصان أبيض 🐎", cost: 15000, atk: 500, def: 800, type: "pet" },
    "55": { name: "نينجا الظل 👤", cost: 70000, atk: 4000, def: 2000, type: "pet" },
    "56": { name: "فينيكس الجليد 🧊", cost: 90000, atk: 4500, def: 2500, type: "pet" },
    "57": { name: "جني الأرض 🧚", cost: 35000, atk: 1500, def: 1800, type: "pet" },
    "58": { name: "ملك القراصنة 🏴‍☠️", cost: 110000, atk: 6000, def: 4000, type: "pet" },
    "59": { name: "حارس أبدي 🛡️", cost: 140000, atk: 5000, def: 7500, type: "pet" },
    "60": { name: "إله الرعد ⚡", cost: 1200000, atk: 45000, def: 45000, type: "pet" },
    "61": { name: "ملك الجحيم 🔥", cost: 1800000, atk: 60000, def: 60000, type: "pet" },
    "62": { name: "تنين ذهبي ✨", cost: 2500000, atk: 80000, def: 80000, type: "pet" },
    "63": { name: "سيد الوقت ⏳", cost: 4000000, atk: 120000, def: 120000, type: "pet" },
    "64": { name: "كولوسوس 🏗️", cost: 2000000, atk: 70000, def: 70000, type: "pet" },
    "65": { name: "قناص المحيط 🏹", cost: 700000, atk: 28000, def: 22000, type: "pet" },
    "66": { name: "شينوبي 🥷", cost: 1100000, atk: 45000, def: 35000, type: "pet" },
    "67": { name: "فارس مظلم 🖤", cost: 1600000, atk: 65000, def: 65000, type: "pet" },
    "68": { name: "حاكم الأبعاد 🌀", cost: 5000000, atk: 150000, def: 150000, type: "pet" },
    "69": { name: "نجم متفجر 💥", cost: 8000000, atk: 200000, def: 200000, type: "pet" },
    "70": { name: "الْمُطَوِّرِ سُونغ 👑", cost: 15000000, atk: 300000, def: 300000, type: "pet" },
    "71": { name: "ملك الأساطير 👑", cost: 50000000, atk: 400000, def: 400000, type: "pet" },
    "72": { name: "المبرمج 💻", cost: 100000000, atk: 500000, def: 500000, type: "pet" },
    "73": { name: "مهندس السيرفر ⚙️", cost: 120000000, atk: 550000, def: 550000, type: "pet" },
    "74": { name: "صائد الثغرات 🐞", cost: 150000000, atk: 580000, def: 580000, type: "pet" },
    "75": { name: "جنرال الحرب 🎖️", cost: 200000000, atk: 600000, def: 600000, type: "pet" },
    "76": { name: "تنين الأكوان 🌌", cost: 220000000, atk: 620000, def: 620000, type: "pet" },
    "77": { name: "كراكن الأبعاد 🐙", cost: 250000000, atk: 650000, def: 650000, type: "pet" },
    "78": { name: "شيطان الفراغ 🌑", cost: 280000000, atk: 680000, def: 680000, type: "pet" },
    "79": { name: "ملاك الموت 👼", cost: 300000000, atk: 700000, def: 700000, type: "pet" },
    "80": { name: "وحش الصفر 👾", cost: 250000000, atk: 700000, def: 700000, type: "pet" },
    "81": { name: "مدمر العوالم ☄️", cost: 350000000, atk: 720000, def: 720000, type: "pet" },
    "82": { name: "خالق النجوم 🌟", cost: 400000000, atk: 750000, def: 750000, type: "pet" },
    "83": { name: "حاكم الوقت ⏳", cost: 450000000, atk: 780000, def: 780000, type: "pet" },
    "84": { name: "سيد العناصر 🌀", cost: 500000000, atk: 800000, def: 800000, type: "pet" },
    "85": { name: "الكيان المظلم 👤", cost: 550000000, atk: 820000, def: 820000, type: "pet" },
    "86": { name: "روح الغابة 🌳", cost: 300000, atk: 100, def: 100, type: "pet" },
    "87": { name: "شبح القصر 👻", cost: 200000, atk: 70, def: 70, type: "pet" },
    "88": { name: "مستدعي الأرواح 🔮", cost: 1000000, atk: 1000, def: 1000, type: "pet" },
    "89": { name: "ملك العمالقة 🗿", cost: 8000000, atk: 8000, def: 8000, type: "pet" },
    "90": { name: "فارس الفوضى 🌪️", cost: 12000000, atk: 12000, def: 12000, type: "pet" },

    // --- [ عتاد تراكمي عالي المستوى 91-98 ] ---
    "91": { name: "مطرقة الرعد 🔨", cost: 100000000, atk: 600000, type: "stack" },
    "92": { name: "درع الخلود 🛡️", cost: 30000000, def: 80000, type: "stack" },
    "93": { name: "سيف القدر 🗡️", cost: 20000000, atk: 20000, type: "stack" },
    "94": { name: "تاج الإمبراطور 👑", cost: 60000000, def: 70000, type: "stack" },
    "95": { name: "خاتم الطاقة 💍", cost: 4000000, atk: 4000, type: "stack" },
    "96": { name: "وشاح الريح 🧣", cost: 1500000, def: 1500, type: "stack" },
    "97": { name: "قوس البرق 🏹", cost: 90000000, atk: 100000, type: "stack" },
    "98": { name: "رمح النار 🔥", cost: 110000000, atk: 130000, type: "stack" },

    // --- [ رفقاء القمة 99-100 ] ---
    "99": { name: "سيد الأكوان 🌌", cost: 500000000, atk: 850000, def: 850000, type: "pet" },
    "100": { name: "نهاية اللعبة ♾️", cost: 1000000000, atk: 950000, def: 950000, type: "pet" },

    // --- [ عتاد حصري للمغتالين 101-103 ] ---
    "101": { name: "رداء الظل 🖤", cost: 3000, def: 20, type: "stack", classOnly: "مغتال" },
    "102": { name: "سم الأفعى 🐍", cost: 1500, atk: 40, type: "stack", classOnly: "مغتال" },
    "103": { name: "قناع الغدر 🎭", cost: 2500, atk: 15, def: 15, type: "stack", classOnly: "مغتال" },

    // --- [ عتاد حصري للمحاربين 104-105 ] ---
    "104": { name: "درع الفرسان الثقيل 🛡️", cost: 3000, def: 40, type: "stack", classOnly: "محارب" },
    "105": { name: "بلطة الحرب 🪓", cost: 3500, atk: 45, type: "stack", classOnly: "محارب" },

    // --- [ سلاح فتح فئة الرامي (متاح للجميع، شرط تحول) ] ---
    "106": { name: "قوس الصياد الطويل 🏹", cost: 900, atk: 22, type: "stack" },

    // --- [ عتاد حصري للرماة 107-109 ] ---
    "107": { name: "سهام مسمومة 🎯", cost: 1800, atk: 35, type: "stack", classOnly: "رامي" },
    "108": { name: "درع جلدي خفيف 🥾", cost: 1200, def: 25, type: "stack", classOnly: "رامي" },
    "109": { name: "عين الصقر 👁️", cost: 2600, atk: 10, def: 15, type: "stack", classOnly: "رامي" }
};

// أقصى صحة يمكن للاعب امتلاكها بناءً على مستواه (نفس الصيغة المستخدمة في .وحش و.احسب)
function getMaxHP(user) {
    const level = (user && user.level) || 1;
    return 100 + (level * 25);
}

module.exports = { ITEMS, getMaxHP };
