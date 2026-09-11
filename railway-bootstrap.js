// 💾 [ ربط البيانات الدائمة بـ Railway Volume ] --------------------------------
// المشكلة: أي حاجة بتتكتب جوه فولدر المشروع (auth_info, auth_info_subs,
// database.json, stats.json, backups) بتتمسح مع كل عملية Deploy جديدة على
// Railway، لأن نظام الملفات بتاع الـ Container مؤقت. النتيجة: البوت هيطلب
// كود ربط واتساب جديد ويرجع كل البيانات (اللاعبين، العصابات...) فاضية بعد
// أي تحديث للكود.
//
// الحل: تعمل Volume من تبويب "Volumes" في إعدادات السيرفس على Railway، وده
// هيدّي لك متغيّر بيئة اسمه RAILWAY_VOLUME_MOUNT_PATH بيشاور على مسار دائم
// (بيفضل موجود ومحفوظ بين كل Deploy). السكريبت ده بينقل الفولدرات/الملفات
// اللي محتاجة تفضل محفوظة جوه الـ Volume ده، وبعدين بيعمل symlink من مكانها
// الطبيعي جوه المشروع لنفس المكان جوه الـ Volume — فكل كود البوت يفضل شغال
// زي ما هو من غير أي تعديل في مسارات الملفات.
//
// لو مفيش Volume متوصل (تشغيل محلي، أو أول مرة قبل ما تعمل واحد)، السكريبت
// مايعملش حاجة خالص والبوت يشتغل عادي (بس البيانات وقتها مش هتفضل محفوظة
// بين كل Deploy على Railway).
const fs = require("fs");
const path = require("path");

const volumePath = process.env.RAILWAY_VOLUME_MOUNT_PATH;

if (!volumePath) {
    console.log(
        "ℹ️ لا يوجد Railway Volume متصل بالسيرفس ده — البيانات (الجلسة/القاعدة) هتتخزن جوه فولدر المشروع وهتتمسح مع أي Deploy جديد.\n" +
        "   عشان تحل المشكلة: من إعدادات السيرفس على Railway > Volumes > New Volume، اعمل Volume واربطه بالسيرفس."
    );
    process.exit(0);
}

const root = __dirname;

const PERSISTENT_ENTRIES = [
    { name: "auth_info", type: "dir" },
    { name: "auth_info_subs", type: "dir" },
    { name: "backups", type: "dir" },
    { name: "database.json", type: "file", defaultContent: "{}" },
    { name: "stats.json", type: "file", defaultContent: "{}" }
];

for (const entry of PERSISTENT_ENTRIES) {
    const projectPath = path.join(root, entry.name);
    const volumeTarget = path.join(volumePath, entry.name);

    try {
        const stat = fs.lstatSync(projectPath);
        if (stat.isSymbolicLink()) {
            // اترَبط قبل كده صح، سيبه زي ما هو
            const currentTarget = path.resolve(path.dirname(projectPath), fs.readlinkSync(projectPath));
            if (currentTarget === volumeTarget) continue;
            fs.unlinkSync(projectPath);
        } else {
            // موجود فعليًا كملف/فولدر عادي (مش لينك) — على الأغلب أول تشغيل
            // بعد إضافة الـ Volume. لو الـ Volume لسه فاضي، ننقل النسخة دي
            // جواه عشان محدش يضيع بيانات قديمة (جلسة واتساب متربطة بالفعل مثلًا).
            if (!fs.existsSync(volumeTarget)) {
                fs.renameSync(projectPath, volumeTarget);
            } else {
                fs.rmSync(projectPath, { recursive: true, force: true });
            }
        }
    } catch (_) {
        // مفيش حاجة أصلاً في مسار المشروع، عادي جدًا
    }

    if (!fs.existsSync(volumeTarget)) {
        if (entry.type === "dir") fs.mkdirSync(volumeTarget, { recursive: true });
        else fs.writeFileSync(volumeTarget, entry.defaultContent);
    }

    fs.symlinkSync(volumeTarget, projectPath, entry.type === "dir" ? "dir" : "file");
}

console.log(`✅ تم ربط بيانات الجلسة/القاعدة بالـ Volume الدائم: ${volumePath}`);
