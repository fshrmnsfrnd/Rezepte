'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";

type Ingredient = {
    Ingredient_ID?: number;
    Name?: string;
};

type Props = {
    onFilterChange?: (cocktailIds: number[] | null) => void;
    searchTerm?: string | null;
    amountMissingIngredients?: number;
};

export default function IngredientList({ onFilterChange, searchTerm, amountMissingIngredients = 0}: Props) {
    
    const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

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

    async function updateFilterFromSelection(newSelected: number[]) {
        // no selection => show all
        if (!newSelected || newSelected.length === 0) {
            onFilterChange?.(null);
            return;
        }

        try {
            const res = await fetch('/api/cocktailsFilteredByIngredients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: newSelected, amountMissingIngredients: amountMissingIngredients }),
            });

            const ct = res.headers.get('content-type') || '';
            let data: any;
            if (ct.includes('application/json')) data = await res.json();
            else data = await res.text();

            if (Array.isArray(data)) {
                const ids = data.map((v: any) => Number(v)).filter((n: number) => Number.isFinite(n));
                onFilterChange?.(ids);
            } else {
                // unexpected response -> clear filter
                onFilterChange?.(null);
            }
        } catch (ex) {
            onFilterChange?.(null);
            setError(ex instanceof Error ? ex.message : String(ex));
        }
    }

    function toggleSelection(id: number) {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    // Call API whenever selectedIds or amountMissingIngredients changes — avoid updating parent state during render
    useEffect(() => {
        updateFilterFromSelection(Array.from(selectedIds.values()));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIds, amountMissingIngredients]);

    const term = (searchTerm ?? '').trim().toLowerCase();
    const filteredIngredients = Array.isArray(ingredients)
        ? ingredients.filter(i => {
            if (!term) return true;
            return (i.Name ?? '').toLowerCase().includes(term);
        })
        : [];

    return (
        <div className="ingredientArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(ingredients) && ingredients.length === 0 && <div>No records found.</div>}

            {Array.isArray(ingredients) && filteredIngredients.length === 0 && ingredients.length > 0 && (
                <div>Keine Treffer.</div>
            )}

            {filteredIngredients.length > 0 && (
                <ul className="ingredientList">
                    {filteredIngredients.map((element, idx) => {
                        const ingredientID = element.Ingredient_ID ?? (idx + 1);
                        const strId = `ingredient-${ingredientID}`;
                        return (
                            <li key={ingredientID}>
                                <input
                                    type="checkbox"
                                    value={ingredientID}
                                    id={strId}
                                    checked={selectedIds.has(ingredientID)}
                                    onChange={() => toggleSelection(ingredientID)}
                                />
                                <label htmlFor={strId}>{element.Name ?? "Unnamed Ingredient"}</label>
                            </li>
                        );
                    })}

                </ul>
            )}
        </div>
    );
}