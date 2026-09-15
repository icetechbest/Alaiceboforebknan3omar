// commands/media-tools/_shared.js
// ────────────────────────────────────────────────────────────────
// دوال مشتركة لأوامر media-tools (مش أمر بحد ذاته - مفيش .name فالـ
// loader (index.js) بيتجاهل الملف ده تلقائيًا لأنه بيسجل بس الملفات
// اللي فيها command.name).
// ────────────────────────────────────────────────────────────────
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

const execFileAsync = promisify(execFile);

const MEDIA_TYPES = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'];

// امتداد افتراضي لكل نوع ميديا (يُستخدم لو مش لاقيين mimetype)
const DEFAULT_EXT = {
    imageMessage: '.jpg',
    videoMessage: '.mp4',
    audioMessage: '.ogg',
    stickerMessage: '.webp',
    documentMessage: '.bin'
};

/**
 * بيدور على ميديا في:
 *  1) نفس الرسالة (لو المستخدم بعت صورة/فيديو/صوت وكتب الأمر كابشن)
 *  2) رسالة الرد (Reply/Quoted) لو المستخدم رد بالأمر على رسالة فيها ميديا
 * وبيرجع { type, content, key } جاهزين لـ downloadMediaMessage.
 */
function extractMediaMessage(m) {
    const msg = m.message;
    if (!msg) return null;

    // فكّ أي طبقة viewOnce حوالين رسالة
    const unwrapViewOnce = (mm) =>
        mm?.viewOnceMessage?.message ||
        mm?.viewOnceMessageV2?.message ||
        mm?.viewOnceMessageV2Extension?.message ||
        mm;

    const findMediaIn = (container) => {
        if (!container) return null;
        for (const t of MEDIA_TYPES) {
            if (container[t]) return { type: t, content: container[t] };
        }
        return null;
    };

    // 1) الرسالة الحالية (مباشرة أو جوّه viewOnce)
    const direct = findMediaIn(unwrapViewOnce(msg));
    if (direct) {
        return { ...direct, key: m.key };
    }

    // 2) contextInfo (بيتلاقى جوه أي نوع رسالة تقريبًا)
    const contextInfo =
        msg.extendedTextMessage?.contextInfo ||
        msg.imageMessage?.contextInfo ||
        msg.videoMessage?.contextInfo ||
        msg.audioMessage?.contextInfo ||
        msg.stickerMessage?.contextInfo ||
        msg.documentMessage?.contextInfo ||
        msg.conversation?.contextInfo;

    const quotedRaw = contextInfo?.quotedMessage;
    if (!quotedRaw) return null;

    const quoted = unwrapViewOnce(quotedRaw);
    const found = findMediaIn(quoted);
    if (!found) return null;

    // مفتاح "وهمي" كافي إن downloadMediaMessage يقدر ينزّل بيه
    // (نفس النمط المستخدم فـ commands/whatsapp-tools/downloadStatus.js)
    const fakeKey = {
        remoteJid: m.key.remoteJid,
        fromMe: false,
        id: contextInfo.stanzaId,
        participant: contextInfo.participant
    };

    return { ...found, key: fakeKey };
}

/**
 * بينزل الميديا (المباشرة أو الـ quoted) لملف في tempDir ويرجع مساره.
 */
async function downloadMediaToFile(sock, mediaInfo, tempDir, baseName = 'input') {
    const fakeMsg = {
        key: mediaInfo.key,
        message: { [mediaInfo.type]: mediaInfo.content }
    };

    const buffer = await downloadMediaMessage(
        fakeMsg,
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
    );

    if (!buffer || !buffer.length) {
        throw new Error('❌ الملف اتنزل فاضي، جرب تاني.');
    }

    const ext = guessExtension(mediaInfo);
    const filePath = path.join(tempDir, `${baseName}${ext}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

function guessExtension(mediaInfo) {
    const mimetype = mediaInfo.content?.mimetype || '';
    const map = {
        'video/mp4': '.mp4',
        'video/3gpp': '.3gp',
        'video/quicktime': '.mov',
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'audio/ogg': '.ogg',
        'audio/ogg; codecs=opus': '.ogg',
        'audio/mpeg': '.mp3',
        'audio/mp4': '.m4a',
        'audio/aac': '.aac'
    };
    for (const key of Object.keys(map)) {
        if (mimetype.includes(key)) return map[key];
    }
    return DEFAULT_EXT[mediaInfo.type] || '.bin';
}

/**
 * بيعمل mkdtempSync ويرجع مسار الفولدر المؤقت.
 */
function makeTempDir(prefix) {
    return fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
}

/**
 * تنظيف الفولدر المؤقت (بيتنادالي في finally دايمًا).
 */
function cleanupTempDir(tempDir, tag = 'media-tools') {
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
        console.error(`[${tag}] Cleanup error:`, e.message);
    }
}

/**
 * تشغيل ffmpeg (أو أي binary تاني زي ffprobe) بأمان مع timeout/maxBuffer.
 */
async function runFFmpeg(args, { timeout = 5 * 60 * 1000 } = {}) {
    try {
        return await execFileAsync('ffmpeg', args, {
            timeout,
            maxBuffer: 20 * 1024 * 1024
        });
    } catch (err) {
        // بنلخّص آخر كام سطر من stderr بتاع ffmpeg عشان الرسالة متبقاش طويلة جدًا
        const stderrTail = (err.stderr || err.message || '')
            .toString()
            .trim()
            .split('\n')
            .slice(-8)
            .join('\n');
        const wrapped = new Error(`فشل تنفيذ ffmpeg:\n${stderrTail}`);
        wrapped.original = err;
        throw wrapped;
    }
}

/**
 * تحويل رقم ثواني (بيقبل أرقام عشرية وصيغة mm:ss) لثواني float.
 */
function parseTimeArg(val) {
    if (val === undefined || val === null || val === '') return null;
    if (/^\d+:\d{1,2}(\.\d+)?$/.test(val)) {
        const [mm, ss] = val.split(':');
        return parseInt(mm, 10) * 60 + parseFloat(ss);
    }
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : null;
}

function formatSeconds(sec) {
    const s = Math.max(0, Math.round(sec));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}:${String(ss).padStart(2, '0')}`;
}

function formatSize(bytes) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * بنبني سلسلة فلاتر atempo عشان نقدر نغيّر سرعة الصوت لأي معامل
 * حتى لو خارج النطاق اللي ffmpeg بيقبله لكل فلتر (0.5 - 2.0).
 */
function buildAtempoChain(factor) {
    let remaining = factor;
    const filters = [];

    if (remaining > 2.0) {
        while (remaining > 2.0) {
            filters.push('atempo=2.0');
            remaining /= 2.0;
        }
        filters.push(`atempo=${remaining.toFixed(6)}`);
    } else if (remaining < 0.5) {
        while (remaining < 0.5) {
            filters.push('atempo=0.5');
            remaining /= 0.5;
        }
        filters.push(`atempo=${remaining.toFixed(6)}`);
    } else {
        filters.push(`atempo=${remaining.toFixed(6)}`);
    }

    return filters.join(',');
}

module.exports = {
    extractMediaMessage,
    downloadMediaToFile,
    makeTempDir,
    cleanupTempDir,
    runFFmpeg,
    parseTimeArg,
    formatSeconds,
    formatSize,
    buildAtempoChain,
    MEDIA_TYPES
};
