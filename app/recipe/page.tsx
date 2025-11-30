'use client'
import { useParams, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import Timer from "@/components/Timer";

type Ingredient = {
    id: number;
    amount: number;
    unit: string;
    name: string;
};

type Step = { id: number; number?: number; description?: string };
type Selected = {
    name: string;
    description: string;
    ingredients: Ingredient[];
    steps: Step[];
};

export default function RecipeWrapper(){
    return(
        <Suspense fallback={<div>Loading Recipe details…</div>}>
            <RecipeDetail />
        </Suspense>
    )
}

export function RecipeDetail() {
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Selected | null>(null);
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState<number | null>(null);
    const params = useSearchParams()
    useEffect(() => {
        console.log("Params:", params);
        setId(params.get("recipeID") ? parseInt(params.get("recipeID")!, 10) : null);
    }, [params]);
    useEffect(() => {
        if (id == null) {
            setSelected(null);
            setError(null);
            return;
        }

        let cancelled = false;

        async function fetchDetails() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/allRecipes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id}),
                });
                if (!res.ok) throw new Error(`API returned ${res.status}`);
                const data: any = await res.json();

                if (cancelled) return;

                if (!data || !data.recipe_id) {
                    setSelected({ name: "Not Found", description: "", ingredients: [], steps: [] });
                    return;
                }

                const name: string = data.recipe_name ?? data.Name ?? "";
                const description: string = data.recipe_description ?? data.Description ?? "";

                const ingredients: Ingredient[] = (data.ingredients || []).map((ing: any, idx: number) => ({
                    id: idx,
                    amount: ing.amount,
                    unit: ing.unit,
                    name: ing.ingredient_name
                }));

                const steps: Step[] = (data.steps || []).map((s: any, idx: number) => ({
                    id: idx,
                    number: s.step_number,
                    description: s.instruction
                }));

                setSelected({ name, description, ingredients, steps });
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchDetails();

        return () => { cancelled = true; };
    }, [id]);

    const time = new Date();
    time.setSeconds(time.getSeconds() + 600);

    if (id == null) return null;

    return (
        <div>
            <header className="header">
            <a href="/"><h1 className="h1">Rezepte</h1></a>
            </header>
            <div className="details">
                {loading && <div>Loading details…</div>}
                {error && <div style={{ color: "red" }}>Error: {error}</div>}
                {selected && (
                    <>
                        <h2 className="h2">{selected.name}</h2>
                        <p className="p">{selected.description}</p>

                        <h3 className="h3">Zutaten</h3>

                        <table className="table">
                            <thead className="thead">
                                <tr className="tr">
                                    <th className="th">Menge</th>
                                    <th className="th">Zutat</th>
                                </tr>
                            </thead>

                            <tbody className="tbody">
                                {selected.ingredients.map((i) => (
                                    <tr key={i.id} className="tr">
                                        <td className="td">{i.amount} {i.unit}</td>
                                        <td className="td">{i.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {selected.steps.length != 0 && (
                            <div className="prep-timer-row">
                                <div className="prep-content">
                                    <h3 className="h3">Zubereitung</h3>
                                    <ul className="ul">
                                        {selected.steps.map((s) => (
                                            <li key={s.id} className="li">{s.number}. {s.description}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="timer-box">
                                    <Timer expiryTimestamp={time} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}