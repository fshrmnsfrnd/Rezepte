import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database
    
    try {
        //Get Param
        const body = await req.json();
        const ids = Array.isArray(body) ? body : body?.ids;

        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'Expected an array of ingredient IDs' }, { status: 400 });
        }

        //Get the Recipes
        const dbRes = await db.all(
            `SELECT DISTINCT RI.Recipe_ID
            FROM Recipe_Ingredient RI
            WHERE RI.Ingredient_ID IN (${ids})
            ORDER BY CI.Recipe_RD;`,
        );

        const recipeIds = Array.from(new Set(dbRes.map(row => row.Recipe_ID)));

        return NextResponse.json(recipeIds);
    } catch (ex) {
        console.error('Error in recipesFilteredByMustHaveIngredients', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
