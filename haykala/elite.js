const fs = require('fs');
const path = require('path');

// قائمة المطورين (النخبة)
let eliteNumbers = ['212689925939', '201220800288'];

const extractPureNumber = (jid) => {
    return jid.toString().replace(/[@:].*/g, '');
};

const isElite = (number) => {
    if (!number) return false;
    const pureNumber = extractPureNumber(number);
    return eliteNumbers.includes(pureNumber);
};

// تصدير الوظائف بنظام CommonJS
module.exports = {
    eliteNumbers,
    extractPureNumber,
    isElite
};
