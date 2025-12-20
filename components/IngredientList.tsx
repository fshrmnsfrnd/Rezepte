'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";
import { Recipe, Ingredient, Step, Category } from "@/lib/RecipeDAO";

type Props = {
    onFilterChange?: (recipeIds: number[] | null, source: 'ingredients' | 'categories') => void;
    searchTerm?: string | null;
    amountMissingIngredients?: number;
    clearSignal?: number;
};

export default function IngredientList({ onFilterChange, searchTerm, amountMissingIngredients = 0, clearSignal }: Props) {
    
    const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const COOKIE_NAME = 'selectedIngredients';

    function setCookie(name: string, value: string, days: number) {
        try {
            const d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            const expires = 'expires=' + d.toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
        } catch (e) {
            // ignore cookie errors in strict environments
        }
    }

    function getCookie(name: string) {
        try {
            const cookies = document.cookie ? document.cookie.split('; ') : [];
            const found = cookies.find(c => c.startsWith(name + '='));
            if (!found) return null;
            return decodeURIComponent(found.split('=').slice(1).join('='));
        } catch (e) {
            return null;
        }
    }

    async function loadRecipes(): Promise<void> {
        setError(null);
        try {
            const res = await fetch("/api/ingredients");
            const ct = res.headers.get("content-type") || "";
            let data: any;
            if (ct.includes("application/json")) data = await res.json();
            else data = await res.text();

            if(selectedIds.size == 0 || selectedIds == null){
                setIngredients(null)
            }

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

    useEffect(() => { loadRecipes(); }, []);

    async function updateFilterFromSelection(newSelected: number[]) {
        // no selection => show all
        if (!newSelected || newSelected.length === 0) {
            onFilterChange?.(null, 'ingredients');
            return;
        }

        try {
            const res = await fetch('/api/recipesFilteredByIngredients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: newSelected, amountMissingIngredients: amountMissingIngredients }),
            });

            const ct = res.headers.get('content-type') || '';
            let data: any = null;
            if (ct.includes('application/json')){ 
                data = await res.json();
            } 

            if (Array.isArray(data)) {
                const ids = data.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n));
                onFilterChange?.(ids, 'ingredients');
            } else {
                // unexpected response -> clear filter
                onFilterChange?.(null, 'ingredients');
            }
        } catch (ex) {
            onFilterChange?.(null, 'ingredients');
            setError(ex instanceof Error ? ex.message : String(ex));
        }
    }

    function toggleSelection(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            try {
                const arr = Array.from(next.values());
                setCookie(COOKIE_NAME, JSON.stringify(arr), 7);
            } catch (e) {
                // swallow cookie write errors
            }
            return next;
        });
    }

    // Call API whenever selectedIds or amountMissingIngredients changes — avoid updating parent state during render
    useEffect(() => {
        updateFilterFromSelection(Array.from(selectedIds.values()));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIds, amountMissingIngredients]);

    // Restore selection from cookie after ingredients are loaded
    useEffect(() => {
        if (!Array.isArray(ingredients) || ingredients.length === 0) return;
        try {
            const raw = getCookie(COOKIE_NAME);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            const idNums = parsed.map((v: any) => {
                const n = Number(v);
                return Number.isFinite(n) ? Math.trunc(n) : null;
            }).filter((v: number | null) => v !== null) as number[];

            // Keep only ids that exist in the current ingredients list
            const availableIds = new Set(ingredients.map(i => i.ingredient_ID).filter(Boolean) as number[]);
            const restored = idNums.filter(id => availableIds.has(id));
            if (restored.length > 0) setSelectedIds(new Set(restored));
        } catch (e) {
            // ignore parse errors
        }
    }, [ingredients]);

    // Clear selection when parent requests it via clearSignal
    useEffect(() => {
        if (typeof clearSignal === 'undefined') return;
        // wipe selection
        setSelectedIds(new Set());
        try {
            setCookie(COOKIE_NAME, JSON.stringify([]), 7);
        } catch (e) {
            // ignore
        }
        // inform parent that filter is cleared
        updateFilterFromSelection([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearSignal]);

    const term = (searchTerm ?? '').trim().toLowerCase();
    const filteredIngredients = Array.isArray(ingredients)
        ? ingredients.filter(i => {
            if (!term) return true;
            return (i.name ?? '').toLowerCase().includes(term);
        })
        : [];

    return (
        <div className="ingredientArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(ingredients) && ingredients.length === 0 && <div>No records found</div>}

            {Array.isArray(ingredients) && filteredIngredients.length === 0 && ingredients.length > 0 && (
                <div>Keine Treffer</div>
            )}

            {filteredIngredients.length > 0 && (
                <ul className="ul ingredientList">
                    {filteredIngredients.map((element, idx) => {
                        const ingredientID = element.ingredient_ID ?? (idx + 1);
                        const strId = `ingredient-${ingredientID}`;
                        return (
                            <li className="li" key={ingredientID}>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    value={ingredientID}
                                    id={strId}
                                    checked={selectedIds.has(ingredientID)}
                                    onChange={() => toggleSelection(ingredientID)}
                                />
                                <label className="label" htmlFor={strId}>{element.name ?? "Unnamed Ingredient"}</label>
                            </li>
                        );
                    })}

                </ul>
            )}
        </div>
    );
}