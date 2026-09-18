// 🛒 [ كتالوج المتجر الحي ] ------------------------------------------------------
// المتجر في اللعبة (.متجر / .متجر حيوانات / .شراء / .تفاصيل) والموقع (Dashboard)
// بيقروا من نفس المكان ده. الفكرة:
//   - الأساس: data/shopItems.js زي ما هو (مش بنعدّل فيه).
//   - فوقه: تعديلات بتتخزن جوه database.json تحت db.settings.shopCatalog:
//       added   → عناصر/حيوانات جديدة اتضافت من الموقع (أو الخفاش الجاهز)
//       edited  → نسخة معدّلة من عنصر موجود (سعر/اسم/قوة...)
//       removed → أرقام عناصر مخفية من المتجر
//   - "الحذف" إخفاء من المتجر بس. العنصر بيفضل معروف للنظام عشان لاعب معاه
//     الرفيق ده ولما يستبدله البوت يقدر يشيل قوته صح (شوف buy.js).
const { ITEMS: BASE_ITEMS } = require('../data/shopItems.js');

const TYPES = ['use', 'stack', 'pet'];
const MANAGED_FIELDS = ['name', 'cost', 'type', 'atk', 'def', 'hp', 'desc'];
const MAX_COST = 1e12;
const MAX_STAT = 1e9;

// ─── حالة الكتالوج جوه الداتابيز ────────────────────────────────────────────
function state(db) {
    db.settings ??= {};
    const s = (db.settings.shopCatalog ??= {});
    s.added ??= {};
    s.edited ??= {};
    s.removed ??= [];
    s.seeded ??= {};
    return s;
}

// كل العناصر المعروفة (الأساس + المضاف + التعديلات) بما فيها المخفي.
function mergeAll(s) {
    const all = Object.create(null);
    for (const [id, item] of Object.entries(BASE_ITEMS || {})) all[id] = { ...item };
    for (const [id, item] of Object.entries(s.added)) all[id] = { ...item };
    for (const [id, item] of Object.entries(s.edited)) if (all[id]) all[id] = { ...item };
    return all;
}

function nextId(all) {
    const nums = Object.keys(all).map(Number).filter(Number.isFinite);
    return String(Math.max(0, ...nums) + 1);
}

// ─── الخفاش الجاهز ──────────────────────────────────────────────────────────
// سعره وقوته بيتحسبوا من الحيوانات الموجودة فعلاً في متجرك (تقريباً في النص
// الغالي: السعر والهجوم عند ~60-65% من الترتيب، والدفاع في النص) عشان يبقى
// "غالي شوية بس مش أوي" من غير ما نخمّن أرقام. تقدر تعدّله من الموقع بعد كده.
const BAT_SEED = 'night-bat-v1';
const BAT_NAME = 'خفاش الليل 🦇';
const BAT_FALLBACK = { cost: 2500000, atk: 250, def: 120 };

