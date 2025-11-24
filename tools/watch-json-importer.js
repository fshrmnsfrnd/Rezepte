#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
// Load environment variables
try {
    const dotenv = require('dotenv');
    const envFiles = ['.env.local', '.env'];
    for (const file of envFiles) {
        const full = path.resolve(__dirname, '..', file);
        if (fs.existsSync(full)) {
            dotenv.config({ path: full });
            break;
        }
    }
} catch (e) {
    console.warn('[watch-json-importer] dotenv load skipped: ' + e.message);
}
const projectRoot = path.resolve(__dirname, '..');
const jsonDir = path.join(projectRoot, 'resources', 'json');

const importApi = '/api/import-cocktail';
const removeApi = '/api/remove-cocktail';
const importApiUrl = new URL(importApi);
const removeApiUrl = new URL(removeApi);
const apiKey = process.env.API_KEY;
if (!apiKey) {
    console.warn('Hinweis: Kein API_KEY in Environment gefunden. Setze Env oder .env(.local).');
}

function buildHeaders() {
    const headers = {};
    // Only include API_KEY header when defined to avoid sending 'undefined'
    if (apiKey) {
        headers['API_KEY'] = apiKey;
    }
    return headers;
}

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
        const baseHeaders = buildHeaders();
        const headers = Object.assign({}, baseHeaders, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        });

        const opts = {
            hostname: importApiUrl.hostname,
            port: importApiUrl.port || 80,
            path: importApiUrl.pathname + (importApiUrl.search || ''),
            method: 'POST',
            headers: headers
        };
        logEvent({ type: 'debug-request', target: 'import', hasApiKey: Boolean(apiKey), headers: Object.keys(opts.headers) });

        const MAX_ATTEMPTS = 5;

        const req = await fetch('/api/cocktailsFilteredByIngredients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'API_KEY': apiKey },
            body: JSON.stringify({ ids: newSelected, amountMissingIngredients: amountMissingIngredients }),
        });

        req = http.request(opts, (res) => {
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

function postRemoveToApi(jsonPath, attempt = 1) {
    try {
        const relPath = path.relative(projectRoot, jsonPath);
        const base = path.basename(jsonPath);
        const name = base.replace(/\.json$/i, '');

        const body = JSON.stringify({ name });
        const baseHeaders = buildHeaders();
        const headers = Object.assign({}, baseHeaders, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        });

        const opts = {
            hostname: removeApiUrl.hostname,
            port: removeApiUrl.port || 80,
            path: removeApiUrl.pathname + (removeApiUrl.search || ''),
            method: 'POST',
            headers: headers
        };
        logEvent({ type: 'debug-request', target: 'remove', hasApiKey: Boolean(apiKey), headers: Object.keys(opts.headers) });

        const MAX_ATTEMPTS = 5;

        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => {
                try {
                    const out = JSON.parse(data || '{}');
                    logEvent({ type: 'posted-remove', path: relPath, status: res.statusCode, response: out });
                } catch (e) {
                    logEvent({ type: 'posted-remove', path: relPath, status: res.statusCode });
                }

                if (res.statusCode >= 500 && attempt < MAX_ATTEMPTS) {
                    const delay = 200 * Math.pow(2, attempt - 1);
                    setTimeout(() => postRemoveToApi(jsonPath, attempt + 1), delay);
                }
            });
        });
        req.on('error', (err) => {
            logEvent({ type: 'error-remove', path: relPath, message: err.message, attempt });
            if (attempt < MAX_ATTEMPTS) {
                const delay = 200 * Math.pow(2, attempt - 1);
                setTimeout(() => postRemoveToApi(jsonPath, attempt + 1), delay);
            }
        });
        req.write(body);
        req.end();

    } catch (ex) {
        logEvent({ type: 'error-remove', path: path.relative(projectRoot, jsonPath), message: ex.message });
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

// wait for services and then start the watcher
function waitForService(apiUrl, name, attempt = 1) {
    const MAX_ATTEMPTS = Infinity; // keep trying until service is up
    const url = new URL(apiUrl);
    const opts = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname || '/',
        method: 'OPTIONS',
        timeout: 2000,
    };

    return new Promise((resolve) => {
        const tryOnce = () => {
            const req = http.request(Object.assign({}, opts), (res) => {
                logEvent({ type: 'service-ready', service: name, status: res.statusCode });
                res.resume();
                resolve();
            });

            req.on('timeout', () => {
                req.destroy();
            });

            req.on('error', (err) => {
                logEvent({ type: 'service-wait', service: name, attempt, message: err.message });
                const delay = Math.min(10000, 200 * Math.pow(2, Math.max(0, attempt - 1)));
                setTimeout(() => {
                    attempt++;
                    tryOnce();
                }, delay);
            });

            try {
                req.end();
            } catch (e) {
                logEvent({ type: 'service-wait', service: name, attempt, message: e.message });
                const delay = Math.min(10000, 200 * Math.pow(2, Math.max(0, attempt - 1)));
                setTimeout(() => {
                    attempt++;
                    tryOnce();
                }, delay);
            }
        };

        tryOnce();
    });
}

async function run() {
    logEvent({ type: 'waiting', message: 'Waiting for import API to be available', url:importApi });
    await waitForService(importApi, 'import-api');
    logEvent({ type: 'waiting', message: 'Waiting for remove API to be available', url: removeApi });
    await waitForService(removeApi, 'remove-api');

    // start processing files and watching
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
                    // attempt to notify API to remove the cocktail corresponding to this file
                    try {
                        postRemoveToApi(full);
                    } catch (e) {
                        logEvent({ type: 'error', path: path.relative(projectRoot, full), message: 'postRemoveToApi failed: ' + (e && e.message) });
                    }
                }
                return;
            }
            if (stats.isFile()) {
                // delay a bit to avoid reading a file mid-write
                setTimeout(() => postJsonToApi(full), 200);
            }
        });
    });

    console.log(`Watching JSON resources at: ${jsonDir}`);
}

run();
