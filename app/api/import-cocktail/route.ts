import { NextRequest, NextResponse } from 'next/server';
import { CocktailData, cocktailExists, removeCocktail, createCocktail } from '@/lib/dbUtils';

export async function POST(req: NextRequest) {
    // Authorization
    const expectedKey = process.env.API_KEY;
    const providedKey = req.headers.get('API_KEY') || req.headers.get('x-api-key');

    if (expectedKey) {
        if (!providedKey) {
            console.error('[API:import-cocktail]:No API_KEY provided');
            return NextResponse.json({ error: '[API:import-cocktail]:No API_KEY provided' }, { status: 401 });
        }

        if (providedKey !== expectedKey) {
            console.error('[API:import-cocktail]:Invalid API_KEY provided');
            return NextResponse.json({ error: '[API:import-cocktail]:Invalid API_KEY' }, { status: 403 });
        }
    } else {
        console.warn('[API:import-cocktail]:No server API_KEY set — skipping auth (dev only)');
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
