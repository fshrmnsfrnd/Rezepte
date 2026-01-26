'use client'
import { useState, useEffect } from "react";
import { Trash2 } from 'lucide-react'
import Header from "@/components/Header"
import { saveUserData, getUserData } from "@/lib/utils";

export type Item = {
    name: string,
    checked?: boolean;
};

export default function ShoppingListPage() {
    const [items, setItems] = useState<Item[]>([]);
    const [newEntry, setNewEntry] = useState<string>('');

    const DATA_KEY = 'shoppingList';

    function addToShoppingList(item: Item) {
        if (!item.name || item.name.trim() === '') return;
        setItems(prev => {
            const next: Item[] = [...prev, item];
            try { saveUserData(DATA_KEY, JSON.stringify(next)); } catch (e) { }
            return next;
        });
        setNewEntry('');
    }

    function removeFromShoppingListByName(item: Item) {
        setItems(prev => {
            const next = prev.filter(i => i.name !== item.name);
            try { saveUserData(DATA_KEY, JSON.stringify(next)); } catch (e) { }
            return next;
        });
    }

    // Restore selection from cookie or DB after ingredients are loaded
    useEffect(() => {
        (async () => {
            try {
                const raw = await getUserData(DATA_KEY);
                //if (Array.isArray(raw)) 
                    setItems(raw as Item[]);
            } catch { }
        })();
    }, []);

    return (
        <div>
            <Header />

            <main style={{ padding: 12 }}>
                <h2 className="h2">Einkaufsliste</h2>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input
                        className="input"
                        placeholder="Manuelle Zutat hinzufügen"
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addToShoppingList({name: newEntry}); }}
                        aria-label="Neue Zutat"
                        style={{ flex: 1 }}
                    />
                    <button className="button" onClick={() => { addToShoppingList({ name: newEntry }) }}>Hinzufügen</button>
                </div>

                {items.length === 0 ? (
                    <div>Keine Einträge in der Einkaufsliste.</div>
                ) : (
                    <div>
                        <ul className="ul" style={{ paddingLeft: "0" }}>
                            <hr style={{ border: 'none', borderTop: '1px solid #b0c7d1', width: '100%', alignSelf: 'stretch', marginBottom: "7px" }} />
                            {items.map((it, idx) => (
                                <li key={`${it.name}-${idx}`} className="li" >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="checkbox" className="checkbox" checked={!!it.checked} onChange={() => {
                                            setItems(prev => {
                                                const next = prev.map((x, i) => i === idx ? { ...x, checked: !x.checked } : x);
                                                try { saveUserData(DATA_KEY, JSON.stringify(next)); } catch (e) { }
                                                return next;
                                            });
                                        }} />
                                        <span style={{ textDecoration: it.checked ? 'line-through' : 'none', flex: 1 }}>{it.name}</span>
                                        <button className="" onClick={() => removeFromShoppingListByName({ name: it.name })}><Trash2 size={25} color="#b0c7d1" /></button>
                                    </div>
                                    <hr style={{ border: 'none', borderTop: '1px solid #b0c7d1', width: '100%', alignSelf: 'stretch', marginTop: "7px" }} />
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </main>
        </div>
    );
}