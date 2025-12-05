'use client'
import React, { Suspense, useEffect, useState } from "react";

type ingredientsRow = {
    Name: string;
    Anzahl: number;
};

export function MostUsedIngredients() {
    const [ingredients, setIngredients] = useState<ingredientsRow[]>();
    async function fetchData() {
        const res = await fetch("/api/ingredientsOrderedByUsage");
        let data = await res.json()
        setIngredients(data as ingredientsRow[]);
    }
    useEffect(() => { fetchData(); }, []);

    return (
        <div>
            {ingredients == null && <div>Nichts gefunden</div>}
            <table className="table">
                <thead className="thead">
                    <tr className="tr">
                        <th className="th">Anzahl</th>
                        <th className="th">Zutat</th>
                    </tr>
                </thead>
                <tbody className="tbody">
                    {ingredients != null && ingredients.map((element) => {
                        const name = element.Name;
                        const anzahl = element.Anzahl;
                        return (
                            <tr className="tr">
                                <td className="td">{anzahl}</td>
                                <td className="td">{name}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
    </div>
    );
}