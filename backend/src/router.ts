import express from "express";
import { db } from "./db.ts";

export const router = express.Router();

router.get("/cocktails", async (req, res) => {
    const cocktails = await db.all("SELECT Name, Description FROM Cocktail");
    res.json(cocktails);
});

router.get("/cocktail", async (req, res) => {
    const rawId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const id = rawId ? Number(rawId) : null;
    if (!id) {
        return res.status(400).json({ error: "Missing id query parameter" });
    }

    // load cocktail base
    const cocktail = await db.get(
        `SELECT Cocktail_ID AS cocktail_id, Name AS cocktail_name, Description AS cocktail_description
         FROM Cocktail WHERE Cocktail_ID = ?`,
        [id]
    );

    if (!cocktail) return res.status(404).json({ error: "Cocktail not found" });

    // load ingredients for this cocktail
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

    // load steps for this cocktail
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

    res.json({
        cocktail_id: cocktail.cocktail_id,
        cocktail_name: cocktail.cocktail_name,
        cocktail_description: cocktail.cocktail_description,
        ingredients,
        steps
    });
});