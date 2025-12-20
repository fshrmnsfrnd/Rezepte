import { db } from './db';
import { Recipe, Ingredient, Step, Category } from './RecipeDAO';

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

async function addRecipe(recipe: Recipe): Promise<{ recipeID: number }> {
	//Add Recipe
	const res = await db.run(`INSERT INTO Recipe(Name, Description)VALUES(?, ?)`, [recipe.name, recipe.description]);
	const recipeID: number = res.lastID as number;
	//Get Ingredient IDs and add missing and add Links
	for (let ing of recipe.ingredients) {
		ing.ingredient_ID = await ensureIngredient(ing.name);
		await db.run(`INSERT INTO Recipe_Ingredient(Recipe_ID, Ingredient_ID, Amount, Unit, Optional)VALUES(?, ?, ?, ?, ?)`,
			[recipeID, ing.ingredient_ID, ing.amount, ing.unit, ing.optional ?? 0]);
	}
	//Get Category IDs and add missing
	if(recipe.categories){
		for (let cat of recipe.categories) {
			cat.category_ID = await ensureCategory(cat.name)
			await db.run(`INSERT INTO Recipe_Category(Recipe_ID, Category_ID) VALUES(?, ?)`, [recipeID, cat.category_ID])
		}
	}
	//Add Steps
	if (recipe.steps) {
		for (let step of recipe.steps) {
			await db.run(`INSERT INTO Step(Recipe_ID, Number, Description, Duration)VALUES(?, ?, ?, ?)`,
				[recipeID, step.number, step.description, step.duration]);
		}
	}
	return { recipeID }
}

async function updateRecipe(newRecipe: Recipe, recipeID: number): Promise<boolean> {
	//Remove Links to Ingredients
	await db.run(`DELETE FROM Recipe_Ingredient WHERE Recipe_ID = ?`, [recipeID]);
	//Remove Steps
	await db.run(`DELETE FROM Step WHERE Recipe_ID = ?`, [recipeID]);
	//Remove Links to Categories
	await db.run(`DELETE FROM Recipe_Category WHERE Recipe_ID = ?`, [recipeID]);
	//Update Description
	await db.run(`UPDATE Recipe SET Description = ? WHERE Recipe_ID = ?`, [newRecipe.description ?? "", recipeID]);
	//Get Ingredient IDs and add missing
	for (let ing of newRecipe.ingredients) {
		ing.ingredient_ID = await ensureIngredient(ing.name);
		//Add links to Ingredients
		await db.run(`INSERT INTO Recipe_Ingredient(Recipe_ID, Ingredient_ID, Amount, Unit, Optional)VALUES(?, ?, ?, ?, ?)`,
			[recipeID, ing.ingredient_ID, ing.amount, ing.unit, ing.optional ?? 0]);
	}
	//Add Steps
	if (newRecipe.steps) {
		for (let step of newRecipe.steps) {
			await db.run(`INSERT INTO Step(Recipe_ID, Number, Description, Duration)VALUES(?, ?, ?, ?)`,
				[recipeID, step.number, step.description, step.duration]);
		}
	}
	//Add Categories
	if(newRecipe.categories){
		for (let cat of newRecipe.categories){
			cat.category_ID = await ensureCategory(cat.name);
			await db.run(`INSERT INTO Recipe_Category(Recipe_ID, Category_ID) VALUES(?, ?)`, [recipeID, cat.category_ID])
		}
	}
	//Add Category Links

	return true;
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

export async function importRecipe(newRecipe: Recipe): Promise<{ recipeID: number } | void> {
	//Check if Recipe Name already exists
	const exists = await recipeExists(newRecipe.name)
	let recipeID: number = exists.id ?? -1;

	if (exists.exists && exists.id) {
		await withTransaction(async () => {
			await updateRecipe(newRecipe, exists.id as number);
		});
	} else {
		await withTransaction(async () => {
			const result = await addRecipe(newRecipe);
			recipeID = result.recipeID;
		});
	}

	return { recipeID }
}

// Read-only helpers used by API routes (centralize SQL here)
export async function getAllRecipes(): Promise<Recipe[]> {
	const rows = await db.all("SELECT Recipe_ID AS recipe_ID, Name AS name, Description AS description FROM Recipe ORDER BY Name");
	const results: Recipe[] = (rows || []).map((r: any) => new Recipe(
		r.name ?? '',
		[],
		r.recipe_ID ?? undefined,
		r.description ?? undefined,
		undefined,
		undefined
	));
	return results;
}

export async function getCategories(): Promise<Category[]> {
	const sql = `
		SELECT DISTINCT c.Category_ID AS category_ID, c.Name AS name
		FROM Category c
		JOIN Recipe_Category rc
			ON c.Category_ID = rc.Category_ID
		ORDER BY c.Name ASC;
	`;
	const rows = await db.all(sql);
	return (rows || []).map((r: any) => new Category(r.name ?? '', r.category_ID ?? undefined));
}

export async function getIngredientsList(): Promise<Ingredient[]> {
	const sql = `
		SELECT DISTINCT I.Ingredient_ID AS ingredient_ID, I.Name AS name
		FROM Ingredient I
		JOIN Recipe_Ingredient RI
			ON I.Ingredient_ID = RI.Ingredient_ID
		WHERE RI.Optional = 0
		ORDER BY I.Name ASC;
	`;
	const rows = await db.all(sql);
	return (rows || []).map((r: any) => new Ingredient(r.name ?? '', r.ingredient_ID ?? undefined));
}

export async function getRecipeById(id: number): Promise<Recipe | null> {
	const recipeRow = await db.get(
		`SELECT Recipe_ID AS recipe_ID, Name AS name, Description AS description
		 FROM Recipe WHERE Recipe_ID = ?`,
		[id]
	);
	if (!recipeRow) return null;

	const ingredientsRows = await db.all(
		`SELECT Ingredient.Name AS name, RI.Amount AS amount, RI.Unit AS unit, RI.Optional AS optional, Ingredient.Ingredient_ID AS ingredient_ID
		 FROM Recipe_Ingredient AS RI
		 JOIN Ingredient ON Ingredient.Ingredient_ID = RI.Ingredient_ID
		 WHERE RI.Recipe_ID = ?`,
		[id]
	);

	const ingredients: Ingredient[] = (ingredientsRows || []).map((r: any) => new Ingredient(
		r.name ?? '',
		r.ingredient_ID ?? undefined,
		r.amount ?? null,
		r.unit ?? null,
		!!r.optional
	));

	const stepsRows = await db.all(
		`SELECT Number AS number, Description AS description, Step_ID AS step_ID
		 FROM Step
		 WHERE Recipe_ID = ?
		 ORDER BY Number ASC`,
		[id]
	);

	const steps: Step[] = (stepsRows || []).map((r: any) => new Step(
		r.number ?? 0,
		r.description ?? '',
		undefined,
		r.step_ID ?? undefined
	));

	const recipe = new Recipe(
		recipeRow.name ?? '',
		ingredients,
		recipeRow.recipe_ID ?? undefined,
		recipeRow.description ?? undefined,
		steps,
		[]
	);
	return recipe;
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

export async function getIngredientById(id: number): Promise<Ingredient | null>{
	const row = await db.get(
		`SELECT I.Ingredient_ID AS ingredient_ID, I.Name AS name
		FROM Ingredient I
		WHERE I.Ingredient_ID = ?;`, id
	);
	if (!row) return null;
	return new Ingredient(row.name ?? '', row.ingredient_ID ?? undefined);
}

