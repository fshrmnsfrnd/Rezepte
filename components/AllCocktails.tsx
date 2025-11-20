'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";

type CocktailRow = {
    Cocktail_ID?: number;
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

type Props = {
    filterIds?: number[] | null;
};

export default function AllCocktails({ filterIds }: Props) {
    const [cocktails, setCocktails] = useState<CocktailRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { loadCocktails(); }, []);

    async function loadCocktails(): Promise<void> {
        setError(null);
        try {
            const res = await fetch("/api/cocktails");
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

    const visible = Array.isArray(cocktails)
        ? (filterIds == null ? cocktails : cocktails.filter(c => filterIds.includes(c.Cocktail_ID as number)))
        : null;

    return (
        <div className="displayArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(visible) && visible.length === 0 && <div>No records found.</div>}

            {Array.isArray(visible) && visible.length > 0 && (
                <div id="cocktailList">
                    {visible.map((element, idx) => {
                        const cocktailID = element.Cocktail_ID ?? (idx + 1);
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
        </div>
    );
}
