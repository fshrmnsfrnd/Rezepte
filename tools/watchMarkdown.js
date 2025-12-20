#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Watch the 'resources/Markdown' folder for .md additions/changes and
// convert them into JSON files stored under 'resources/json'.
const projectRoot = path.resolve(__dirname, '..');
const markdownDir = path.join(projectRoot, 'resources', 'Markdown');
const jsonDir = path.join(projectRoot, 'resources', 'json');

const { parseMarkdownToJson, safeFileName } = require('../lib/markdown-parser');

function logEvent(evt) {
    console.log(JSON.stringify(Object.assign({ ts: new Date().toISOString() }, evt)));
}

if (!fs.existsSync(markdownDir)) {
    console.error(`Watch directory does not exist: ${markdownDir}`);
    process.exit(1);
}

if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
}

console.log(`Watching Markdown resources at: ${markdownDir}`);

// On startup, (re)generate JSON for all existing .md files so existing JSONs are corrected
function regenerateAll() {
    fs.readdir(markdownDir, (err, files) => {
        if (err) return;
        files.filter(f => f.toLowerCase().endsWith('.md')).forEach(f => writeJsonForMd(f));
    });
}

regenerateAll();

// debounce map to suppress duplicate rapid events per path
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

// parser is provided by lib/markdown-parser.ts

function writeJsonForMd(relPath) {
    const full = path.join(markdownDir, relPath);
    fs.readFile(full, 'utf8', (err, data) => {
        if (err) { console.error('read error', err); return; }
        try {
            const parsed = parseMarkdownToJson(data, relPath);
            const safe = safeFileName(parsed.name || path.basename(relPath, '.md'));
            const outPath = path.join(jsonDir, `${safe}.json`);
            fs.writeFile(outPath, JSON.stringify(parsed, null, 4), (we) => {
                if (we) console.error('write error', we);
                else logEvent({ type: 'generated', path: path.relative(projectRoot, outPath) });
            });
        } catch (ex) {
            console.error('parse error', ex);
        }
    });
}

function removeJsonForMd(relPath) {
    const name = path.basename(relPath, path.extname(relPath));
    const safe = safeFileName(name);
    const outPath = path.join(jsonDir, `${safe}.json`);
    if (fs.existsSync(outPath)) {
        fs.unlinkSync(outPath);
        logEvent({ type: 'removed-json', path: path.relative(projectRoot, outPath) });
    }
}

fs.watch(markdownDir, { recursive: true }, (eventType, filename) => {
    const rel = filename || '';
    if (!rel.toLowerCase().endsWith('.md')) return;
    if (!shouldEmit(`${eventType}:${rel}`)) return;

    const full = path.join(markdownDir, rel);
    // determine existence
    fs.stat(full, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // removed
                removeJsonForMd(rel);
            }
            return;
        }
        if (stats.isFile()) {
            // added or changed
            writeJsonForMd(rel);
        }
    });
});

