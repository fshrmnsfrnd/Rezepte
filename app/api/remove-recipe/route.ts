import { NextRequest, NextResponse } from "next/server";
import { removeRecipe } from "@/lib/dbUtils";
import { authorize } from "@/tools/utils";

export async function POST(req: NextRequest) {
	// Authorization
	const providedKey: string | null = req.headers.get('API_KEY') || req.headers.get('x-api-key');

	if (!authorize(providedKey)) {
		console.error('[remove-recipe]:error in authentication');
		return NextResponse.json({ error: '[remove-recipe]:error in authentication' }, { status: 400 });
	}

	try {
		const body = await req.json();
		const name = (body.recipe_name || body.name || '').toString().trim();
		const id = body.recipe_id ? Number(body.recipe_id) : undefined;
		if (!name && !id) {
			return NextResponse.json({ error: 'Missing recipe identifier' }, { status: 400 });
		}
		try {
			const res = await removeRecipe({ name, id });
			if (!res.deleted) {
				return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
			}
			return NextResponse.json(res, { status: 200 });
		} catch (err) {
			console.error('[API:remove-recipe]:delete error', err);
			return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
		}
	} catch (ex) {
		console.error('[API:remove-recipe]:bad request', ex);
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
}