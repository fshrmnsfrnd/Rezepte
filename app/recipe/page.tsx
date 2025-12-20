'use client'
import { useParams, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import Timer from "@/components/Timer";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Recipe, Ingredient, Step } from "@/lib/RecipeDAO";

function setShoppingCookie(name: string, value: string, days: number = 30) {
    try {
        const d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        const expires = 'expires=' + d.toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
    } catch (e) {
        // ignore
    }
}

function getShoppingCookie(name: string) {
    try {
        const cookies = document.cookie ? document.cookie.split('; ') : [];
        const found = cookies.find(c => c.startsWith(name + '='));
        if (!found) return null;
        return decodeURIComponent(found.split('=').slice(1).join('='));
    } catch (e) {
        return null;
    }
}

export default function RecipeWrapper() {
    return (
        <Suspense fallback={<div>Loading Recipe details…</div>}>
            <RecipeDetail />
        </Suspense>
    )
}

function getShoppingListCoockie(): string[] {
    try {
        const raw = getShoppingCookie('shoppingList');
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.map(String);
        return [];
    } catch (e) {
        return [];
    }
}

function setListCookie(list: string[] | null | undefined) {
    try {
        const next = Array.isArray(list) ? list : [];
        setShoppingCookie('shoppingList', JSON.stringify(next), 30);
    } catch (e) {
        // ignore
    }
}

export function RecipeDetail() {
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState<number | null>(null);
    const [shoppingListUpdated, setshoppingListUpdated] = useState<boolean>(false);
    const [portions, setPortions] = useState<number>(1);
    const params = useSearchParams()

    useEffect(() => {

    }, [shoppingListUpdated])

    useEffect(() => {
        console.log("Params:", params);
        setId(params.get("recipeID") ? parseInt(params.get("recipeID")!, 10) : null);
    }, [params]);

    function addToShoppingList(element: string) {
        try {
            const name = (element ?? '').trim();
            if (!name) return;
            const list = getShoppingListCoockie();
            if (!list.includes(name)) {
                list.push(name);
                setListCookie(list);
            }
        } catch (e) {
            // ignore
        }
        setshoppingListUpdated(!shoppingListUpdated)
    }

    function removeFromShoppingList(element: string) {
        try {
            const name = (element ?? '').trim();
            if (!name) return;
            const list = getShoppingListCoockie();
            const next = list.filter(item => item !== name);
            setListCookie(next);
        } catch (e) {
            // ignore
        }
        setshoppingListUpdated(!shoppingListUpdated)
    }

    function shoppingListHas(element: string): boolean {
        try {
            const name = (element ?? '').trim();
            if (!name) return false;
            const list = getShoppingListCoockie();
            return list.includes(name);
        } catch (e) {
            return false;
        }
    }

    function decreasePortions() {
        if (portions <= 0) return
        if (portions <= 1) {
            setPortions(portions - 0.25);
        } else {
            setPortions(portions - 1);
        }
    }

    function increasePortions() {
        if (portions < 1) {
            setPortions(portions + 0.25);
        } else {
            setPortions(portions + 1);
        }
    }

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
                const res = await fetch('/api/recipeById', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: id }),
                });
                if (!res.ok) throw new Error(`API returned ${res.status}`);
                const data: any = await res.json();

                if (cancelled) return;

                if (!data || (!data.recipe_id && !data.recipe_ID && !data.id)) {
                    setSelected(null);
                    return;
                }

                const ingredients: Ingredient[] = (data.ingredients || []).map((ing: any, idx: number) => new Ingredient(
                    ing.ingredient_name ?? ing.name ?? '',
                    idx,
                    ing.amount,
                    ing.unit,
                    false
                ));

                const steps: Step[] = (data.steps || []).map((s: any, idx: number) => new Step(
                    s.step_number ?? s.number ?? 0,
                    s.instruction ?? s.description ?? '',
                    undefined,
                    s.step_ID ?? idx
                ));

                setSelected(new Recipe(
                    data.recipe_name ?? data.Name ?? data.name ?? '', 
                    ingredients, 
                    data.id ?? data.recipe_id ?? data.recipe_ID ?? undefined, 
                    data.recipe_description ?? data.Description ?? data.description ?? undefined, 
                    steps ?? undefined
                ));

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
                        <div className="ingredientsContainer" style={{display: "inline-block", justifyItems: "center"}}>
                            <div className="portionsDiv centered-row" style={{ marginBottom: 12, justifyItems: "center"}}>
                                <label className="label">Portionen:</label>
                                <div>
                                    <button
                                        id="decreaseAmount"
                                        className="button"
                                        type="button"
                                        aria-label="Verringern"
                                        onClick={decreasePortions}
                                    >
                                        -
                                    </button>
                                    <input
                                        id="amountOfMissingIngredients"
                                        className="input"
                                        type="number"
                                        style={{ width: "8ch", margin: "0 6px 0 6px"}}
                                        value={portions ?? 1}
                                        onChange={(e) => {
                                            const n = parseInt(e.target.value, 10);
                                            setPortions(Number.isFinite(n) ? n : 0);
                                        }}
                                        aria-label="Anzahl fehlender Zutaten"
                                    />
                                    <button
                                        id="increaseAmount"
                                        className="button"
                                        type="button"
                                        aria-label="Erhöhen"
                                        onClick={increasePortions}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <table className="table">
                                <thead className="thead">
                                    <tr className="tr">
                                        <th className="th">Menge</th>
                                        <th className="th">Zutat</th>
                                    </tr>
                                </thead>

                                <tbody className="tbody">
                                    {selected.ingredients.map((i, idx) => {
                                        return (
                                            <tr key={idx} className="tr">
                                                <td className="td">{(i.amount ?? 0) * portions} {i.unit}</td>
                                                <td className="td" style={{ display: 'flex', alignItems: 'center' }}>
                                                    <span className="ingredientName">{i.name}</span>
                                                    {shoppingListHas(i.amount + " " + i.unit + " " + i.name) ? (
                                                        <button onClick={() => removeFromShoppingList(i.amount + " " + i.unit + " " + i.name)} aria-label={`Remove ${i.name} from shopping list`} style={{ marginLeft: "auto" }}>
                                                            <Trash2 />
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => addToShoppingList(i.amount + " " + i.unit + " " + i.name)} aria-label={`Add ${i.name} to shopping list`} style={{ marginLeft: "auto" }}>
                                                            <ShoppingCart />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {selected.steps && selected.steps.length != 0 && (
                            <div className="prep-timer-row">
                                <div className="prep-content">
                                    <h3 className="h3">Zubereitung</h3>
                                    <ul className="ul">
                                        {selected.steps.map((s, idx) => (
                                            <li key={idx} className="li">{s.number}. {s.description}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="timer-box">
                                    <Timer expiryTimestamp={time} beepCount={8} />
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}