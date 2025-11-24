#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const projectRoot = path.resolve(__dirname, '..');
const jsonDir = path.join(projectRoot, 'resources', 'json');

//check if important things exist
if (!process.env.API_KEY) {
    console.warn('Hinweis: API_KEY not found in Environment');
}

if (!fs.existsSync(jsonDir)) {
    console.error(`JSON watch directory does not exist: ${jsonDir}`);
    process.exit(1);
}

// debounce map
const recent = new Map();

function shouldEmit(key:string) {
    const now = Date.now();
    const last = recent.get(key) || 0;
    if (now - last < 200) return false;
    recent.set(key, now);
    if (recent.size > 1000) {
        for (const [k, v] of recent) if (now - v > 1000) recent.delete(k);
    }
    return true;
}

async function postJsonToApi(jsonPath:string, attempt:number = 1) {
    try {
        const content = fs.readFileSync(jsonPath, 'utf8');
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch (ex) {
            if (attempt <= 5) {
                // file might be still being written; retry shortly
                setTimeout(() => postJsonToApi(jsonPath, attempt + 1), 200);
                return;
            }
            console.error('parse-error | path: ' + path.relative(projectRoot, jsonPath) + ' | message: |' + (ex instanceof Error ? ex.message : String(ex)));
            return;
        }

        // require ingredients
        if (!Array.isArray(parsed.ingredients) || parsed.ingredients.length === 0) {
            console.warn('skipped | path: ' + path.relative(projectRoot, jsonPath) + ' | message: |' + 'No Ingredients');
            return;
        }

        // send to API
        const maxAttempts = 5;
        var res;
        try{
            res = await fetch('/api/import-cocktail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'API_KEY': process.env.API_KEY ?? '' },
                body: JSON.stringify(parsed),
            });
            res.json();

            //try again if not succesfull
            if(res.status != 201 && attempt <= maxAttempts){
                const delay = 200 * Math.pow(2, attempt);
                setTimeout(() => postJsonToApi(jsonPath, attempt + 1), delay);
            }
        }catch(ex){
            console.error('fetch-error | API: import-cocktail | message: |' + (ex instanceof Error ? ex.message : String(ex)));
        }

    } catch (ex) {
        console.error('error | path: ' + path.relative(projectRoot, jsonPath) + ' | message: |' + (ex instanceof Error ? ex.message : String(ex)));
    }
}

async function postRemoveToApi(jsonPath: string, attempt = 1) {
    // send to API
    const base = path.basename(jsonPath);
    const name = base.replace(/\.json$/i, '');
    const maxAttempts = 5;
    var res;

    try {
        res = await fetch('/api/remove-cocktail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'API_KEY': process.env.API_KEY ?? '' },
            body: JSON.stringify({ name }),
        });
        res.json();

        //try again if not succesfull
        if (res.status != 200 && attempt <= maxAttempts) {
            const delay = 200 * Math.pow(2, attempt);
            setTimeout(() => postRemoveToApi(jsonPath, attempt + 1), delay);
        }
    } catch (ex) {
        console.error('fetch-error | API: remove-cocktail | message: |' + (ex instanceof Error ? ex.message : String(ex)));
    }
}

// On startup, try to post all existing JSON files
function initialPostAll() {
    fs.readdir(jsonDir, (err: NodeJS.ErrnoException | null, files: string[]) => {
        if (err) return;
        files.filter((f: string) => f.toLowerCase().endsWith('.json')).forEach((f: string) => {
            const full = path.join(jsonDir, f);
            postJsonToApi(full);
        });
    });
}

// wait for services and then start the watcher
function waitForService(apiUrl: string, attempt = 1) {
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
            const req = http.request(Object.assign({}, opts), (res: any) => {
                console.log("[watch-json-importer]: service ready")
                res.resume();
                resolve(undefined);
            });

            req.on('timeout', () => {
                req.destroy();
            });

            req.on('error', (err: any) => {
                console.log("[watch-json-importer]: service error" + err.message)
                const delay = Math.min(10000, 200 * Math.pow(2, Math.max(0, attempt - 1)));
                setTimeout(() => {
                    attempt++;
                    tryOnce();
                }, delay);
            });

            try {
                req.end();
            } catch (ex) {
                console.log("[watch-json-importer]: service wait" + (ex instanceof Error ? ex.message : String(ex)));
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
    console.log("[watch-json-importer]: waiting for import API to be availible");
    await waitForService('import-api');

    console.log("[watch-json-importer]: waiting for remove API to be availible");
    await waitForService('remove-api');

    // start processing files and watching
    initialPostAll();

    fs.watch(jsonDir, { recursive: true }, (eventType:any, filename:any) => {
        const rel = filename;
        if (!rel.toLowerCase().endsWith('.json')) return;
        if (!shouldEmit(`${eventType}:${rel}`)) return;

        const full = path.join(jsonDir, rel);
        fs.stat(full, (err:any, stats:any) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    console.error('removed | path: ' + path.relative(projectRoot, full));
                    // attempt to notify API to remove the cocktail corresponding to this file
                    try {
                        postRemoveToApi(full);
                    } catch (ex) {
                        console.error('error | path: ' + path.relative(projectRoot, full) + ' | message: |' + (ex instanceof Error ? ex.message : String(ex)));
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