import { NextRequest, NextResponse } from 'next/server';
import { RecipeData, recipeExists, removeRecipe, createRecipe } from '@/lib/dbUtils';
import { authorize } from '@/tools/utils';

export async function POST(req: NextRequest) {
    // Authorization
    const providedKey: string | null = req.headers.get('API_KEY') || req.headers.get('x-api-key');

    if (!authorize(providedKey)) {
        console.error('[import-recipe]:error in authentication');
        return NextResponse.json({ error: '[import-recipe]:error in authentication' }, { status: 400 });
    }
    
    try {
        const raw = await req.json();
        const data: RecipeData = {
            name: raw.recipe_name || raw.name || '',
            description: raw.recipe_description || raw.description || null,
            ingredients: raw.ingredients || [],
            steps: raw.steps || [],
            categories: raw.categories || [],
        };
        try {
            const existing = await recipeExists(data.name);
                if (existing.exists && existing.id) {
                    await removeRecipe({ id: existing.id });
                }
            await createRecipe(data);
                return NextResponse.json({ ok: true }, { status: 201 });
        } catch (err: any) {
            return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
        }
    } catch (ex) {
        console.error('[API:import-recipe]:bad request', ex);
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
}
