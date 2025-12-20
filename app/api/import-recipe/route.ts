import { NextRequest, NextResponse } from 'next/server';
import { recipeExists, removeRecipe, createRecipe } from '@/lib/dbUtils';
import { Recipe, Ingredient, Step, Category } from '@/lib/RecipeDAO';
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
        const ingredients: Ingredient[] = (raw.ingredients || []).map((ing: any) => new Ingredient(
            String(ing.ingredient_name ?? ing.name ?? '').trim(),
            undefined,
            typeof ing.amount === 'number' ? ing.amount : null,
            ing.unit ?? null,
            !!ing.optional
        ));
        const steps: Step[] = (raw.steps || []).map((s: any) => new Step(
            Number(s.step_number ?? s.number ?? 0),
            String(s.instruction ?? s.description ?? '').trim()
        ));
        const categories: Category[] = (raw.categories || []).map((c: any) => new Category(
            typeof c === 'string' ? c.trim() : String(c?.category_name || c?.Name || c?.name || '').trim()
        )).filter((c: Category) => !!c.name);

        const data: Recipe = new Recipe(
            raw.recipe_name || raw.name, 
            ingredients, 
            undefined, 
            raw.recipe_description || raw.description, 
            steps, 
            categories);
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
