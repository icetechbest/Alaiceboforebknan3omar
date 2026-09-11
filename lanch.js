const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const OWNER_NUMBER = "201220800288@s.whatsapp.net";

function start() {
    console.log("🛡️ نظام المراقبة (Ice-Shield) بدأ العمل...");

    const child = spawn('node', ['index.js'], {
        cwd: __dirname,
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    // إرسال إشارة للبوت عند بدء التشغيل ليقوم بمراسلتك
    child.on('spawn', () => {
        console.log("🚀 تم تشغيل عملية البوت بنجاح تحت الحماية.");
        // ملاحظة: الرسالة سيتم إرسالها من داخل ملف index.js عند اتصال sock بنجاح
    });

    child.on('exit', (code, signal) => {
        const timestamp = new Date().toLocaleString('ar-EG');
        console.error(`⚠️ البوت توقف! كود: ${code}. جارٍ إعادة التشغيل...`);
        start(); 
    });

    setInterval(() => {
        const usage = process.memoryUsage().rss / 1024 / 1024;
        if (usage > 500) {
            console.log("🚨 استهلاك عالي للرامات! إعادة تشغيل...");
            child.kill();
        }
    }, 60000);
}

start();
