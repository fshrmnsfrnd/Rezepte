#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Watch the 'resources/Markdown' folder for .md additions/changes and
// convert them into JSON files stored under 'resources/json'.
const projectRoot = path.resolve(__dirname, '..');
const markdownDir = path.join(projectRoot, 'resources', 'Markdown');
const jsonDir = path.join(projectRoot, 'resources', 'json');

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

function safeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}

function parseMarkdownToJson(markdown, fileName) {
    // basic parser tailored to the project's markdown format
    const lines = markdown.split(/\r?\n/);
    const title = path.basename(fileName, path.extname(fileName)).trim();

    // parse table: find first line that starts with '|' and header separator
    let tableStart = -1, tableEnd = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('|')) {
            if (tableStart === -1) tableStart = i;
        } else {
            if (tableStart !== -1 && tableEnd === -1) { tableEnd = i; break; }
        }
    }
    if (tableStart !== -1 && tableEnd === -1) tableEnd = lines.length;

    const ingredients = [];
    if (tableStart !== -1) {
        const tableLines = lines.slice(tableStart, tableEnd).map(l => l.trim());
        // header is first line, separator second; data from third
        const dataLines = tableLines.slice(2);
        dataLines.forEach(l => {
            const cols = l.split('|').map(c => c.trim()).filter((_, idx) => idx !== 0 && idx !== colsIgnoredIndex(l));
            // fallback: split and take first two meaningful columns
            const parts = l.split('|').map(s => s.trim()).filter(s => s.length > 0);
            if (parts.length >= 2) {
                const amountRaw = parts[0];
                const ingRaw = parts[1];
                // clean ingredient name (# prefix used in some files)
                let ingredient_name = ingRaw.replace(/^#/, '').trim();
                // detect (optional) marker in name or amount (case-insensitive), remove it and set flag
                let optionalFlag = false;
                const optionalPattern = /\(?\s*optional\s*\)?/i;
                if (optionalPattern.test(ingredient_name)) {
                    ingredient_name = ingredient_name.replace(optionalPattern, '').trim();
                    optionalFlag = true;
                }

                // parse amount and unit (trim inputs)
                const amountRawTrim = amountRaw ? amountRaw.trim() : '';
                let amount = null;
                let unit = null;
                const numMatch = amountRawTrim.match(/^([\d.,]+)\s*(.*)$/);
                if (numMatch) {
                    amount = Number(numMatch[1].replace(',', '.'));
                    unit = (numMatch[2] || '').trim() || null;
                } else if (amountRawTrim && !/^-+$/.test(amountRawTrim)) {
                    // non-numeric like 'etwas' -> keep as unit/qualifier
                    amount = null;
                    unit = amountRawTrim;
                }
                // detect optional marker also in amount/unit cell
                if (!optionalFlag && optionalPattern.test(amountRawTrim)) {
                    optionalFlag = true;
                    // remove marker from unit if present
                    unit = unit ? unit.replace(optionalPattern, '').trim() : unit;
                }

                ingredients.push({ ingredient_name: ingredient_name.trim(), amount, unit: unit ? unit.trim() : unit, optional: optionalFlag });
            }
        });
    }

    // parse numbered steps (lines starting with '1.' etc) after a 'Zubereitung' header if present
    const steps = [];
    let inSteps = false;
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        if (/^#?\s*Zubereitung/i.test(l) || /^#?\s*Zubereitung/i.test(lines[i])) { inSteps = true; continue; }
        if (!inSteps) continue;
        const m = l.match(/^(\d+)\.\s*(.*)$/);
        if (m) {
            steps.push({ step_number: Number(m[1]), instruction: m[2].trim() });
        }
    }

    // fallback: if no steps found, look for any numbered list anywhere
    if (steps.length === 0) {
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i].trim();
            const m = l.match(/^(\d+)\.\s*(.*)$/);
            if (m) steps.push({ step_number: Number(m[1]), instruction: m[2].trim() });
        }
    }

    return {
        cocktail_id: null,
        cocktail_name: title,
        cocktail_description: '',
        ingredients,
        steps
    };
}

// helper to avoid an unused variable warning from earlier attempt to filter
function colsIgnoredIndex(_) { return 0; }

function writeJsonForMd(relPath) {
    const full = path.join(markdownDir, relPath);
    fs.readFile(full, 'utf8', (err, data) => {
        if (err) { console.error('read error', err); return; }
        try {
            const parsed = parseMarkdownToJson(data, relPath);
            const safe = safeFileName(parsed.cocktail_name || path.basename(relPath, '.md'));
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

