'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";

type Ingredient = {
    Ingredient_ID?: number;
    Name?: string;
};

export default function IngredientList() {
    
    const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadCocktails(): Promise<void> {
        setError(null);
        try {
            const res = await fetch("/api/ingredients");
            const ct = res.headers.get("content-type") || "";
            let data: any;
            if (ct.includes("application/json")) data = await res.json();
            else data = await res.text();

            if (Array.isArray(data)) {
                setIngredients(data as Ingredient[]);
            } else {
                setIngredients(null);
                setError(typeof data === 'string' ? data : 'Unexpected response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setIngredients(null);
        }
    }

    useEffect(() => { loadCocktails(); }, []);

    return (
        <div className="displayArea ingredientArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(ingredients) && ingredients.length === 0 && <div>No records found.</div>}

            {Array.isArray(ingredients) && ingredients.length > 0 && (
                <ul className="ingredientList">
                    {ingredients.map((element, idx) => {
                        const ingredientID = element.Ingredient_ID ?? (idx + 1);
                        return (
                            <li key={ingredientID}>
                                <input type="checkbox" defaultValue={element.Ingredient_ID} id={element.Ingredient_ID?.toString()} />
                                {element.Name ?? "Unnamed Ingredient"}
                            </li>
                        );
                    })}

                </ul>
            )}

            <button name="Search" onClick={()=>{}}>Suchen</button>
        </div>
    );
}