import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const name = (body.cocktail_name || body.name || '').toString().trim();

		if (!name) {
			return NextResponse.json({ error: 'Missing cocktail name' }, { status: 400 });
		}

		// find cocktail (case-insensitive)
		const cocktail = await db.get(
			`SELECT Cocktail_ID AS id, Name FROM Cocktail WHERE Name = ? COLLATE NOCASE`,
			[name]
		);

		if (!cocktail || !cocktail.id) {
			return NextResponse.json({ error: 'Cocktail not found' }, { status: 404 });
		}

		await db.exec('BEGIN TRANSACTION;');
		try {
			await db.run(`DELETE FROM Step WHERE Cocktail_ID = ?`, [cocktail.id]);
			await db.run(`DELETE FROM Cocktail_Ingredient WHERE Cocktail_ID = ?`, [cocktail.id]);
			await db.run(`DELETE FROM Cocktail_Category WHERE Cocktail_ID = ?`, [cocktail.id]);
			await db.run(`DELETE FROM Cocktail WHERE Cocktail_ID = ?`, [cocktail.id]);

			// Clean up Ingredients
			await db.run(`
				DELETE FROM Ingredient
				WHERE Ingredient_ID NOT IN (SELECT Ingredient_ID FROM Cocktail_Ingredient)
			`);

			// Clean up Category
			await db.run(`
				DELETE FROM Category
				WHERE Category_ID NOT IN (SELECT Category_ID FROM Cocktail_Category)
			`);

			await db.exec('COMMIT;');
			return NextResponse.json({ deleted: true, cocktail_id: cocktail.id });
		} catch (err) {
			await db.exec('ROLLBACK;');
			console.error('delete error', err);
			return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
		}
	} catch (ex) {
		console.error('bad request', ex);
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
}