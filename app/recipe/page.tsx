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

export default function CocktailWrapper(){
    return(
        <Suspense fallback={<div>Loading cocktail details…</div>}>
            <CocktailDetail />
        </Suspense>
    )
}

export function CocktailDetail() {
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Selected | null>(null);
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState<number | null>(null);
    const params = useSearchParams()
    useEffect(() => {
        console.log("Params:", params);
        setId(params.get("cocktailID") ? parseInt(params.get("cocktailID")!, 10) : null);
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
                const res = await fetch('/api/cocktail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id}),
                });
                if (!res.ok) throw new Error(`API returned ${res.status}`);
                const data: any = await res.json();

                if (cancelled) return;

                if (!data || !data.cocktail_id) {
                    setSelected({ name: "Not Found", description: "", ingredients: [], steps: [] });
                    return;
                }

                const name: string = data.cocktail_name ?? data.Name ?? "";
                const description: string = data.cocktail_description ?? data.Description ?? "";

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
            <header>
            <a href="/"><h1>Cocktails</h1></a>
            </header>
            <div className="details">
                {loading && <div>Loading details…</div>}
                {error && <div style={{ color: "red" }}>Error: {error}</div>}
                {selected && (
                    <>
                        <h2>{selected.name}</h2>
                        <p>{selected.description}</p>

                        <h3>Zutaten</h3>

                        <table>
                            <thead>
                                <tr>
                                    <th>Menge</th>
                                    <th>Zutat</th>
                                </tr>
                            </thead>

                            <tbody>
                                {selected.ingredients.map((i) => (
                                    <tr key={i.id}>
                                        <td>{i.amount} {i.unit}</td>
                                        <td>{i.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {selected.steps.length != 0 && (
                            <div className="prep-timer-row">
                                <div className="prep-content">
                                    <h3>Zubereitung</h3>
                                    <ul>
                                        {selected.steps.map((s) => (
                                            <li key={s.id}>{s.number}. {s.description}</li>
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