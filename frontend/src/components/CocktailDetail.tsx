import React, { useEffect, useState } from "react";

type Ingredient = { id: number; name: string };
type Step = { id: number; number?: number; description?: string };
type Selected = {
    name: string;
    description: string;
    ingredients: Ingredient[];
    steps: Step[];
};

export default function CocktailDetail({ id }: { id: number | null }) {
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Selected | null>(null);
    const [loading, setLoading] = useState(false);

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
                const res = await fetch(`http://localhost:3000/api/cocktail?id=${id}`);
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
                    name: `${ing.ingredient_name}${ing.amount != null ? ` — ${ing.amount}${ing.unit ? ' ' + ing.unit : ''}` : ''}`
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

    if (id == null) return null;

    return (
        <div className="details">
            {loading && <div>Loading details…</div>}
            {error && <div style={{ color: "red" }}>Error: {error}</div>}
            {selected && (
                <>
                    <h2>{selected.name}</h2>
                    <p>{selected.description}</p>

                    <h3>Ingredients</h3>
                    <ul>
                        {selected.ingredients.map((i) => (
                            <li key={i.id}>{i.name}</li>
                        ))}
                    </ul>

                    <h3>Steps</h3>
                    <ol>
                        {selected.steps.map((s) => (
                            <li key={s.id}>{s.number}. {s.description}</li>
                        ))}
                    </ol>
                </>
            )}
        </div>
    );
}