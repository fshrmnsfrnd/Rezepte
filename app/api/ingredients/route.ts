import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    const sql = `
        SELECT DISTINCT i.Ingredient_ID, i.Name
        FROM Ingredient i
        JOIN Cocktail_Ingredient ci
            ON i.Ingredient_ID = ci.Ingredient_ID
        WHERE ci.Optional = 0;
        ORDER BY Name ASC
    `;
    
    const ingredients = await db.all(sql);
    return NextResponse.json(ingredients);
}