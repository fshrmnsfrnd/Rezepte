import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    const sql = `
        SELECT DISTINCT I.Ingredient_ID, I.Name
        FROM Ingredient I
        JOIN Recipe_Ingredient RI
            ON I.Ingredient_ID = RI.Ingredient_ID
        WHERE RI.Optional = 0
        ORDER BY I.Name ASC;
    `;
    
    const ingredients = await db.all(sql);
    return NextResponse.json(ingredients);
}