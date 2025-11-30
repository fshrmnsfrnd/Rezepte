'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";

type RecipeRow = {
    Recipe_ID?: number;
    Name?: string;
    Description?: string;
};

type Props = {
    filterIds?: number[] | null;
    searchTerm?: string | null;
};

export default function AllRecipes({ filterIds, searchTerm}: Props) {
    const [recipes, setRecipes] = useState<RecipeRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadRecipes(): Promise<void> {
        setError(null);
        try {
            const res = await fetch('/api/allRecipes');
            const ct = res.headers.get("content-type") || "";
            let data: any;
            data = await res.json();

            if (Array.isArray(data)) {
                setRecipes(data as RecipeRow[]);
            } else {
                setRecipes(null);
                setError(typeof data === 'string' ? data : 'Unexpected response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setRecipes(null);
        }
    }
    
    useEffect(() => { loadRecipes(); }, []);
    
    let visible;
    if (Array.isArray(recipes)){
        //if null show all, else show filtered
        if (filterIds == null){
            visible = recipes;
        }else{
            visible = recipes.filter(r => filterIds.includes(r.Recipe_ID as number))
        }
    }

    const term = (searchTerm ?? '').trim().toLowerCase();
    const visibleFiltered = Array.isArray(visible) ? (term ? visible.filter(c => {
        const name = (c.Name ?? '').toString().toLowerCase();
        const desc = (c.Description ?? '').toString().toLowerCase();
        return name.includes(term) || desc.includes(term);
    }): visible): null;

    return (
        <div className="recipeArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(visibleFiltered) && visibleFiltered.length === 0 && <div>No records found.</div>}

            {Array.isArray(visibleFiltered)&& (
                <div id="recipeList">
                    {visibleFiltered.map((element, idx) => {
                        const recipeID = element.Recipe_ID ?? (idx + 1);
                        return (
                            <div
                                className="recipePreview"
                                onClick={() => { window.location = `/recipe?recipeID=${recipeID}` as string & Location; }}
                                role="button"
                                key={recipeID}
                            >
                                <h3 className="h3">{element.Name}</h3>
                                <p className="p">{element.Description}</p>
                                
                            </div>
                        );
                    })}
                    
                </div>
            )}
        </div>
    );
}
