import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database

    //Get Param
    const body = await req.json();
    const id: number = parseInt(body.id, 10);
    if (!id) return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });

    // load cocktail
    const cocktail = await db.get(
        `SELECT Cocktail_ID AS cocktail_id, Name AS cocktail_name, Description AS cocktail_description
         FROM Cocktail WHERE Cocktail_ID = ?`,
        [id]
    );

    if (!cocktail) return NextResponse.json({ error: "Cocktail not found" }, { status: 404 });

    // load ingredients
    const ingredientsRows = await db.all(
        `SELECT Ingredient.Name AS ingredient_name, CI.Amount AS amount, CI.Unit AS unit, CI.Optional AS optional
         FROM Cocktail_Ingredient AS CI
         JOIN Ingredient ON Ingredient.Ingredient_ID = CI.Ingredient_ID
         WHERE CI.Cocktail_ID = ?`,
        [id]
    );

    const ingredients = (ingredientsRows || []).map((r: any) => ({
        ingredient_name: r.ingredient_name,
        amount: r.amount,
        unit: r.unit,
        optional: !!r.optional
    }));

    // load steps
    const stepsRows = await db.all(
        `SELECT Number AS step_number, Description AS instruction
         FROM Step
         WHERE Cocktail_ID = ?
         ORDER BY Number ASC`,
        [id]
    );

    const steps = (stepsRows || []).map((r: any) => ({
        step_number: r.step_number,
        instruction: r.instruction
    }));

    return NextResponse.json({
        cocktail_id: cocktail.cocktail_id,
        cocktail_name: cocktail.cocktail_name,
        cocktail_description: cocktail.cocktail_description,
        ingredients,
        steps
    });
}