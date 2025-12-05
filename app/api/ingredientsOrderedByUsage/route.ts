import { NextResponse } from "next/server";
import { getIngredientsOrderedByUsage } from '@/lib/dbUtils';

export async function GET(request: Request) {
    const ingredients = await getIngredientsOrderedByUsage();
    return NextResponse.json(ingredients);
}