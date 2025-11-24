import { NextRequest, NextResponse } from 'next/server';
import { CocktailData, cocktailExists, removeCocktail, createCocktail } from '@/lib/dbUtils';
import { authorize } from '@/lib/utils';

export async function POST(req: NextRequest) {
    // Authorization
    const providedKey: string | null = req.headers.get('API_KEY') || req.headers.get('x-api-key');

    if (!authorize(providedKey)) {
        console.error('[import-cocktail]:error in authentication');
        return NextResponse.json({ error: '[import-cocktail]:error in authentication' }, { status: 400 });
    }
    
    try {
        const raw = await req.json();
        const data: CocktailData = {
            name: raw.cocktail_name || raw.name || '',
            description: raw.cocktail_description || raw.description || null,
            ingredients: raw.ingredients || [],
            steps: raw.steps || [],
            categories: raw.categories || [],
        };
        try {
            const existing = await cocktailExists(data.name);
                if (existing.exists && existing.id) {
                    await removeCocktail({ id: existing.id });
                }
                await createCocktail(data);
                return NextResponse.json({ ok: true }, { status: 201 });
        } catch (err: any) {
            return NextResponse.json({ error: err.message || 'Import failed' }, { status: 500 });
        }
    } catch (ex) {
        console.error('[API:import-cocktail]:bad request', ex);
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
}
