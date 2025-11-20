import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type IngredientIn = {
    ingredient_name: string;
    amount: number | null;
    unit: string | null;
    optional?: boolean;
};

type StepIn = {
    step_number: number;
    instruction: string;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const name = body.cocktail_name || body.name || null;
        const description = body.cocktail_description || body.description || null;
        const ingredients: IngredientIn[] = body.ingredients || [];
        const steps: StepIn[] = body.steps || [];

        if (!name) {
            return NextResponse.json({ error: "Missing cocktail name" }, { status: 400 });
        }

        // If no ingredients, we must refuse per requirement
        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            return NextResponse.json({ error: "No ingredients provided - import skipped" }, { status: 400 });
        }

        // Run everything inside a transaction
        await db.exec("BEGIN TRANSACTION;");
        try {
            // insert cocktail
            const res = await db.run(
                `INSERT INTO Cocktail (Name, Description) VALUES (?, ?)`,
                [name, description]
            );
            const cocktailId = res.lastID;

            // insert ingredients (avoid duplicates by name, case-insensitive)
            for (const ing of ingredients) {
                const ingName = (ing.ingredient_name || '').trim();
                if (!ingName) continue;
                // try find existing ingredient (case-insensitive)
                const existing = await db.get(
                    `SELECT Ingredient_ID AS id FROM Ingredient WHERE Name = ? COLLATE NOCASE`,
                    [ingName]
                );
                let ingredientId: number;
                if (existing && existing.id) {
                    ingredientId = existing.id;
                } else {
                    const r = await db.run(`INSERT INTO Ingredient (Name) VALUES (?)`, [ingName]);
                    ingredientId = r.lastID as number;
                }

                // insert mapping
                await db.run(
                    `INSERT INTO Cocktail_Ingredient (Cocktail_ID, Ingredient_ID, Amount, Unit, Optional) VALUES (?, ?, ?, ?, ?)`,
                    [cocktailId, ingredientId, ing.amount ?? null, ing.unit ?? null, ing.optional ? 1 : 0]
                );
            }

            // insert steps if provided
            if (Array.isArray(steps) && steps.length > 0) {
                for (const s of steps) {
                    const num = Number(s.step_number) || null;
                    const instr = (s.instruction || '').toString();
                    await db.run(
                        `INSERT INTO Step (Cocktail_ID, Number, Description) VALUES (?, ?, ?)`,
                        [cocktailId, num, instr]
                    );
                }
            }

            await db.exec("COMMIT;");

            return NextResponse.json({ cocktail_id: cocktailId }, { status: 201 });
        } catch (err) {
            await db.exec("ROLLBACK;");
            console.error('import error', err);
            return NextResponse.json({ error: 'Import failed' }, { status: 500 });
        }
    } catch (ex) {
        console.error('bad request', ex);
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
}
