"use client"
import React, { useEffect, useState, useMemo } from "react";
import { Shuffle } from "lucide-react";
import "./landingpage.css";

type RecipeRow = {
    Recipe_ID: number;
    Name?: string;
    Description?: string;
};

type Props = {
    filterIds?: number[] | null;
};

export default function RandomRecipe({ filterIds}: Props) {
    const [allRecipes, setAllRecipes] = useState<RecipeRow[] | null>(null);
    const [possibleRecipesState, setPossibleRecipesState] = useState<RecipeRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadRecipes(): Promise<void> {
        setError(null);
        try {
            const res = await fetch('/api/allRecipes');
            let data: any;
            data = await res.json();

            if (Array.isArray(data)) {
                setAllRecipes(data as RecipeRow[]);
            } else {
                setAllRecipes(null);
                setError(typeof data === 'string' ? data : 'Unexpected response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setAllRecipes(null);
        }
    }
    useEffect(() => { loadRecipes(); }, []);

    // compute possible recipes from fetched list + filterIds without setting state during render
    const possibleRecipes = useMemo<RecipeRow[] | null>(() => {
        if (!Array.isArray(allRecipes)) return null;
        if (filterIds == null) return allRecipes;
        return allRecipes.filter(r => filterIds.includes(r.Recipe_ID as number));
    }, [allRecipes, filterIds]);

    function getRandomRecipe(): number | null{
        if(possibleRecipes && possibleRecipes.length > 0){
            const randElement: number = Math.floor(Math.random() * possibleRecipes.length);
            return possibleRecipes[randElement].Recipe_ID;
        }
        return null;
    }
    if(error){
        return<div>Error!</div>
    }
    if(!possibleRecipes || possibleRecipes.length === 0){
        return <div></div>
    }
    return (
        <div id="randomRecipe">
            <button
                id="btnRandomRecipe"
                onClick={() => { 
                    const recipeID: number|null = getRandomRecipe();
                    if(recipeID){
                        window.location.href = `/recipe?recipeID=${recipeID}`;
                    }
                }}
                style={{margin: 12}}
            >
                <Shuffle size={28} color="#b0c7d1" strokeWidth={3} />
            </button>                    
        </div>
    );
}
