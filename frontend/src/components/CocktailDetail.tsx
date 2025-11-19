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

                if (!Array.isArray(data) || data.length === 0) {
                    setSelected({ name: "Not Found", description: "", ingredients: [], steps: [] });
                    return;
                }

                const first = data[0];
                const name: string = first.cocktail_name ?? first.Name ?? "";
                const description: string = first.cocktail_description ?? first.Description ?? "";

                const ingredientsMap = new Map<number | string, Ingredient>();
                const stepsMap = new Map<number | string, Step>();

                data.forEach((r: any) => {
                    if (r.ingredient_id && r.ingredient_name) ingredientsMap.set(r.ingredient_id, { id: r.ingredient_id, name: r.ingredient_name });
                    if (r.step_id) stepsMap.set(r.step_id, { id: r.step_id, number: r.step_number, description: r.step_description });
                });

                const ingredients: Ingredient[] = Array.from(ingredientsMap.values());
                const steps: Step[] = Array.from(stepsMap.values()).sort((a, b) => (a.number || 0) - (b.number || 0));

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