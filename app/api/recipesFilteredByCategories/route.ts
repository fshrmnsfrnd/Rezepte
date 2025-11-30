import { NextRequest, NextResponse } from "next/server";
import { filterRecipesByCategories } from '@/lib/dbUtils';

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database
    try {
        const body = await req.json();
        const ids = Array.isArray(body) ? body : body?.ids;
        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'Expected an array of category IDs' }, { status: 400 });
        }

        const providedIds = Array.from(new Set(ids
            .map((v: any) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; })
            .filter((v: number | null) => v !== null)));

        const recipeIds = await filterRecipesByCategories(providedIds);
        return NextResponse.json(recipeIds);
    } catch (ex) {
        console.error('Error in recipesFilteredByCategorys', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
