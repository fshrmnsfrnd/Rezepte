import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const ids = Array.isArray(body) ? body : body?.ingredient_ids || body?.ids;

        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'Expected an array of ingredient IDs' }, { status: 400 });
        }

        // Normalize ids to integers and remove duplicates
        const providedIds = Array.from(new Set(ids
            .map((v: any) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; })
            .filter((v: number | null) => v !== null)));


        // Build dynamic placeholders for the IN clause
        const placeholders = providedIds.map(() => '?').join(',');

        // New behavior: return cocktails that CONTAIN all provided ingredient IDs (i.e. providedIds ⊆ required_ingredients_of_cocktail)
        // We consider only required ingredients (Optional IS NULL or 0). The HAVING counts distinct provided IDs that appear
        // among the cocktail's required ingredients and requires that count to equal the number of provided IDs.
        const sql = `
            SELECT c.Cocktail_ID as Cocktail_ID
            FROM Cocktail c
            LEFT JOIN Cocktail_Ingredient ci
                ON c.Cocktail_ID = ci.Cocktail_ID AND (ci.Optional IS NULL OR ci.Optional = 0)
            GROUP BY c.Cocktail_ID
            HAVING COUNT(DISTINCT CASE WHEN ci.Ingredient_ID IN (${placeholders}) THEN ci.Ingredient_ID END) = ?
        `;

        // params: first the providedIds for the IN(...) placeholders, then the expected match count (providedIds.length)
        const params = [...providedIds, providedIds.length];

        const rows = await db.all(sql, params as any[]);

        const cocktailIds = rows.map((r: any) => r.Cocktail_ID);

        return NextResponse.json(cocktailIds);
    } catch (ex) {
        console.error('Error in cocktailsFilteredByIngredients', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
