"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeFileName = safeFileName;
exports.parseMarkdownToJson = parseMarkdownToJson;
var path = require("path");
function safeFileName(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}
// helper kept for compatibility with previous implementation
function colsIgnoredIndex(_) { return 0; }
function parseMarkdownToJson(markdown, fileName) {
    var lines = markdown.split(/\r?\n/);
    var title = path.basename(fileName, path.extname(fileName)).trim();
    // extract description from blockquote lines (lines starting with '>')
    // collect consecutive blockquote lines before the first header or table
    var recipe_description = '';
    for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        // stop collecting description when we hit a header or a table start
        if (l.startsWith('#') || l.startsWith('|'))
            break;
        if (l.startsWith('>')) {
            var txt = l.replace(/^>\s?/, '').trim();
            if (txt.length > 0) {
                recipe_description += (recipe_description ? '\n' : '') + txt;
            }
        }
    }
    // parse YAML-like frontmatter for categories (look for 'Kategorie' key)
    var categories = [];
    if (lines.length > 0 && lines[0].trim() === '---') {
        var fmEnd = -1;
        for (var i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
                fmEnd = i;
                break;
            }
        }
        if (fmEnd !== -1) {
            var fmLines = lines.slice(1, fmEnd);
            for (var i = 0; i < fmLines.length; i++) {
                var l = fmLines[i].trim();
                if (/^Kategorie\s*:/i.test(l)) {
                    for (var j = i + 1; j < fmLines.length; j++) {
                        var m = fmLines[j].match(/^\s*-\s*(.+)$/);
                        if (m)
                            categories.push({ category_id: null, category_name: m[1].trim() });
                        else
                            break;
                    }
                    break;
                }
            }
        }
    }
    // parse table: find first line that starts with '|' and header separator
    var tableStart = -1, tableEnd = -1;
    for (var i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('|')) {
            if (tableStart === -1)
                tableStart = i;
        }
        else {
            if (tableStart !== -1 && tableEnd === -1) {
                tableEnd = i;
                break;
            }
        }
    }
    if (tableStart !== -1 && tableEnd === -1)
        tableEnd = lines.length;
    var ingredients = [];
    if (tableStart !== -1) {
        var tableLines = lines.slice(tableStart, tableEnd).map(function (l) { return l.trim(); });
        // header is first line, separator second; data from third
        var dataLines = tableLines.slice(2);
        dataLines.forEach(function (l) {
            var cols = l.split('|').map(function (c) { return c.trim(); }).filter(function (_, idx) { return idx !== 0 && idx !== colsIgnoredIndex(l); });
            // fallback: split and take first two meaningful columns
            var parts = l.split('|').map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
            if (parts.length >= 2) {
                var amountRaw = parts[0];
                var ingRaw = parts[1];
                // clean ingredient name (# prefix used in some files)
                var ingredient_name = ingRaw.replace(/^#/, '').trim();
                // detect (optional) marker in name or amount (case-insensitive), remove it and set flag
                var optionalFlag = false;
                var optionalPattern = /\(?\s*optional\s*\)?/i;
                if (optionalPattern.test(ingredient_name)) {
                    ingredient_name = ingredient_name.replace(optionalPattern, '').trim();
                    optionalFlag = true;
                }
                // parse amount and unit (trim inputs)
                var amountRawTrim = amountRaw ? amountRaw.trim() : '';
                var amount = null;
                var unit = null;
                var numMatch = amountRawTrim.match(/^([\d.,]+)\s*(.*)$/);
                if (numMatch) {
                    amount = Number(numMatch[1].replace(',', '.'));
                    unit = (numMatch[2] || '').trim() || null;
                }
                else if (amountRawTrim && !/^-+$/.test(amountRawTrim)) {
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
                ingredients.push({ ingredient_name: ingredient_name.trim(), amount: amount, unit: unit ? unit.trim() : unit, optional: optionalFlag });
            }
        });
    }
    // parse numbered steps (lines starting with '1.' etc) after a 'Zubereitung' header if present
    var steps = [];
    var inSteps = false;
    for (var i = 0; i < lines.length; i++) {
        var l = lines[i].trim();
        if (/^#?\s*Zubereitung/i.test(l) || /^#?\s*Zubereitung/i.test(lines[i])) {
            inSteps = true;
            continue;
        }
        if (!inSteps)
            continue;
        var m = l.match(/^(\d+)\.\s*(.*)$/);
        if (m) {
            steps.push({ step_number: Number(m[1]), instruction: m[2].trim() });
        }
    }
    // fallback: if no steps found, look for any numbered list anywhere
    if (steps.length === 0) {
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i].trim();
            var m = l.match(/^(\d+)\.\s*(.*)$/);
            if (m)
                steps.push({ step_number: Number(m[1]), instruction: m[2].trim() });
        }
    }
    return {
        recipe_id: null,
        recipe_name: title,
        recipe_description: recipe_description,
        categories: categories,
        ingredients: ingredients,
        steps: steps
    };
}
