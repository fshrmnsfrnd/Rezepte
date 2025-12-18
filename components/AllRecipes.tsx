'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import ArrowTrigger from "@/components/ui/ArrowTrigger"

type RecipeRow = {
    Recipe_ID?: number;
    Name?: string;
    Description?: string;
};

type Props = {
    filterIds?: number[] | null;
    searchTerm?: string | null;
};

type Ingredient = { amount?: number | string | null; unit?: string | null; ingredient_name?: string };

function RecipeIngredients({ recipeID }: { recipeID: number }) {
    const [ings, setIngs] = useState<Ingredient[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchIngredients() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/recipeById', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: recipeID }),
                });
                if (!res.ok) throw new Error(`API ${res.status}`);
                const data: any = await res.json();
                if (cancelled) return;
                setIngs(Array.isArray(data.ingredients) ? data.ingredients : []);
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchIngredients();
        return () => { cancelled = true; };
    }, [recipeID]);

    if (loading) return <div>Loading ingredients…</div>;
    if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
    if (!ings || ings.length === 0) return <div>No ingredients listed.</div>;

    return (
        <ul className="ul">
            {ings.map((ing, i) => (
                <li key={i} className="li">{ing.amount ?? ''} {ing.unit ?? ''} {ing.ingredient_name ?? ''}</li>
            ))}
        </ul>
    );
}



export default function AllRecipes({ filterIds, searchTerm }: Props) {
    const [recipes, setRecipes] = useState<RecipeRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openIds, setOpenIds] = useState<Set<number>>(new Set());

    function toggleOpen(id: number) {
        setOpenIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

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
    if (Array.isArray(recipes)) {
        //if null show all, else show filtered
        if (filterIds == null) {
            visible = recipes;
        } else {
            visible = recipes.filter(r => filterIds.includes(r.Recipe_ID as number))
        }
    }

    const term = (searchTerm ?? '').trim().toLowerCase();
    const visibleFiltered = Array.isArray(visible) ? (term ? visible.filter(c => {
        const name = (c.Name ?? '').toString().toLowerCase();
        const desc = (c.Description ?? '').toString().toLowerCase();
        return name.includes(term) || desc.includes(term);
    }) : visible) : null;

    return (
        <div className="recipeArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(visibleFiltered) && visibleFiltered.length === 0 && <div>No records found.</div>}

            {Array.isArray(visibleFiltered) && (
                <div id="recipeList">
                    {visibleFiltered.map((element, idx) => {
                        const recipeID = element.Recipe_ID ?? (idx + 1);
                        return (
                            <div
                                className="recipePreview"
                                onClick={(e: any) => {
                                    const el = (e.target as HTMLElement);
                                    if (el.closest('.accordion-trigger') || el.closest('.accordion-content') || el.closest('.arrow-trigger-standalone')) {
                                        // click intended for accordion/arrow, don't navigate
                                        return;
                                    }
                                    window.location = `/recipe?recipeID=${recipeID}` as string & Location;
                                }}
                                role="button"
                                key={recipeID}
                            >
                                <div className="recipeRow">
                                    <div className="recipeMeta">
                                        <h3 className="h3">{element.Name}</h3>
                                        <p className="p">{element.Description}</p>
                                    </div>
                                    <div className="recipeArrow">
                                        <ArrowTrigger
                                            standalone={true}
                                            className={openIds.has(recipeID) ? 'arrow-trigger-standalone open' : 'arrow-trigger-standalone'}
                                            onClick={(e: any) => { e.stopPropagation(); toggleOpen(recipeID); }}
                                        />
                                    </div>
                                </div>
                                {openIds.has(recipeID) && (
                                    <div className="recipeIngredientsCenter">
                                        <RecipeIngredients recipeID={recipeID} />
                                    </div>
                                )}
                            </div>
                        );
                    })}

                </div>
            )}
        </div>
    );
}
