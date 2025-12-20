'use client'
import React, { Suspense, useEffect, useState } from "react";

export function MostUsedIngredients() {
    const [ingredients, setIngredients] = useState<any[]>();
    async function fetchData() {
        const res = await fetch("/api/ingredientsOrderedByUsage");
        let data = await res.json()
        setIngredients(data as any[]);
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
                    {ingredients != null && ingredients.map((element, index) => {
                        const name = element.Name;
                        const anzahl = element.Anzahl;
                        return (
                            <tr className="tr" key={index}>
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