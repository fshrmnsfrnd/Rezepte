import { NextResponse } from "next/server";
import { getAllRecipes } from '@/lib/dbUtils';

export async function GET() {
    const recipes = await getAllRecipes();
    return NextResponse.json(recipes);
}