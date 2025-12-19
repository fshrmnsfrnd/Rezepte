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

// Simple FIFO queue so write transactions are executed sequentially
let _writeLock: Promise<any> = Promise.resolve();
function _queue<T>(task: () => Promise<T>): Promise<T> {
	const run = () => task();
	const next = _writeLock.then(run, run);
	// ensure errors do not break the chain
	_writeLock = next.catch(() => {});
	return next;
}

export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
	return _queue(async () => {
		await db.exec('BEGIN TRANSACTION;');
		try {
			const res = await fn();
			await db.exec('COMMIT;');
			return res;
		} catch (err) {
			await db.exec('ROLLBACK;');
			throw err;
		}
	});
}

export async function recipeExists(name: string): Promise<{ exists: boolean; id?: number, name?: string }> {
	const trimmed = (name || '').trim();
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
	const trimmed = (name || '').trim();
	const existing = await db.get(`SELECT Ingredient_ID AS id FROM Ingredient WHERE Name = ? COLLATE NOCASE`, [trimmed]);
	if (existing && existing.id) return existing.id;
	const res = await db.run(`INSERT INTO Ingredient (Name) VALUES (?)`, [trimmed]);
	return res.lastID as number;
}

export async function ensureCategory(name: string): Promise<number> {
	const trimmed = (name || '').trim();
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

// Internal implementations that assume a transaction is already open.
async function _removeRecipeImpl(recipeId: number): Promise<void> {
	await db.run(`DELETE FROM Step WHERE Recipe_ID = ?`, [recipeId]);
	await db.run(`DELETE FROM Recipe_Ingredient WHERE Recipe_ID = ?`, [recipeId]);
	await db.run(`DELETE FROM Recipe_Category WHERE Recipe_ID = ?`, [recipeId]);
	await db.run(`DELETE FROM Recipe WHERE Recipe_ID = ?`, [recipeId]);
	await cleanupIngredients();
	await cleanupCategories();
}

async function _createRecipeImpl(data: RecipeData): Promise<number> {
	if (!data.name || !data.name.trim()) {
		throw new Error('Missing recipe name');
	}
	if (!Array.isArray(data.ingredients) || data.ingredients.length === 0) {
		throw new Error('No ingredients provided');
	}

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

	return recipeId;
}

// Exported wrappers keep backward compatibility: they create their own transaction.
export async function removeRecipe(opts: { name?: string; id?: number }): Promise<{ deleted: boolean; recipe_id?: number }> {
	let recipeId = opts.id || null;
	if (!recipeId && opts.name) {
		recipeId = await getRecipeIdByName(opts.name);
	}
	if (!recipeId) {
		return { deleted: false };
	}

	await withTransaction(async () => {
		await _removeRecipeImpl(recipeId as number);
	});

	return { deleted: true, recipe_id: recipeId };
}

export async function createRecipe(data: RecipeData): Promise<{ recipe_id: number }> {
	const recipeId = await withTransaction(async () => {
		return _createRecipeImpl(data);
	});
	return { recipe_id: recipeId };
}

export async function replaceRecipe(data: RecipeData): Promise<{ recipe_id: number; replaced: boolean }> {
	const existing = await recipeExists(data.name);
	if (existing.exists && existing.id) {
		// perform remove + create inside one transaction to avoid intermediate states
		const recipeId = await withTransaction(async () => {
			await _removeRecipeImpl(existing.id as number);
			return _createRecipeImpl(data);
		});
		return { recipe_id: recipeId, replaced: true };
	}
	const created = await createRecipe(data);
	return { recipe_id: created.recipe_id, replaced: false };
}

// Import helper: move import SQL here so no other module runs SQL directly.
export async function importRecipePayload(payload: any): Promise<{ recipe_id: number } | void> {
	const name = payload.recipe_name || payload.name || null;
	const description = payload.recipe_description || payload.description || null;
	const ingredients: IngredientInput[] = payload.ingredients || [];
	const steps: StepInput[] = payload.steps || [];

	if (!name) {
		throw { status: 400, message: 'Missing recipe name' };
	}
	if (!Array.isArray(ingredients) || ingredients.length === 0) {
		throw { status: 400, message: 'No ingredients provided - import skipped' };
	}

	return withTransaction(async () => {
		// check if exists
		const existing = await recipeExists(name);
		if (existing.exists && existing.id) {
			await _removeRecipeImpl(existing.id as number);
		}

		const recipeId = await _createRecipeImpl({
			name,
			description,
			ingredients,
			steps,
			categories: payload.categories || [],
		});

		return { recipe_id: recipeId };
	});
}

// Read-only helpers used by API routes (centralize SQL here)
export async function getAllRecipes(): Promise<any[]> {
	return db.all("SELECT Recipe_ID, Name, Description FROM Recipe ORDER BY Name");
}

export async function getCategories(): Promise<any[]> {
	const sql = `
		SELECT DISTINCT c.Category_ID, c.Name
		FROM Category c
		JOIN Recipe_Category rc
			ON c.Category_ID = rc.Category_ID
		ORDER BY c.Name ASC;
	`;
	return db.all(sql);
}

export async function getIngredientsList(): Promise<any[]> {
	const sql = `
		SELECT DISTINCT I.Ingredient_ID, I.Name
		FROM Ingredient I
		JOIN Recipe_Ingredient RI
			ON I.Ingredient_ID = RI.Ingredient_ID
		WHERE RI.Optional = 0
		ORDER BY I.Name ASC;
	`;
	return db.all(sql);
}

export async function getRecipeById(id: number) {
	const recipe = await db.get(
		`SELECT Recipe_ID AS recipe_id, Name AS recipe_name, Description AS recipe_description
		 FROM Recipe WHERE Recipe_ID = ?`,
		[id]
	);
	if (!recipe) return null;

	const ingredientsRows = await db.all(
		`SELECT Ingredient.Name AS ingredient_name, RI.Amount AS amount, RI.Unit AS unit, RI.Optional AS optional
		 FROM Recipe_Ingredient AS RI
		 JOIN Ingredient ON Ingredient.Ingredient_ID = RI.Ingredient_ID
		 WHERE RI.Recipe_ID = ?`,
		[id]
	);

	const ingredients = (ingredientsRows || []).map((r: any) => ({
		ingredient_name: r.ingredient_name,
		amount: r.amount,
		unit: r.unit,
		optional: !!r.optional,
	}));

	const stepsRows = await db.all(
		`SELECT Number AS step_number, Description AS instruction
		 FROM Step
		 WHERE Recipe_ID = ?
		 ORDER BY Number ASC`,
		[id]
	);

	const steps = (stepsRows || []).map((r: any) => ({
		step_number: r.step_number,
		instruction: r.instruction,
	}));

	return {
		recipe_id: recipe.recipe_id,
		recipe_name: recipe.recipe_name,
		recipe_description: recipe.recipe_description,
		ingredients,
		steps,
	};
}

export async function filterRecipesByCategories(providedIds: number[]): Promise<number[]> {
	if (!Array.isArray(providedIds) || providedIds.length === 0) return [];
	// Get distinct recipe ids that have at least one of the provided category ids
	const placeholders = providedIds.map(() => '?').join(',');
	const rows = await db.all(
		`SELECT DISTINCT Recipe_ID as recipe_id FROM Recipe_Category WHERE Category_ID IN (${placeholders})`,
		providedIds
	);
	return rows.map((r: any) => Number(r.recipe_id));
}

export async function filterRecipesByIngredients(providedIds: number[], acceptMissingIngredients = 0): Promise<number[]> {
	// Fetch required (non-optional) ingredients per recipe
	const dbRes = await db.all(`
		SELECT RI.Recipe_ID, RI.Ingredient_ID
		FROM Recipe_Ingredient RI
		WHERE RI.Optional = 0
		ORDER BY RI.Recipe_ID;
	`);

	const recipeMap = new Map<number, number[]>();
	for (const row of dbRes) {
		const currRID = Number(row.Recipe_ID);
		const currIID = Number(row.Ingredient_ID);
		if (recipeMap.has(currRID)) {
			recipeMap.get(currRID)!.push(currIID);
		} else {
			recipeMap.set(currRID, [currIID]);
		}
	}

	const providedSet = new Set((providedIds || []).map((v) => Number(v)));
	const recipeIds: number[] = [];

	for (const [rid, iids] of recipeMap) {
		let ingredientsNotProvided = 0;
		for (const iid of iids) {
			if (!providedSet.has(iid)) ingredientsNotProvided += 1;
		}
		if (ingredientsNotProvided <= (acceptMissingIngredients || 0)) recipeIds.push(rid);
	}

	return recipeIds;
}

export async function filterRecipesByMustHaveIngredients(ids: number[]): Promise<number[]> {
	if (!Array.isArray(ids) || ids.length === 0) return [];
	const placeholders = ids.map(() => '?').join(',');
	const rows = await db.all(
		`SELECT DISTINCT RI.Recipe_ID as Recipe_ID
		 FROM Recipe_Ingredient RI
		 WHERE RI.Ingredient_ID IN (${placeholders})
		 ORDER BY RI.Recipe_ID;`,
		ids
	);
	return Array.from(new Set(rows.map((r: any) => Number(r.Recipe_ID))));
}

export async function getIngredientsOrderedByUsage(): Promise<any[]>{
	const rows = await db.all(
		`SELECT I.Name AS Name, COUNT(RI.Ingredient_ID) AS Anzahl
		FROM Recipe_Ingredient RI
		LEFT JOIN Ingredient I ON I.Ingredient_ID = RI.Ingredient_ID
		GROUP BY Name
		ORDER BY Anzahl;`
	);
	return rows;
}

export async function getIngredientById(id: number): Promise<any>{
	const row = await db.all(
		`SELECT I.Name AS Name
		FROM Ingredient I
		WHERE I.Ingredient_ID = ?;`, id
	);
	return row;
}