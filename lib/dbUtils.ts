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

export type RecipeData = {
	name: string;
	description?: string | null;
	ingredients: IngredientInput[];
	steps?: StepInput[];
	categories?: CategoryInput[];
};

export async function recipeExists(name: string): Promise<{ exists: boolean; id?: number, name?: string }> {
	const trimmed = name.trim();
	if (!trimmed) return { exists: false };
	const row = await db.get(`SELECT Recipe_ID AS id, Name as name FROM Recipe WHERE Name = ? COLLATE NOCASE`, [trimmed]);
	if (!row || !row.id) return { exists: false };
	return { exists: true, id: row.id, name: row.name };
}

export async function getRecipeIdByName(name: string): Promise<number | null> {
	const { exists, id } = await recipeExists(name);
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
	await db.run(`DELETE FROM Ingredient WHERE Ingredient_ID NOT IN (SELECT Ingredient_ID FROM Recipe_Ingredient)`);
}

export async function cleanupCategories(): Promise<void> {
	await db.run(`DELETE FROM Category WHERE Category_ID NOT IN (SELECT Category_ID FROM Recipe_Category)`);
}

export async function removeRecipe(opts: { name?: string; id?: number }): Promise<{ deleted: boolean; recipe_id?: number }> {
	let recipeId = opts.id || null;
	if (!recipeId && opts.name) {
		recipeId = await getRecipeIdByName(opts.name);
	}
	if (!recipeId) {
		return { deleted: false };
	}

	await db.exec('BEGIN TRANSACTION;');
	try {
		await db.run(`DELETE FROM Step WHERE Recipe_ID = ?`, [recipeId]);
		await db.run(`DELETE FROM Recipe_Ingredient WHERE Recipe_ID = ?`, [recipeId]);
		await db.run(`DELETE FROM Recipe_Category WHERE Recipe_ID = ?`, [recipeId]);
		await db.run(`DELETE FROM Recipe WHERE Recipe_ID = ?`, [recipeId]);
		await cleanupIngredients();
		await cleanupCategories();
		await db.exec('COMMIT;');
		return { deleted: true, recipe_id: recipeId };
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw new Error('Remove failed');
	}
}

export async function createRecipe(data: RecipeData): Promise<{ recipe_id: number }> {
	if (!data.name || !data.name.trim()) {
		throw new Error('Missing recipe name');
	}
	if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
		throw new Error('No ingredients provided');
	}

	await db.exec('BEGIN TRANSACTION;');
	try {
		const ins = await db.run(`INSERT INTO Recipe (Name, Description) VALUES (?, ?)`, [data.name.trim(), data.description ?? null]);
		const recipeId = ins.lastID as number;

		for (const ing of data.ingredients) {
			const ingName = (ing.ingredient_name || '').trim();
			if (!ingName) continue;
			const ingId = await ensureIngredient(ingName);
			await db.run(
				`INSERT INTO Recipe_Ingredient (Recipe_ID, Ingredient_ID, Amount, Unit, Optional) VALUES (?, ?, ?, ?, ?)`,
				[recipeId, ingId, ing.amount ?? null, ing.unit ?? null, ing.optional ? 1 : 0]
			);
		}

		if (Array.isArray(data.steps) && data.steps.length > 0) {
			for (const s of data.steps) {
				await db.run(`INSERT INTO Step (Recipe_ID, Number, Description) VALUES (?, ?, ?)`, [recipeId, s.step_number, s.instruction || '']);
			}
		}

		if (Array.isArray(data.categories) && data.categories.length > 0) {
			for (const c of data.categories) {
				const catName = typeof c === 'string' ? c.trim() : String(c?.category_name || c?.Name || c?.name || '').trim();
				if (!catName) continue;
				const catId = await ensureCategory(catName);
				await db.run(`INSERT INTO Recipe_Category (Recipe_ID, Category_ID) VALUES (?, ?)`, [recipeId, catId]);
			}
		}

		await db.exec('COMMIT;');
		return { recipe_id: recipeId };
	} catch (err) {
		await db.exec('ROLLBACK;');
		throw new Error('Create failed');
	}
}

export async function replaceRecipe(data: RecipeData): Promise<{ recipe_id: number; replaced: boolean }> {
	const existing = await recipeExists(data.name);
	if (existing.exists && existing.id) {
		await removeRecipe({ id: existing.id });
		const created = await createRecipe(data);
		return { recipe_id: created.recipe_id, replaced: true };
	}
	const created = await createRecipe(data);
	return { recipe_id: created.recipe_id, replaced: false };
}

