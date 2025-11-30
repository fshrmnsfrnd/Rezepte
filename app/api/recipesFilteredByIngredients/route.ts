import { NextRequest, NextResponse } from "next/server";
import { filterRecipesByIngredients } from '@/lib/dbUtils';

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database
    try {
        const body = await req.json();
        const ids = Array.isArray(body) ? body : body?.ids;
        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'Expected an array of ingredient IDs' }, { status: 400 });
        }

        const providedIds = Array.from(new Set(ids
            .map((v: any) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; })
            .filter((v: number | null) => v !== null)));

        const rawAllowedMissing = body?.amountMissingIngredients;
        let acceptMissingIngredients = 0;
        if (rawAllowedMissing != null) {
            const n = Number(rawAllowedMissing);
            acceptMissingIngredients = Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0;
        }

        const recipeIds = await filterRecipesByIngredients(providedIds, acceptMissingIngredients);
        return NextResponse.json(recipeIds);
    } catch (ex) {
        console.error('Error in recipesFilteredByIngredients', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
