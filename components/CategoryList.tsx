'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";
import { Category } from "@/lib/RecipeDAO";

type Props = {
    // callback will be invoked with (ids, source). Source is always "categories" when called from here.
    onFilterChange?: (recipeIds: number[] | null, source: 'ingredients' | 'categories') => void;
    searchTerm?: string | null;
    clearSignal?: number;
};

export default function CategoryList({ onFilterChange, searchTerm, clearSignal }: Props) {
    
    const [categories, setCategories] = useState<Category[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const COOKIE_NAME = 'selectedCategories';

    function setCookie(name: string, value: string, days: number) {
        try {
            const d = new Date();
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            const expires = 'expires=' + d.toUTCString();
            document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
        } catch (e) {
            // ignore cookie errors
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
            const res = await fetch("/api/categories");
            const ct = res.headers.get("content-type") || "";
            let data: any;
            if (ct.includes("application/json")) data = await res.json();
            else data = await res.text();

            if (Array.isArray(data)) {
                setCategories(data as any[]);
            } else {
                setCategories(null);
                setError(typeof data === 'string' ? data : 'Unexpected response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setCategories(null);
        }
    }

    useEffect(() => { loadRecipes(); }, []);

    async function updateFilterFromSelection(newSelected: number[]) {
        // no selection => show all
        if (!newSelected || newSelected.length === 0) {
            onFilterChange?.(null, 'categories');
            return;
        }

        try {
            const res = await fetch('/api/recipesFilteredByCategories',  { 
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
                onFilterChange?.(ids, 'categories');
            } else {
                // unexpected response -> clear filter
                onFilterChange?.(null, 'categories');
            }
        } catch (ex) {
            onFilterChange?.(null, 'categories');
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
    }, [selectedIds]);

    // Restore selection from cookie after ingredients are loaded
    useEffect(() => {
        if (!Array.isArray(categories) || categories.length === 0) return;
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
            const availableIds = new Set(categories.map(i => i.category_ID).filter(Boolean) as number[]);
            const restored = idNums.filter(id => availableIds.has(id));
            if (restored.length > 0) setSelectedIds(new Set(restored));
        } catch (e) {
            // ignore parse errors
        }
    }, [categories]);

    // Clear selection when parent requests it via clearSignal
    useEffect(() => {
        if (typeof clearSignal === 'undefined') return;
        setSelectedIds(new Set());
        try {
            setCookie(COOKIE_NAME, JSON.stringify([]), 7);
        } catch (e) {
            // ignore
        }
        updateFilterFromSelection([]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearSignal]);

    const term = (searchTerm ?? '').trim().toLowerCase();
    const filteredIngredients = Array.isArray(categories) ? categories.filter(i => {
            if (!term) return true;
            return (i.name ?? '').toLowerCase().includes(term);
        })
        : [];

    return (
        <div className="categoriesArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(categories) && categories.length === 0 && <div>No records found</div>}

            {Array.isArray(categories) && filteredIngredients.length === 0 && categories.length > 0 && (
                <div>Keine Treffer</div>
            )}

            {filteredIngredients.length > 0 && (
                <ul className="ul ingredientList">
                    {filteredIngredients.map((element: Category, idx: number) => {
                        const categoryID = element.category_ID ?? (idx + 1);
                        const strId = `ingredient-${categoryID}`;
                        return (
                            <li className="li" key={categoryID}>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    value={categoryID}
                                    id={strId}
                                    checked={selectedIds.has(categoryID)}
                                    onChange={() => toggleSelection(categoryID)}
                                />
                                <label className="label" htmlFor={strId}>{element.name ?? "Unnamed Category"}</label>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}