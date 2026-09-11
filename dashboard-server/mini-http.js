"use strict";
// بديل خفيف لـ express + multer مبني بالكامل على وحدة http المدمجة في Node.js
// بدون أي مكتبات خارجية. بيوفّر نفس الشكل اللي الكود التاني بيستخدمه:
// app.get/post/patch/delete/use, req.params/query/body/file/get(), res.status/json/send/set/download

const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8"
};

function compilePath(routePath) {
    const paramNames = [];
    const pattern = routePath
        .replace(/\/+$/, "") || "/";
    const regexSource = pattern
        .split("/")
        .map((segment) => {
            if (segment.startsWith(":")) {
                paramNames.push(segment.slice(1));
                return "([^/]+)";
            }
            return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        })
        .join("/");
    const regex = new RegExp(`^${regexSource || "/"}/?$`);
    return function match(pathname) {
        const trimmed = pathname.replace(/\/+$/, "") || "/";
        const result = regex.exec(trimmed === "" ? "/" : trimmed);
        if (!result) return null;
        const params = {};
        paramNames.forEach((name, index) => {
            try { params[name] = decodeURIComponent(result[index + 1]); }
            catch (_) { params[name] = result[index + 1]; }
        });
        return { params };
    };
}

function matchAll() {
    return { params: {} };
}

function createApp() {
    const layers = [];

    function addLayer(method, routePath, handler) {
        layers.push({
            method,
            matcher: routePath ? compilePath(routePath) : matchAll,
            handler,
            isError: handler.length === 4
        });
    }

    const app = {
        use(routePathOrHandler, maybeHandler) {
            if (typeof routePathOrHandler === "function") {
                addLayer("ALL", null, routePathOrHandler);
            } else {
                addLayer("ALL", routePathOrHandler, maybeHandler);
            }
            return app;
        },
        get(routePath, ...handlers) { handlers.forEach((h) => addLayer("GET", routePath, h)); return app; },
        post(routePath, ...handlers) { handlers.forEach((h) => addLayer("POST", routePath, h)); return app; },
        patch(routePath, ...handlers) { handlers.forEach((h) => addLayer("PATCH", routePath, h)); return app; },
        put(routePath, ...handlers) { handlers.forEach((h) => addLayer("PUT", routePath, h)); return app; },
        delete(routePath, ...handlers) { handlers.forEach((h) => addLayer("DELETE", routePath, h)); return app; },
        handle(req, res) {
            let parsedUrl;
            try {
                parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
            } catch (_) {
                res.statusCode = 400;
                res.end("Bad Request");
                return;
            }
            req.originalUrl = req.url;
            req.query = Object.fromEntries(parsedUrl.searchParams.entries());
            req.get = (name) => req.headers[String(name).toLowerCase()];
            decorateResponse(res);
            const pathname = decodeURI(parsedUrl.pathname);

            let index = -1;
            function next(err) {
                index++;
                while (index < layers.length) {
                    const layer = layers[index];
                    const methodOk = layer.method === "ALL" || layer.method === req.method;
                    if (!methodOk) { index++; continue; }
                    const matched = layer.matcher(pathname);
                    if (!matched) { index++; continue; }
                    if (err) {
                        if (!layer.isError) { index++; continue; }
                        req.params = matched.params;
                        try { layer.handler(err, req, res, next); } catch (e) { next(e); }
                        return;
                    }
                    if (layer.isError) { index++; continue; }
                    req.params = matched.params;
                    try {
                        const maybePromise = layer.handler(req, res, next);
                        if (maybePromise && typeof maybePromise.catch === "function") {
                            maybePromise.catch(next);
                        }
                    } catch (e) { next(e); }
                    return;
                }
                if (!res.headersSent) {
                    if (err) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ error: err.message || String(err) }));
                    } else {
                        res.statusCode = 404;
                        res.end(JSON.stringify({ error: "Not found" }));
                    }
                }
            }
            next();
        }
    };
    return app;
}

function decorateResponse(res) {
    res.status = function status(code) { res.statusCode = code; return res; };
    res.set = function set(field, value) { res.setHeader(field, value); return res; };
    res.json = function json(payload) {
        if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify(payload));
        return res;
    };
    res.send = function send(payload) {
        if (payload === undefined) { res.end(); return res; }
        if (Buffer.isBuffer(payload) || typeof payload === "string") {
            if (!res.getHeader("Content-Type")) {
                res.setHeader("Content-Type", typeof payload === "string" ? "text/html; charset=utf-8" : "application/octet-stream");
            }
            res.end(payload);
        } else {
            res.json(payload);
        }
        return res;
    };
    res.download = function download(filePath, filename) {
        fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) {
                if (!res.headersSent) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: "File not found" }));
                }
                return;
            }
            res.setHeader("Content-Disposition", `attachment; filename="${filename || path.basename(filePath)}"`);
            if (!res.getHeader("Content-Type")) {
                const ext = path.extname(filePath).toLowerCase();
                res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
            }
            res.setHeader("Content-Length", stat.size);
            const stream = fs.createReadStream(filePath);
            stream.on("error", () => { if (!res.headersSent) { res.statusCode = 500; } res.end(); });
            stream.pipe(res);
        });
    };
}

