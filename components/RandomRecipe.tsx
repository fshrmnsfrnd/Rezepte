"use client"
import React, { useEffect, useState, useMemo } from "react";
import { Shuffle } from "lucide-react";
import "./landingpage.css";
import { Recipe, Ingredient, Step, Category } from "@/lib/RecipeDAO";
import { recipeNameToSlug } from "@/lib/recipe-slug";

type Props = {
    filterIds?: number[] | null;
};

export default function RandomRecipe({ filterIds}: Props) {
    const [allRecipes, setAllRecipes] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadRecipes(): Promise<void> {
        setError(null);
        try {
            const res = await fetch('/api/allRecipes');
            let data: any;
            data = await res.json();

            if (Array.isArray(data)) {
                setAllRecipes(data as any[]);
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
    const possibleRecipes = useMemo<any[] | null>(() => {
        if (!Array.isArray(allRecipes)) return null;
        if (filterIds == null) return allRecipes;
        return allRecipes.filter(r => filterIds.includes((r.recipe_ID ?? r.Recipe_ID) as number));
    }, [allRecipes, filterIds]);

    function getRandomRecipe(): { id: number; name: string } | null {
        if (possibleRecipes && possibleRecipes.length > 0) {
            const randElement: number = Math.floor(Math.random() * possibleRecipes.length);
            const r = possibleRecipes[randElement];
            const id = Number(r.recipe_ID ?? r.Recipe_ID ?? r.id ?? 0);
            const name = (r.name ?? r.Name ?? "").toString();
            if (!Number.isFinite(id) || !name) return null;
            return { id, name };
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
                    const selection = getRandomRecipe();
                    if (!selection) return;
                    const slug = recipeNameToSlug(selection.name);
                    window.location.href = slug
                        ? `/${encodeURIComponent(slug)}`
                        : `/recipe?recipeID=${selection.id}`;
                }}
                style={{margin: 12}}
            >
                <Shuffle size={28} color="#b0c7d1" strokeWidth={3} />
            </button>                    
        </div>
    );
}
