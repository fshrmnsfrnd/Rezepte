#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');

const projectRoot = path.resolve(__dirname, '..');
const jsonDir = path.join(projectRoot, 'resources', 'json');

const DEFAULT_API = process.env.JSON_IMPORT_API || 'http://localhost:3000/api/import-cocktail';

function logEvent(evt) {
    console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString() }, evt)));
}

if (!fs.existsSync(jsonDir)) {
    console.error(`JSON watch directory does not exist: ${jsonDir}`);
    process.exit(1);
}

// debounce map
const recent = new Map();
function shouldEmit(key) {
    const now = Date.now();
    const last = recent.get(key) || 0;
    if (now - last < 150) return false;
    recent.set(key, now);
    if (recent.size > 1000) {
        for (const [k, v] of recent) if (now - v > 1000) recent.delete(k);
    }
    return true;
}

async function postJsonToApi(jsonPath, attempt = 1) {
    try {
        const content = fs.readFileSync(jsonPath, 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (pe) {
            if (attempt <= 2) {
                // file might be still being written; retry shortly
                setTimeout(() => postJsonToApi(jsonPath, attempt + 1), 200);
                return;
            }
            logEvent({ type: 'parse-error', path: path.relative(projectRoot, jsonPath), message: pe.message });
            return;
        }

        // require ingredients
        if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
            logEvent({ type: 'skipped', path: path.relative(projectRoot, jsonPath), reason: 'no-ingredients' });
            return;
        }

        // send to API
        const body = JSON.stringify(parsed);
        const url = new URL(DEFAULT_API);
        const opts = {
            hostname: url.hostname,
            port: url.port || 80,
            path: url.pathname + (url.search || ''),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const MAX_ATTEMPTS = 5;

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    const out = JSON.parse(data || '{}');
                    logEvent({ type: 'posted', path: path.relative(projectRoot, jsonPath), status: res.statusCode, response: out });
                } catch (e) {
                    logEvent({ type: 'posted', path: path.relative(projectRoot, jsonPath), status: res.statusCode });
                }

                // If the server returned a 5xx status, retry a few times (server might not be ready yet)
                if (res.statusCode >= 500 && attempt < MAX_ATTEMPTS) {
                    const delay = 200 * Math.pow(2, attempt - 1);
                    setTimeout(() => postJsonToApi(jsonPath, attempt + 1), delay);
                }
            });
        });
        req.on('error', (err) => {
            // Network error (connection refused etc) - retry with backoff a few times
            logEvent({ type: 'error', path: path.relative(projectRoot, jsonPath), message: err.message, attempt });
            if (attempt < MAX_ATTEMPTS) {
                const delay = 200 * Math.pow(2, attempt - 1);
                setTimeout(() => postJsonToApi(jsonPath, attempt + 1), delay);
            }
        });
        req.write(body);
        req.end();

    } catch (ex) {
        logEvent({ type: 'error', path: path.relative(projectRoot, jsonPath), message: ex.message });
    }
}

// On startup, try to post all existing JSON files (will be skipped if no ingredients)
function initialPostAll() {
    fs.readdir(jsonDir, (err, files) => {
        if (err) return;
        files.filter(f => f.toLowerCase().endsWith('.json')).forEach(f => {
            const full = path.join(jsonDir, f);
            postJsonToApi(full);
        });
    });
}

initialPostAll();

fs.watch(jsonDir, { recursive: true }, (eventType, filename) => {
    const rel = filename || '';
    if (!rel.toLowerCase().endsWith('.json')) return;
    if (!shouldEmit(`${eventType}:${rel}`)) return;

    const full = path.join(jsonDir, rel);
    fs.stat(full, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                logEvent({ type: 'removed', path: path.relative(projectRoot, full) });
            }
            return;
        }
        if (stats.isFile()) {
            // delay a bit to avoid reading a file mid-write
            setTimeout(() => postJsonToApi(full), 200);
        }
    });
});

console.log(`Watching JSON resources at: ${jsonDir} -> POST to ${DEFAULT_API}`);
