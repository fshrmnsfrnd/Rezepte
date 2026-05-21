"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import type { Item } from "@/app/shoppingList/page";
import { saveUserData, getUserData } from "@/lib/utils";

export type RecipeIngredient = {
    name: string;
    amount?: number | string | null;
    unit?: string | null;
    optional?: boolean | null;
};

export type RecipeStep = {
    number: number;
    description: string;
    duration?: number | null;
};

export type RecipePayload = {
    id: number;
    name: string;
    description?: string | null;
    ingredients: RecipeIngredient[];
    steps?: RecipeStep[] | null;
};

type Props = {
    recipe: RecipePayload;
};

export default function RecipeDetailClient({ recipe }: Props) {
    const [shoppingList, setShoppingList] = useState<Item[]>([]);
    const [portions, setPortions] = useState<number>(1);

    const DATA_KEY = "shoppingList";

    const normalizeName = (name?: string) => (name ?? "").trim().toLowerCase();

    const parseAmount = (amount?: number | string | null) => {
        if (amount === undefined || amount === null || amount === "") return null;
        const parsed = typeof amount === "string" ? parseFloat(amount) : amount;
        return Number.isFinite(parsed) ? parsed : null;
    };

    const formatItemName = (ingredient: RecipeIngredient, currentPortions: number) => {
        const amountValue = parseAmount(ingredient.amount);
        const amount = amountValue === null ? "" : (amountValue * currentPortions).toString();
        return [amount, ingredient.unit, ingredient.name]
            .map((part) => (part ?? "").toString().trim())
            .filter(Boolean)
            .join(" ");
    };

    useEffect(() => {
        (async () => {
            try {
                const raw = await getUserData(DATA_KEY);
                setShoppingList(raw as Item[]);
            } catch {}
        })();
    }, []);

    function addToShoppingList(item: Item) {
        if (!item?.name || item.name.trim() === "") return;
        setShoppingList((prev) => {
            const normalized = normalizeName(item.name);
            if (prev.some((x) => normalizeName(x.name) === normalized)) return prev;
            const next: Item[] = [...prev, { ...item, name: item.name.trim() }];
            try {
                saveUserData(DATA_KEY, JSON.stringify(next));
            } catch (e) {}
            return next;
        });
    }

    function removeFromShoppingList(item: Item) {
        if (!item?.name) return;
        setShoppingList((prev) => {
            const target = normalizeName(item.name);
            const next = prev.filter((i) => normalizeName(i.name) !== target);
            try {
                saveUserData(DATA_KEY, JSON.stringify(next));
            } catch (e) {}
            return next;
        });
    }

    function shoppingListHas(item: Item): boolean {
        const target = normalizeName(item?.name);
        if (!target) return false;
        return shoppingList.some((i) => normalizeName(i?.name) === target);
    }

    function decreasePortions() {
        if (portions <= 0) return;
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

    function normalizeAmount(amount: string | number | null | undefined): string {
        const amountNumber = parseAmount(amount);
        if (amountNumber === null) return "";
        return (Math.round(amountNumber * portions * 100) / 100).toString();
    }

    const steps = recipe.steps ?? [];

    return (
        <div>
            <Header />
            <div className="details">
                <h2 className="h2">{recipe.name}</h2>
                <p className="p">{recipe.description}</p>

                <h3 className="h3">Zutaten</h3>
                <div className="ingredientsContainer" style={{ display: "inline-block", justifyItems: "center" }}>
                    <div className="portionsDiv centered-row" style={{ marginBottom: 12, justifyItems: "center" }}>
                        <label className="label" style={{ marginRight: 5 }}>
                            Portionen:
                        </label>
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
                                style={{ margin: "0 6px 0 6px" }}
                                value={portions ?? 1}
                                onChange={(e) => {
                                    const n = parseFloat(e.target.value);
                                    setPortions(Number.isFinite(n) ? n : 0);
                                }}
                                aria-label="Anzahl fehlender Zutaten"
                            />
                            <button
                                id="increaseAmount"
                                className="button"
                                type="button"
                                aria-label="Erh\u00f6hen"
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
                            {recipe.ingredients.map((i, idx) => {
                                const name = formatItemName(i, portions);
                                return (
                                    <tr key={idx} className="tr">
                                        <td className="td">
                                            {normalizeAmount(i.amount)} {i.unit}
                                        </td>
                                        <td className="td" style={{ display: "flex", alignItems: "center" }}>
                                            <span className="ingredientName">{i.name}</span>
                                            {shoppingListHas({ name }) ? (
                                                <button
                                                    onClick={() => removeFromShoppingList({ name })}
                                                    aria-label={`Remove ${i.name} from shopping list`}
                                                    style={{ marginLeft: "auto" }}
                                                >
                                                    <Trash2 />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => addToShoppingList({ name })}
                                                    aria-label={`Add ${i.name} to shopping list`}
                                                    style={{ marginLeft: "auto" }}
                                                >
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

                {steps && steps.length !== 0 && (
                    <div className="prep-timer-row">
                        <div className="prep-content">
                            <h3 className="h3">Zubereitung</h3>
                            <ul className="ul">
                                {steps.map((s, idx) => (
                                    <li key={idx} className="li">
                                        {s.number}. {s.description}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
