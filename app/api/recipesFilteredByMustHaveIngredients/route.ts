import { NextRequest, NextResponse } from "next/server";
import { filterRecipesByMustHaveIngredients } from '@/lib/dbUtils';

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database
    try {
        const body = await req.json();
        const ids = Array.isArray(body) ? body : body?.ids;
        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'Expected an array of ingredient IDs' }, { status: 400 });
        }

        const recipeIds = await filterRecipesByMustHaveIngredients(ids.map((v: any) => Number(v)));
        return NextResponse.json(recipeIds);
    } catch (ex) {
        console.error('Error in recipesFilteredByMustHaveIngredients', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
