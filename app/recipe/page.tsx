'use client'
import { useParams, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useState } from "react";
import Timer from "@/components/Timer";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Recipe, Ingredient, Step } from "@/lib/RecipeDAO";
import Header from "@/components/Header"
import { Item } from "@/app/shoppingList/page";
import { saveUserData, getUserData } from "@/lib/utils";

export default function RecipeWrapper() {
    return (
        <Suspense fallback={<div>Loading Recipe details…</div>}>
            <RecipeDetail />
        </Suspense>
    )
}

export function RecipeDetail() {
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState<number | null>(null);
    const [shoppingList, setShoppingList] = useState<Item[]>([]);
    const [portions, setPortions] = useState<number>(1);
    const [authed, setAuthed] = useState<boolean>(false);
    const params = useSearchParams()

    useEffect(() => {
        setId(params.get("recipeID") ? parseInt(params.get("recipeID")!, 10) : null);
    }, [params]);

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

    const DATA_KEY = 'shoppingList';

    const normalizeName = (name: string) => name.trim().toLowerCase();

    const formatItemName = (ingredient: Ingredient, currentPortions: number) => {
        const amount = ingredient.amount ? ingredient.amount * currentPortions : '';
        return [amount, ingredient.unit, ingredient.name]
            .map(part => (part ?? '').toString().trim())
            .filter(Boolean)
            .join(' ');
    };

    useEffect(() => {
        (async () => {
            try {
                const raw = await getUserData(DATA_KEY);
                setShoppingList(raw as Item[]);
            } catch { }
        })();
    }, []);

    function addToShoppingList(item: Item) {
        if (!item.name || item.name.trim() === '') return;
        setShoppingList(prev => {
            const normalized = normalizeName(item.name);
            if (prev.some(x => normalizeName(x.name) === normalized)) return prev;
            const next: Item[] = [...prev, { ...item, name: item.name.trim() }];
            try { saveUserData(DATA_KEY, JSON.stringify(next)); } catch (e) { }
            return next;
        });
    }

    function removeFromShoppingList(item: Item) {
        setShoppingList(prev => {
            const target = normalizeName(item.name);
            const next = prev.filter(i => normalizeName(i.name) !== target);
            try { saveUserData(DATA_KEY, JSON.stringify(next)); } catch (e) { }
            return next;
        });
    }

    function shoppingListHas(item: Item): boolean {
        const target = normalizeName(item.name);
        return shoppingList.some(i => normalizeName(i.name) === target);
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
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (id == null) {
            setSelected(null);
            setError(null);
            return;
        }
        fetchDetails();
    }, [id]);

    const time = new Date();
    time.setSeconds(time.getSeconds() + 600);

    if (id == null) return null;

    return (
        <div>
            <Header/>
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
                                        style={{ margin: "0 6px 0 6px"}}
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
                                        const name = formatItemName(i, portions);
                                        return (
                                            <tr key={idx} className="tr">
                                                <td className="td">{(i.amount ?? 0) * portions} {i.unit}</td>
                                                <td className="td" style={{ display: 'flex', alignItems: 'center' }}>
                                                    <span className="ingredientName">{i.name}</span>
                                                    {shoppingListHas({ name }) ? (
                                                        <button onClick={() => removeFromShoppingList({name})} aria-label={`Remove ${i.name} from shopping list`} style={{ marginLeft: "auto" }}>
                                                            <Trash2 />
                                                        </button>
                                                    ) : (
                                                            <button onClick={() => addToShoppingList({ name })} aria-label={`Add ${i.name} to shopping list`} style={{ marginLeft: "auto" }}>
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
                                {//No Timer until i got a better usage and Layout
                                /*
                                <div className="timer-box">
                                    <Timer expiryTimestamp={time} beepCount={8} />
                                </div>
                                */}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}