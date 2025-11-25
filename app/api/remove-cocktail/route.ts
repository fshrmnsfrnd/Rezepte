import { NextRequest, NextResponse } from "next/server";
import { removeCocktail } from "@/lib/dbUtils";
import { authorize } from "@/tools/utils";

export async function POST(req: NextRequest) {
	// Authorization
	const providedKey: string | null = req.headers.get('API_KEY') || req.headers.get('x-api-key');

	if (!authorize(providedKey)) {
		console.error('[remove-cocktail]:error in authentication');
		return NextResponse.json({ error: '[remove-cocktail]:error in authentication' }, { status: 400 });
	}

	try {
		const body = await req.json();
		const name = (body.cocktail_name || body.name || '').toString().trim();
		const id = body.cocktail_id ? Number(body.cocktail_id) : undefined;
		if (!name && !id) {
			return NextResponse.json({ error: 'Missing cocktail identifier' }, { status: 400 });
		}
		try {
			const res = await removeCocktail({ name, id });
			if (!res.deleted) {
				return NextResponse.json({ error: 'Cocktail not found' }, { status: 404 });
			}
			return NextResponse.json(res, { status: 200 });
		} catch (err) {
			console.error('[API:remove-cocktail]:delete error', err);
			return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
		}
	} catch (ex) {
		console.error('[API:remove-cocktail]:bad request', ex);
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
}