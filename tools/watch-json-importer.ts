#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
const projectRoot = path.resolve(__dirname, '..');
const jsonDir = path.join(projectRoot, 'resources', 'json');

dotenv.config()
//check if important things exist
if (!process.env.API_KEY) {
    console.warn('Hinweis: API_KEY not found in Environment');
}

if (!fs.existsSync(jsonDir)) {
    console.error(`JSON watch directory does not exist: ${jsonDir}`);
    process.exit(1);
}

// debounce map
const recent = new Map<any, any>();

function shouldEmit(key:string) {
    const now = Date.now();
    const last = recent.get(key) || 0;
    if (now - last < 200) return false;
    recent.set(key, now);
    if (recent.size > 1000) {
        recent.forEach((v, k) => {
            if (now - v > 1000) recent.delete(k);
        });
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
        const maxAttempts = 7;
        var res;
        try {
            res = await fetch('http://localhost:3000/api/import-recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'API_KEY': process.env.API_KEY ?? '' },
                body: JSON.stringify(parsed),
            });

            // read body safely for logging
            let bodyText = '<no-body>';
            try {
                bodyText = await res.text();
            } catch (e) {
                bodyText = '<body-read-error>';
            }

            // try again if not successful
            if (res.status !== 201 && attempt <= maxAttempts) {
                console.error('fetch-error | API: import-recipe | status: ' + res.status + ' | message: |' + bodyText);
                const delay = 2000 * Math.pow(2, attempt);
                setTimeout(() => postJsonToApi(jsonPath, attempt + 1), delay);
            }
        } catch (ex) {
            console.error('fetch-error | API: import-recipe | message: |' + (ex instanceof Error ? ex.message : String(ex)));
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
        res = await fetch('http://localhost:3000/api/remove-recipe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'API_KEY': process.env.API_KEY ?? '' },
            body: JSON.stringify({ name }),
        });

        let bodyText = '<no-body>';
        try {
            bodyText = await res.text();
        } catch (e) {
            bodyText = '<body-read-error>';
        }

        // try again if not successful
        if (res.status !== 200 && attempt <= maxAttempts) {
            console.error('fetch-error | API: remove-recipe | status: ' + res.status + ' | message: |' + bodyText);
            const delay = 200 * Math.pow(2, attempt);
            setTimeout(() => postRemoveToApi(jsonPath, attempt + 1), delay);
        }
    } catch (ex) {
        console.error('fetch-error | API: remove-recipe | message: |' + (ex instanceof Error ? ex.message : String(ex)));
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
function waitForService(apiAddress: string, attempt = 1) {
    const timeoutMs = 2000;

    return new Promise((resolve) => {
        const tryOnce = async () => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const res = await fetch(apiAddress, { method: 'OPTIONS', signal: controller.signal as any });
                clearTimeout(timer);
                console.log('service ready');
                resolve(undefined);
            } catch (err: any) {
                clearTimeout(timer);
                console.log('service error: ' + (err && err.message ? err.message : String(err)));
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
    console.log("waiting for import API to be availible");
    // Check the actual API endpoints used by the app
    await waitForService('http://localhost:3000/api/import-recipe');

    console.log("waiting for remove API to be availible");
    await waitForService('http://localhost:3000/api/remove-recipe');

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
                    // attempt to notify API to remove the recipe corresponding to this file
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