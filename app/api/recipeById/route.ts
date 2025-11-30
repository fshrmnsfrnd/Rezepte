import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database

    //Get Param
    const body = await req.json();
    const id: number = parseInt(body.id, 10);
    if (!id) return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });

    // load recipe
    const recipe = await db.get(
        `SELECT Recipe_ID AS recipe_id, Name AS recipe_name, Description AS recipe_description
         FROM Recipe WHERE Recipe_ID = ?`,
        [id]
    );

    if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 });

    // load ingredients
    const ingredientsRows = await db.all(
        `SELECT Ingredient.Name AS ingredient_name, RI.Amount AS amount, RI.Unit AS unit, RI.Optional AS optional
         FROM Recipe_Ingredient AS RI
         JOIN Ingredient ON Ingredient.Ingredient_ID = RI.Ingredient_ID
         WHERE RI.Recipe_ID = ?`,
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
         WHERE Recipe_ID = ?
         ORDER BY Number ASC`,
        [id]
    );

    const steps = (stepsRows || []).map((r: any) => ({
        step_number: r.step_number,
        instruction: r.instruction
    }));

    return NextResponse.json({
        recipe_id: recipe.recipe_id,
        recipe_name: recipe.recipe_name,
        recipe_description: recipe.recipe_description,
        ingredients,
        steps
    });
}