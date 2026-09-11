// ============================================================
//  خريطة موحدة لأنواع الإحصائيات اللي أوامر الأونر (.اضافة/.شيل)
//  تقدر تتحكم فيها، عشان الأمرين يفضلوا متطابقين دايماً.
// ============================================================

const { resolveRealJid } = require('../core/messageHandler.js');

const STAT_TYPES = {
    'ذهب': { field: 'gold', label: '💰 الذهب' },
    'فلوس': { field: 'gold', label: '💰 الذهب' },
    'هجوم': { field: 'atk', label: '⚔️ الهجوم' },
    'دفاع': { field: 'defense', label: '🛡️ الدفاع' },
    'مستوى': { field: 'level', label: '⭐ المستوى' },
    'خبرة': { field: 'xp', label: '✨ الخبرة' },
    'صحة': { field: 'hp', label: '❤️ الصحة' },
    'انتصارات': { field: 'pvpWins', label: '⚔️ انتصارات PvP' },
    'اغتيالات': { field: 'ambushWins', label: '🥷 الاغتيالات الناجحة' }
};

function resolveTarget(m, sender, db) {
    // ⚠️ contextInfo.participant ممكن يجيلنا بصيغة "@lid" (نظام إخفاء الرقم بتاع
    // واتساب) بدل الرقم الحقيقي، فبنمرره على resolveRealJid عشان تحله لو فيه بديل حقيقي.
    const contextInfo = m.message.extendedTextMessage?.contextInfo;
    const participantReal = contextInfo?.participant
        ? resolveRealJid(contextInfo.participant, contextInfo?.participantPn || contextInfo?.participantAlt, null, db?.lidMap)
        : null;
    return contextInfo?.mentionedJid?.[0] ||
           participantReal ||
           sender;
}

function statTypesList() {
    return Object.keys(STAT_TYPES).join('، ');
}

module.exports = { STAT_TYPES, resolveTarget, statTypesList };
