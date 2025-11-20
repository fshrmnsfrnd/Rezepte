import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AllCocktailsStyle.css";

type CocktailRow = {
    Cocktail_ID?: number;
    cocktail_id?: number;
    id?: number;
    Name?: string;
    Description?: string;
    [key: string]: any;
};

type Ingredient = { id: number; name: string };
type Step = { id: number; number?: number; description?: string };

type Selected = {
    name: string;
    description: string;
    ingredients: Ingredient[];
    steps: Step[];
};

export default function AllCocktails() {
    const [cocktails, setCocktails] = useState<CocktailRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    // navigation target: open recipe.html with cocktailID as query param

    useEffect(() => { loadCocktails(); }, []);

    async function loadCocktails(): Promise<void> {
        setError(null);
        try {
            const res = await fetch("http://localhost:3000/api/cocktails");
            const ct = res.headers.get("content-type") || "";
            let data: any;
            if (ct.includes("application/json")) data = await res.json();
            else data = await res.text();

            if (Array.isArray(data)) {
                setCocktails(data as CocktailRow[]);
            } else {
                setCocktails(null);
                setError(typeof data === 'string' ? data : 'Unexpected response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setCocktails(null);
        }
    }

    return (
        <div>
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(cocktails) && cocktails.length === 0 && <div>No records found.</div>}

            {Array.isArray(cocktails) && cocktails.length > 0 && (
                <div id="cocktailList">
                    {cocktails.map((element, idx) => {
                        const cocktailID = element.Cocktail_ID ?? element.cocktail_id ?? element.id ?? (idx + 1);
                        return (
                            <div
                                className="cocktailPreview"
                                onClick={() => { window.location = `/recipe?cocktailID=${cocktailID}` as string & Location; }}
                                role="button"
                                key={cocktailID}
                            >
                                <h3>{element.Name}</h3>
                                <p>{element.Description}</p>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* details are shown on recipe.html; navigation opens recipe.html with cocktailID param */}
        </div>
    );
}
