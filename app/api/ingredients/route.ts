import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    const ingredients = await db.all("SELECT Ingredient_ID, Name FROM Ingredient");
    return NextResponse.json(ingredients);
}