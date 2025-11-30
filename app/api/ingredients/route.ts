import { NextResponse } from "next/server";
import { getIngredientsList } from '@/lib/dbUtils';

export async function GET(request: Request) {
    const ingredients = await getIngredientsList();
    return NextResponse.json(ingredients);
}