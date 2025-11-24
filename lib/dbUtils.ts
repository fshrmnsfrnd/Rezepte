import { db } from './db';

export type IngredientInput = {
	ingredient_name: string;
	amount?: number | null;
	unit?: string | null;
	optional?: boolean;
};

export type StepInput = {
	step_number: number;
	instruction: string;
};

export type CategoryInput = string | { category_name?: string; name?: string; Name?: string };

export type CocktailData = {
	name: string;
	description?: string | null;
	ingredients: IngredientInput[];
	steps?: StepInput[];
	categories?: CategoryInput[];
};

export async function cocktailExists(name: string): Promise<{ exists: boolean; id?: number }> {
	const trimmed = name.trim();
	if (!trimmed) return { exists: false };
	const row = await db.get(`SELECT Cocktail_ID AS id FROM Cocktail WHERE Name = ? COLLATE NOCASE`, [trimmed]);
	if (!row || !row.id) return { exists: false };
	return { exists: true, id: row.id };
}

export async function getCocktailIdByName(name: string): Promise<number | null> {
	const { exists, id } = await cocktailExists(name);
	return exists ? (id as number) : null;
}

export async function ensureIngredient(name: string): Promise<number> {
	const trimmed = name.trim();
	const existing = await db.get(`SELECT Ingredient_ID AS id FROM Ingredient WHERE Name = ? COLLATE NOCASE`, [trimmed]);
	if (existing && existing.id) return existing.id;
	const res = await db.run(`INSERT INTO Ingredient (Name) VALUES (?)`, [trimmed]);
	return res.lastID as number;
}

export async function ensureCategory(name: string): Promise<number> {
	const trimmed = name.trim();
	const existing = await db.get(`SELECT Category_ID AS id FROM Category WHERE Name = ? COLLATE NOCASE`, [trimmed]);
	if (existing && existing.id) return existing.id;
	const res = await db.run(`INSERT INTO Category (Name) VALUES (?)`, [trimmed]);
	return res.lastID as number;
}

export async function cleanupIngredients(): Promise<void> {
	await db.run(`DELETE FROM Ingredient WHERE Ingredient_ID NOT IN (SELECT Ingredient_ID FROM Cocktail_Ingredient)`);
}

export async function cleanupCategories(): Promise<void> {
	await db.run(`DELETE FROM Category WHERE Category_ID NOT IN (SELECT Category_ID FROM Cocktail_Category)`);
}

export async function removeCocktail(opts: { name?: string; id?: number }): Promise<{ deleted: boolean; cocktail_id?: number }> {
	let cocktailId = opts.id || null;
	if (!cocktailId && opts.name) {
		cocktailId = await getCocktailIdByName(opts.name);
	}
	if (!cocktailId) {
		return { deleted: false };
	}

	await db.exec('BEGIN TRANSACTION;');
	try {
		await db.run(`DELETE FROM Step WHERE Cocktail_ID = ?`, [cocktailId]);
		await db.run(`DELETE FROM Cocktail_Ingredient WHERE Cocktail_ID = ?`, [cocktailId]);
		await db.run(`DELETE FROM Cocktail_Category WHERE Cocktail_ID = ?`, [cocktailId]);
		await db.run(`DELETE FROM Cocktail WHERE Cocktail_ID = ?`, [cocktailId]);
		await cleanupIngredients();
		await cleanupCategories();
		await db.exec('COMMIT;');
		return { deleted: true, cocktail_id: cocktailId };
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw new Error('Remove failed');
	}
}

export async function createCocktail(data: CocktailData): Promise<{ cocktail_id: number }> {
	if (!data.name || !data.name.trim()) {
		throw new Error('Missing cocktail name');
	}
	if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
		throw new Error('No ingredients provided');
	}

	await db.exec('BEGIN TRANSACTION;');
	try {
		const ins = await db.run(`INSERT INTO Cocktail (Name, Description) VALUES (?, ?)`, [data.name.trim(), data.description ?? null]);
		const cocktailId = ins.lastID as number;

		for (const ing of data.ingredients) {
			const ingName = (ing.ingredient_name || '').trim();
			if (!ingName) continue;
			const ingId = await ensureIngredient(ingName);
			await db.run(
				`INSERT INTO Cocktail_Ingredient (Cocktail_ID, Ingredient_ID, Amount, Unit, Optional) VALUES (?, ?, ?, ?, ?)`,
				[cocktailId, ingId, ing.amount ?? null, ing.unit ?? null, ing.optional ? 1 : 0]
			);
		}

		if (Array.isArray(data.steps) && data.steps.length > 0) {
			for (const s of data.steps) {
				await db.run(`INSERT INTO Step (Cocktail_ID, Number, Description) VALUES (?, ?, ?)`, [cocktailId, s.step_number, s.instruction || '']);
			}
		}

		if (Array.isArray(data.categories) && data.categories.length > 0) {
			for (const c of data.categories) {
				const catName = typeof c === 'string' ? c.trim() : String(c?.category_name || c?.Name || c?.name || '').trim();
				if (!catName) continue;
				const catId = await ensureCategory(catName);
				await db.run(`INSERT INTO Cocktail_Category (Cocktail_ID, Category_ID) VALUES (?, ?)`, [cocktailId, catId]);
			}
		}

		await db.exec('COMMIT;');
		return { cocktail_id: cocktailId };
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw new Error('Create failed');
	}
}

export async function replaceCocktail(data: CocktailData): Promise<{ cocktail_id: number; replaced: boolean }> {
	const existing = await cocktailExists(data.name);
	if (existing.exists && existing.id) {
		await removeCocktail({ id: existing.id });
		const created = await createCocktail(data);
		return { cocktail_id: created.cocktail_id, replaced: true };
	}
	const created = await createCocktail(data);
	return { cocktail_id: created.cocktail_id, replaced: false };
}

