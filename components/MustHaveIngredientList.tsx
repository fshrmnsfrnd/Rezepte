'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";
import { Recipe, Ingredient, Step, Category } from "@/lib/RecipeDAO";
import { saveUserData, getUserData } from "@/lib/utils";

type Props = {
    onFilterChange?: (recipeIds: number[] | null, source: 'ingredients' | 'categories' | 'mustHaveIngredients') => void;
    searchTerm?: string | null;
    clearSignal?: boolean;
    setClearSignal?: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function CategoryList({ onFilterChange, searchTerm, clearSignal, setClearSignal }: Props) {

    const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [authed, setAuthed] = useState<boolean>(false);

    const DATA_KEY = 'selectedMustHaveIngredients';

    // Check user session for DB-backed persistence
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/auth/session');
                const j = await res.json();
                setAuthed(!!j.authenticated);
            } catch { }
        })();
    }, []);

    async function loadRecipes(): Promise<void> {
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

    useEffect(() => { loadRecipes(); }, []);

    async function updateFilterFromSelection(newSelected: number[]) {
        // no selection => show all
        if (!newSelected || newSelected.length === 0) {
            onFilterChange?.(null, 'mustHaveIngredients');
            return;
        }

        try {
            const res = await fetch('/api/recipesFilteredByMustHaveIngredients',  { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: newSelected}),
            });

            const ct = res.headers.get('content-type') || '';
            let data: any;
            if (ct.includes('application/json')) data = await res.json();
            else data = await res.text();

            if (Array.isArray(data)) {
                const ids = data.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n));
                onFilterChange?.(ids, 'mustHaveIngredients');
            } else {
                // unexpected response -> clear filter
                onFilterChange?.(null, 'mustHaveIngredients');
            }
        } catch (ex) {
            onFilterChange?.(null, 'mustHaveIngredients');
            setError(ex instanceof Error ? ex.message : String(ex));
        }
    }

    function toggleSelection(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            try { saveUserData(DATA_KEY, JSON.stringify(Array.from(next.values()))); } catch (e) { }
            return next;
        });
    }

    // Call API whenever selectedIds changes — avoid updating parent state during render
    useEffect(() => {
        updateFilterFromSelection(Array.from(selectedIds.values()));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIds]);

    // Restore selection from cookie or DB after ingredients are loaded
    useEffect(() => {
        if (!Array.isArray(ingredients) || ingredients.length === 0) return;
        (async () => {
                    try {
                        let idNums: number[] | null = null;
                        const raw = await getUserData(DATA_KEY);
                        if (!Array.isArray(raw)) return;
                        idNums = raw.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n));
                        if (idNums.length === 0) return;
                        const availableIds = new Set(ingredients.map(i => i.ingredient_ID).filter(Boolean) as number[]);
                        const restored = idNums.filter(id => availableIds.has(id));
                        if (restored.length > 0) setSelectedIds(new Set(restored));
                    } catch {}
                })();
    }, [ingredients, authed]);

    // Clear selection when parent requests it via clearSignal
    useEffect(() => {
        if (!clearSignal) return;
        (async () => {
            // wipe selection
            setSelectedIds(new Set());
            try { await saveUserData(DATA_KEY, JSON.stringify([])); } catch (e) { }
            // inform parent that filter is cleared
            updateFilterFromSelection([]);
        })();
        // notify parent to reset the signal if setter provided
        try { setClearSignal?.(false); } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearSignal]);

    const term = (searchTerm ?? '').trim().toLowerCase();
    const filteredIngredients = Array.isArray(ingredients) ? ingredients.filter(i => {
            if (!term) return true;
            return (i.name ?? '').toLowerCase().includes(term);
        })
        : [];

    return (
        <div className="categoriesArea">
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