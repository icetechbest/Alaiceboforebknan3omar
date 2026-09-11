const fs = require("fs");
const path = require("path");

function atomicWriteFileSync(filePath, data) {
    const absolutePath = path.resolve(filePath);
    const directory = path.dirname(absolutePath);
    fs.mkdirSync(directory, { recursive: true });

    const temporaryPath = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
    let descriptor;
    try {
        descriptor = fs.openSync(temporaryPath, "w");
        fs.writeFileSync(descriptor, data, "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = undefined;
        fs.renameSync(temporaryPath, absolutePath);
    } finally {
        if (descriptor !== undefined) {
            try { fs.closeSync(descriptor); } catch (_) {}
        }
        try {
            if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
        } catch (_) {}
    }
}

function atomicWriteJsonSync(filePath, value) {
    atomicWriteFileSync(filePath, JSON.stringify(value, null, 2));
}

function readJsonSync(filePath, fallback = {}) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return fallback;
        throw error;
    }
}

function replaceObjectContents(target, source) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
    return target;
}

module.exports = {
    atomicWriteFileSync,
    atomicWriteJsonSync,
    readJsonSync,
    replaceObjectContents
};