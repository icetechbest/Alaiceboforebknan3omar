// ============================================================
//  🏅 نِظَامُ الْإِنْجَازَاتِ
//  بادجات تتفتح تلقائيًا بناءً على بيانات موجودة أصلاً في db[sender]،
//  من غير ما نحتاج نضيف نظام تتبع مستقل. أي مكان في الكود بيغيّر حاجة
//  ممكن تفتح إنجاز (زواج، فوز PVP، مستوى، سرقة ناجحة) لازم ينادي
//  checkAchievements(db, sender, sock, groupID) بعد التعديل.
// ============================================================

const LEVEL_MILESTONE = 10;

const ACHIEVEMENTS = [
    {
        code: "first_marriage",
        label: "💍 أول زواج",
        met: (p) => Boolean(p.married)
    },
    {
        code: "first_pvp_win",
        label: "⚔️ أول فوز PVP",
        met: (p) => (p.pvpWins || 0) >= 1
    },
    {
        code: `level_${LEVEL_MILESTONE}`,
        label: `🎖️ الوصول لمستوى ${LEVEL_MILESTONE}`,
        met: (p) => (p.level || 1) >= LEVEL_MILESTONE
    },
    {
        code: "first_theft",
        label: "🕵️ أول عملية سرقة ناجحة",
        met: (p) => (p.successfulSteals || 0) >= 1
    },
    {
        code: "first_market_sale",
        label: "🛒 أول عملية بيع في السوق",
        met: (p) => (p.marketSales || 0) >= 1
    },
    {
        code: "market_trader",
        label: "🏪 تاجر شاطر (5 عمليات بيع بالسوق)",
        met: (p) => (p.marketSales || 0) >= 5
    },
    {
        code: "first_gang_raid_win",
        label: "💥 أول انتصار في هجوم عصابة",
        met: (p) => (p.gangRaidWins || 0) >= 1
    },
    {
        code: "gang_warlord",
        label: "🔥 قائد حروب (5 انتصارات في هجوم عصابة)",
        met: (p) => (p.gangRaidWins || 0) >= 5
    },
    {
        code: "level_25",
        label: "🌟 الوصول لمستوى 25",
        met: (p) => (p.level || 1) >= 25
    },
    {
        code: "level_50",
        label: "👑 أسطورة بمستوى 50",
        met: (p) => (p.level || 1) >= 50
    },
    {
        code: "gold_10k",
        label: "💰 أول عشرة آلاف ذهب",
        met: (p) => (p.gold || 0) >= 10000
    },
    {
        code: "gold_100k",
        label: "💎 مليونير الذهب (100 ألف)",
        met: (p) => (p.gold || 0) >= 100000
    },
    {
        code: "pvp_veteran",
        label: "🥊 محارب محنك (10 انتصارات PVP)",
        met: (p) => (p.pvpWins || 0) >= 10
    },
    {
        code: "master_thief",
        label: "🥷 لص محترف (10 سرقات ناجحة)",
        met: (p) => (p.successfulSteals || 0) >= 10
    }
];

// بيفحص كل الإنجازات، ويضيف أي واحد جديد اتحقق شرطه لـ db[sender].achievements،
// ولو فيه sock وgroupID اتبعتوا، بيبعت رسالة تهنئة في الجروب. بيرجع array
// بالإنجازات الجديدة (ممكن تتجاهل لو مش محتاجها).
async function checkAchievements(db, sender, sock = null, groupID = null) {
    const player = db[sender];
    if (!player) return [];

    player.achievements ??= [];
    const newly = [];

    for (const ach of ACHIEVEMENTS) {
        if (player.achievements.includes(ach.code)) continue;
        try {
            if (ach.met(player)) {
                player.achievements.push(ach.code);
                newly.push(ach);
            }
        } catch (e) { /* تجاهل أي خطأ في فحص شرط إنجاز واحد ومتكملش */ }
    }

    if (newly.length && sock && groupID) {
        for (const ach of newly) {
            await sock.sendMessage(groupID, {
                text: `🏆 *إنجاز جديد!*\n@${sender.split("@")[0]} فتح إنجاز: *${ach.label}*`,
                mentions: [sender]
            }).catch(() => {});
        }
    }

    return newly;
}

function listAchievements(player) {
    const owned = new Set(player?.achievements || []);
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: owned.has(a.code) }));
}

module.exports = { checkAchievements, listAchievements, ACHIEVEMENTS };