function percentile(values, p) {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (sorted.length < 3) return null;
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function roundNice(n) {
    if (!Number.isFinite(n) || n <= 0) return 1;
    if (n < 100) return Math.max(1, Math.round(n));
    const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
}

function buildBat(all) {
    const pets = Object.values(all).filter((i) => i && i.type === 'pet');
    const pick = (key, p, fallback) => {
        const v = percentile(pets.map((i) => Number(i[key])), p);
        return v === null ? fallback : roundNice(v);
    };
    return {
        name: BAT_NAME,
        cost: pick('cost', 0.6, BAT_FALLBACK.cost),
        type: 'pet',
        atk: pick('atk', 0.65, BAT_FALLBACK.atk),
        def: pick('def', 0.5, BAT_FALLBACK.def),
        desc: 'مخلوق ليلي سريع، ينقض على خصومه من الظلام بضربات خاطفة ثم يختفي.'
    };
}

function seedBuiltins(db, s) {
    if (s.seeded[BAT_SEED]) return;
    const all = mergeAll(s);
    const exists = Object.values(all).some((i) => i && i.name === BAT_NAME);
    if (!exists) {
        const id = nextId(all);
        s.added[id] = buildBat(all);
        s.seeded[BAT_SEED] = id;
    } else {
        s.seeded[BAT_SEED] = 'already-present';
    }
}

function load(db) {
    const s = state(db || {});
    seedBuiltins(db, s);
    return s;
}

// ─── قراءة ──────────────────────────────────────────────────────────────────
function getAllItems(db) {
    if (!db) return mergeAll({ added: {}, edited: {}, removed: [] });
    return mergeAll(load(db));
}

// المتجر الفعلي اللي اللاعبين بيشوفوه ويشتروا منه (من غير المخفي).
function getShopItems(db) {
    const s = db ? load(db) : { added: {}, edited: {}, removed: [] };
    const hidden = new Set(s.removed.map(String));
    const shop = Object.create(null);
    for (const [id, item] of Object.entries(mergeAll(s))) if (!hidden.has(id)) shop[id] = item;
    return shop;
}

function shopOf(item) {
    return item && item.type === 'pet' ? 'pets' : 'items';
}

// للموقع: كل العناصر (المخفي منها بعلامة removed) مع نوع المتجر ومصدرها.
function listForDashboard(db) {
    const s = load(db);
    const hidden = new Set(s.removed.map(String));
    return Object.entries(mergeAll(s)).map(([id, item]) => ({
        id,
        ...item,
        shop: shopOf(item),
        removed: hidden.has(id),
        custom: Object.prototype.hasOwnProperty.call(s.added, id)
    }));
}

// ─── تحقق وتنظيف ────────────────────────────────────────────────────────────
// بناخد الحقول المسموحة بس من الطلب (مفيش حقول عشوائية بتتخزن في الداتابيز).
function pickManaged(input) {
    const out = {};
    for (const key of MANAGED_FIELDS) if (input && input[key] !== undefined) out[key] = input[key];
    return out;
}

function toInt(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? Math.floor(n) : NaN;
}

function cleanText(value, max) {
    return String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

// بياخد عنصر كامل (مدموج) ويرجّع { item } نضيف أو { error }.
function validate(candidate, all, selfId) {
    const name = cleanText(candidate.name ?? '', 40);
    if (!name) return { error: 'اسم العنصر مطلوب.' };
    const clash = Object.entries(all).find(([id, i]) => i && i.name === name && id !== String(selfId ?? ''));
    if (clash) return { error: `فيه عنصر تاني بنفس الاسم (رقم ${clash[0]}).` };

    if (!TYPES.includes(candidate.type)) return { error: 'النوع لازم يكون use أو stack أو pet.' };

    const cost = toInt(candidate.cost);
    if (cost === undefined || Number.isNaN(cost) || cost < 1 || cost > MAX_COST) {
        return { error: 'السعر لازم يكون رقم صحيح أكبر من صفر.' };
    }

    const stat = (key) => {
        const v = toInt(candidate[key]);
        if (v === undefined) return 0;
        return Number.isNaN(v) || v < 0 || v > MAX_STAT ? NaN : v;
    };
    const atk = stat('atk');
    const def = stat('def');
    const hp = stat('hp');
    if ([atk, def, hp].some(Number.isNaN)) return { error: 'قيم الهجوم/الدفاع/الصحة لازم تكون أرقام صحيحة موجبة.' };

    // نحتفظ بأي حقول إضافية في العنصر الأصلي (زي classOnly) ونفرض الحقول المُدارة.
    const item = { ...candidate, name, cost, type: candidate.type };
    delete item.atk; delete item.def; delete item.hp;

    if (item.type === 'use') {
        if (hp < 1) return { error: 'الجرعة لازم يكون لها زيادة صحة (hp) أكبر من صفر.' };
        item.hp = hp;
    } else if (item.type === 'stack') {
        if (atk + def < 1) return { error: 'العتاد لازم يكون له هجوم أو دفاع أكبر من صفر.' };
        if (atk) item.atk = atk;
        if (def) item.def = def;
    } else {
        if (atk + def < 1) return { error: 'الحيوان لازم يكون له هجوم أو دفاع أكبر من صفر.' };
        item.atk = atk; // العرض في .تفاصيل بيحتاج الاتنين موجودين
        item.def = def;
    }

    if (candidate.desc !== undefined && candidate.desc !== null && String(candidate.desc).trim() !== '') {
        item.desc = cleanText(candidate.desc, 300);
    } else {
        delete item.desc;
    }
    return { item };
}

// ─── مساعدات اللاعبين (حيوان اتغيّرت قوته/اسمه وهو مع لاعبين) ───────────────
function eachOwner(db, petName, fn) {
    for (const [id, u] of Object.entries(db)) {
        if (!/@(s\.whatsapp\.net|lid)$/.test(id)) continue;
        if (u && typeof u === 'object' && !Array.isArray(u) && u.currentPet === petName) fn(u);
    }
}

function shiftStats(user, dAtk, dDef) {
    user.atk = Math.max(0, (user.atk || 0) + dAtk);
    if (user.defense !== undefined) user.defense = Math.max(0, user.defense + dDef);
    else user.def = Math.max(0, (user.def || 0) + dDef);
}

// ─── كتابة (بتستخدمها لوحة التحكم) ──────────────────────────────────────────
const fail = (status, error) => ({ ok: false, status, error });

function addItem(db, input) {
    const s = load(db);
    const all = mergeAll(s);

    let id = input && input.id !== undefined && input.id !== '' ? String(input.id).trim() : nextId(all);
    if (!/^[0-9]{1,6}$/.test(id)) return fail(400, 'رقم العنصر لازم يكون أرقام فقط.');
    if (all[id]) return fail(409, `الرقم ${id} مستخدم بالفعل.`);

    const { item, error } = validate(pickManaged(input), all, id);
    if (error) return fail(400, error);

    s.added[id] = item;
    return { ok: true, id, item };
}

function updateItem(db, id, patch) {
    const s = load(db);
    const all = mergeAll(s);
    id = String(id);
    const current = all[id];
    if (!current) return fail(404, 'Shop item not found');

    const rest = pickManaged(patch);
    if (rest.type !== undefined && rest.type !== current.type) {
        return fail(400, 'مينفعش تغيّر نوع عنصر موجود. احذفه وأضف واحد جديد بالنوع المطلوب.');
    }

    const { item, error } = validate({ ...current, ...rest, type: current.type }, all, id);
    if (error) return fail(400, error);

    // حيوان معاه لاعبين: نحدّث الاسم عندهم، ونعدّل قوتهم بنفس فرق القوة عشان
    // الاستبدال بعد كده (buy.js) يشيل القيمة الصح.
    if (current.type === 'pet') {
        const dAtk = (item.atk || 0) - (current.atk || 0);
        const dDef = (item.def || 0) - (current.def || 0);
        eachOwner(db, current.name, (u) => {
            if (dAtk || dDef) shiftStats(u, dAtk, dDef);
            if (item.name !== current.name) u.currentPet = item.name;
        });
    }

    if (Object.prototype.hasOwnProperty.call(s.added, id)) s.added[id] = item;
    else s.edited[id] = item;
    return { ok: true, id, item };
}

function removeItem(db, id) {
    const s = load(db);
    id = String(id);
    if (!mergeAll(s)[id]) return fail(404, 'Shop item not found');
    if (!s.removed.map(String).includes(id)) s.removed.push(id);
    return { ok: true, id };
}

function restoreItem(db, id) {
    const s = load(db);
    id = String(id);
    if (!mergeAll(s)[id]) return fail(404, 'Shop item not found');
    s.removed = s.removed.filter((x) => String(x) !== id);
    return { ok: true, id };
}

module.exports = {
    TYPES,
    getAllItems,
    getShopItems,
    listForDashboard,
    shopOf,
    addItem,
    updateItem,
    removeItem,
    restoreItem
};