// -- Static file serving (بديل express.static) --
function serveStatic(rootDir) {
    return function staticMiddleware(req, res, next) {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        let parsedPath;
        try {
            parsedPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
        } catch (_) {
            return next();
        }
        if (parsedPath.includes("\0")) return next();
        let relative = parsedPath === "/" ? "/index.html" : parsedPath;
        const filePath = path.normalize(path.join(rootDir, relative));
        if (!filePath.startsWith(path.normalize(rootDir))) return next();
        fs.stat(filePath, (err, stat) => {
            if (err || !stat.isFile()) return next();
            const ext = path.extname(filePath).toLowerCase();
            res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
            res.setHeader("Content-Length", stat.size);
            const stream = fs.createReadStream(filePath);
            stream.on("error", () => next());
            stream.pipe(res);
        });
    };
}

// -- Body parsers (بديل express.json / express.urlencoded) --
function parseLimitBytes(limit) {
    if (typeof limit === "number") return limit;
    const match = /^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i.exec(String(limit || "1mb").trim());
    if (!match) return 1024 * 1024;
    const value = parseFloat(match[1]);
    const unit = (match[2] || "kb").toLowerCase();
    const multiplier = unit === "gb" ? 1024 * 1024 * 1024 : unit === "mb" ? 1024 * 1024 : 1024;
    return Math.floor(value * multiplier);
}

function readRawBody(req, limitBytes) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        req.on("data", (chunk) => {
            total += chunk.length;
            if (total > limitBytes) {
                reject(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
    });
}

function jsonBody(options = {}) {
    const limitBytes = parseLimitBytes(options.limit);
    return async function jsonMiddleware(req, res, next) {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.includes("application/json")) return next();
        try {
            const raw = await readRawBody(req, limitBytes);
            req.body = raw.length ? JSON.parse(raw.toString("utf8")) : {};
            next();
        } catch (error) {
            if (error.statusCode === 413) return next(error);
            next(Object.assign(new Error(`Invalid JSON body: ${error.message}`), { statusCode: 400 }));
        }
    };
}

function urlencodedBody() {
    return async function urlencodedMiddleware(req, res, next) {
        const contentType = req.headers["content-type"] || "";
        if (!contentType.includes("application/x-www-form-urlencoded")) return next();
        try {
            const raw = await readRawBody(req, 5 * 1024 * 1024);
            const params = new URLSearchParams(raw.toString("utf8"));
            req.body = Object.fromEntries(params.entries());
            next();
        } catch (error) {
            next(error);
        }
    };
}

// -- Minimal multipart/form-data parser (بديل multer) --
// بيدعم استخراج ملف واحد باسم حقل محدد، وده كل اللي المشروع محتاجه.
function multipartSingle(fieldName, options = {}) {
    const maxBytes = options.limits?.fileSize || 25 * 1024 * 1024;
    return async function multipartMiddleware(req, res, next) {
        const contentType = req.headers["content-type"] || "";
        const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
        if (!contentType.includes("multipart/form-data") || !boundaryMatch) return next();
        const boundary = boundaryMatch[1] || boundaryMatch[2];
        try {
            const raw = await readRawBody(req, maxBytes + 64 * 1024);
            req.body = req.body || {};
            const boundaryBuf = Buffer.from(`--${boundary}`);
            const parts = [];
            let start = raw.indexOf(boundaryBuf);
            while (start !== -1) {
                const next = raw.indexOf(boundaryBuf, start + boundaryBuf.length);
                if (next === -1) break;
                parts.push(raw.slice(start + boundaryBuf.length, next));
                start = next;
            }
            for (const part of parts) {
                let body = part;
                if (body.slice(0, 2).toString() === "\r\n") body = body.slice(2);
                const headerEnd = body.indexOf("\r\n\r\n");
                if (headerEnd === -1) continue;
                const rawHeaders = body.slice(0, headerEnd).toString("utf8");
                let content = body.slice(headerEnd + 4);
                if (content.slice(-2).toString() === "\r\n") content = content.slice(0, -2);
                const nameMatch = /name="([^"]*)"/i.exec(rawHeaders);
                const filenameMatch = /filename="([^"]*)"/i.exec(rawHeaders);
                const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(rawHeaders);
                const fieldNameFound = nameMatch ? nameMatch[1] : null;
                if (filenameMatch && fieldNameFound === fieldName) {
                    req.file = {
                        fieldname: fieldNameFound,
                        originalname: filenameMatch[1],
                        mimetype: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
                        buffer: content,
                        size: content.length
                    };
                } else if (fieldNameFound) {
                    req.body[fieldNameFound] = content.toString("utf8");
                }
            }
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { createApp, serveStatic, jsonBody, urlencodedBody, multipartSingle };
