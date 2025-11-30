import * as path from 'path';

export function safeFileName(name: string) {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}

// helper kept for compatibility with previous implementation
function colsIgnoredIndex(_: string) { return 0; }

export type Ingredient = {
    ingredient_name: string;
    amount: number | null;
    unit: string | null;
    optional?: boolean;
};

export type Step = {
    step_number: number;
    instruction: string;
};

export function parseMarkdownToJson(markdown: string, fileName: string) {
    const lines = markdown.split(/\r?\n/);
    const title = path.basename(fileName, path.extname(fileName)).trim();

    // extract description from blockquote lines (lines starting with '>')
    // collect consecutive blockquote lines before the first header or table
    let recipe_description = '';
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        // stop collecting description when we hit a header or a table start
        if (l.startsWith('#') || l.startsWith('|')) break;
        if (l.startsWith('>')) {
            const txt = l.replace(/^>\s?/, '').trim();
            if (txt.length > 0) {
                recipe_description += (recipe_description ? '\n' : '') + txt;
            }
        }
    }

    // parse YAML-like frontmatter for categories (look for 'Kategorie' key)
    const categories: { category_id: null; category_name: string }[] = [];
    if (lines.length > 0 && lines[0].trim() === '---') {
        let fmEnd = -1;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '---') { fmEnd = i; break; }
        }
        if (fmEnd !== -1) {
            const fmLines = lines.slice(1, fmEnd);
            for (let i = 0; i < fmLines.length; i++) {
                const l = fmLines[i].trim();
                if (/^Kategorie\s*:/i.test(l)) {
                    for (let j = i + 1; j < fmLines.length; j++) {
                        const m = fmLines[j].match(/^\s*-\s*(.+)$/);
                        if (m) categories.push({ category_id: null, category_name: m[1].trim() });
                        else break;
                    }
                    break;
                }
            }
        }
    }

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

    const ingredients: Ingredient[] = [];
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
                let amount: number | null = null;
                let unit: string | null = null;
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
    const steps: Step[] = [];
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
        recipe_id: null,
        recipe_name: title,
        recipe_description: recipe_description,
        categories,
        ingredients,
        steps
    };
}
