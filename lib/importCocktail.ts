import { db } from './db';

export type IngredientIn = {
    ingredient_name: string;
    amount: number | null;
    unit: string | null;
    optional?: boolean;
};

export type StepIn = {
    step_number: number;
    instruction: string;
};

export async function importCocktail(payload: any) {
    const name = payload.cocktail_name || payload.name || null;
    const description = payload.cocktail_description || payload.description || null;
    const ingredients: IngredientIn[] = payload.ingredients || [];
    const steps: StepIn[] = payload.steps || [];
    const apiKey = process.env.API_KEY;

    if (!name) {
        throw { status: 400, message: 'Missing cocktail name' };
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        throw { status: 400, message: 'No ingredients provided - import skipped' };
    }

    await db.exec('BEGIN TRANSACTION;');
    //Check if Cocktail already exists
    try {
        let existingId: number | null = null;
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (apiKey != null) {
                headers['API_KEY'] = apiKey;
            }

            const resp = await fetch('/api/cocktail-exists', {
                method: 'POST',
                headers,
                body: JSON.stringify({ cocktail_name: name }),
            });

            if (resp.ok) {
                const json = await resp.json();
                if (json && json.exists && json.cocktail_id) {
                    existingId = Number(json.cocktail_id) || null;
                }
            } else {
                console.warn('cocktail-exists API returned non-OK:', resp.status);
                await db.exec('ROLLBACK;');
                return;
            }
        } catch (apiErr) {
            console.warn('cocktail-exists API call failed, falling back to DB check', apiErr);
            await db.exec('ROLLBACK;');
            return;
        }

        //If cocktail exists: Remove it and clean up the other Tables
        if (existingId) {
            const idNum = Number(existingId);
            try {
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (apiKey != null) headers['API_KEY'] = String(apiKey);

                const resp = await fetch('/api/remove-cocktail', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ cocktail_id: idNum }),
                });

                if (resp.ok) {
                    const jr = await resp.json().catch(() => null);
                    if (!(!jr || (jr && !jr.error))) {
                        console.warn('remove-cocktail API returned error payload', jr);
                        await db.exec('ROLLBACK;');
                        return;
                    }
                } else {
                    console.warn('remove-cocktail API returned non-OK:', resp.status);
                    await db.exec('ROLLBACK;');
                    return;
                }
            } catch (apiErr) {
                console.warn('remove-cocktail API call failed, falling back to DB deletes', apiErr);
                await db.exec('ROLLBACK;');
                return;
            }
        }

        
        const res = await db.run(`INSERT INTO Cocktail (Name, Description) VALUES (?, ?)`, [name, description]);
        const cocktailId = res.lastID as number;

        for (const ing of ingredients) {
            const ingName = (ing.ingredient_name || '').trim();
            if (!ingName) continue;
            const existingIng = await db.get(`SELECT Ingredient_ID AS id FROM Ingredient WHERE Name = ? COLLATE NOCASE`, [ingName]);
            let ingredientId: number;
            if (existingIng && existingIng.id) {
                ingredientId = existingIng.id;
            } else {
                const r = await db.run(`INSERT INTO Ingredient (Name) VALUES (?)`, [ingName]);
                ingredientId = r.lastID as number;
            }

            await db.run(
                `INSERT INTO Cocktail_Ingredient (Cocktail_ID, Ingredient_ID, Amount, Unit, Optional) VALUES (?, ?, ?, ?, ?)`,
                [cocktailId, ingredientId, ing.amount ?? null, ing.unit ?? null, ing.optional ? 1 : 0]
            );
        }

        if (Array.isArray(steps) && steps.length > 0) {
            for (const s of steps) {
                const num = Number(s.step_number) || null;
                const instr = (s.instruction || '').toString();
                await db.run(`INSERT INTO Step (Cocktail_ID, Number, Description) VALUES (?, ?, ?)`, [cocktailId, num, instr]);
            }
        }

            // handle categories if provided
            if (Array.isArray(payload.categories) && payload.categories.length > 0) {
                for (const c of payload.categories) {
                    // accept either string or object with category_name
                    const catName = (typeof c === 'string') ? c.trim() : ((c && (c.category_name || c.Name || c.name)) ? String(c.category_name || c.Name || c.name).trim() : '');
                    if (!catName) continue;
                    // find existing category (case-insensitive)
                    const existingCat = await db.get(`SELECT Category_ID AS id FROM Category WHERE Name = ? COLLATE NOCASE`, [catName]);
                    let categoryId: number;
                    if (existingCat && existingCat.id) {
                        categoryId = existingCat.id;
                    } else {
                        const rc = await db.run(`INSERT INTO Category (Name) VALUES (?)`, [catName]);
                        categoryId = rc.lastID as number;
                    }

                    // link cocktail <-> category
                    await db.run(`INSERT INTO Cocktail_Category (Cocktail_ID, Category_ID) VALUES (?, ?)`, [cocktailId, categoryId]);
                }
            }

        await db.exec('COMMIT;');
        return { cocktail_id: cocktailId };
    } catch (err) {
        await db.exec('ROLLBACK;');
        console.error('import error', err);
        throw { status: 500, message: 'Import failed' };
    }
}
