import { NextRequest, NextResponse } from "next/server";
import { getRecipeById } from '@/lib/dbUtils';

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database

    const body = await req.json();
    const id: number = parseInt(body.id, 10);
    if (!id) return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });

    const result = await getRecipeById(id);
    if (!result) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    return NextResponse.json(result);
}