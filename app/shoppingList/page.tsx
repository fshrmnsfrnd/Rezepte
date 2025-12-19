'use client'
import { useState, useEffect } from "react";
import { Trash2 } from 'lucide-react'

type Item = { id: number; name: string; checked?: boolean };

function setCookie(name: string, value: string, days: number) {
    try {
        const d = new Date();
        d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
        const expires = 'expires=' + d.toUTCString();
        document.cookie = `${name}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
    } catch (e) {
        // ignore
    }
}

function getCookie(name: string) {
    try {
        const cookies = document.cookie ? document.cookie.split('; ') : [];
        const found = cookies.find(c => c.startsWith(name + '='));
        if (!found) return null;
        return decodeURIComponent(found.split('=').slice(1).join('='));
    } catch (e) {
        return null;
    }
}

export default function ShoppingListPage() {
    const [items, setItems] = useState<Item[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const raw = getCookie('shoppingList');
                if (!raw) {
                    if (!cancelled) setItems([]);
                    return;
                }
                let parsed: any[] = [];
                try { parsed = JSON.parse(raw); } catch (e) { parsed = []; }
                if (!Array.isArray(parsed) || parsed.length === 0) {
                    if (!cancelled) setItems([]);
                    return;
                }

                // If cookie contains strings (names), use them directly
                const allStrings = parsed.every(p => typeof p === 'string');
                const allNumbers = parsed.every(p => typeof p === 'number' || (!isNaN(Number(p)) && p !== null));

                if (allStrings) {
                    const mapped: Item[] = parsed.map((name: string, i: number) => ({ id: i + 1, name, checked: false }));
                    if (!cancelled) setItems(mapped);
                    return;
                }

                // Mixed or numeric entries: separate numeric ids and textual entries
                const textuals: string[] = parsed.filter(p => typeof p === 'string').map(String);
                const idCandidates = parsed.filter(p => typeof p === 'number' || (typeof p === 'string' && !isNaN(Number(p))));
                const ids: number[] = idCandidates.map((v:any) => Number(v)).filter(n => Number.isFinite(n));

                // fetch all ingredients to resolve ids
                const res = await fetch('/api/ingredients');
                const ct = res.headers.get('content-type') || '';
                let data: any = null;
                if (ct.includes('application/json')) data = await res.json();
                else data = await res.text();
                if (!Array.isArray(data)) {
                    throw new Error('Unexpected /api/ingredients response');
                }
                const byId = new Map<number,string>();
                data.forEach((ing: any) => {
                    const id = Number(ing.Ingredient_ID ?? ing.id ?? ing.IngredientId ?? null);
                    const name = String(ing.Name ?? ing.name ?? ing.ingredient_name ?? '');
                    if (Number.isFinite(id)) byId.set(id, name);
                });

                const mappedIds: Item[] = ids.map(id => ({ id, name: byId.get(id) ?? `#${id}`, checked: false }));
                // append textual entries after resolved ids
                const mappedTextuals: Item[] = textuals.map((name, i) => ({ id: -(i+1), name, checked: false }));
                if (!cancelled) setItems([...mappedIds, ...mappedTextuals]);
            } catch (e:any) {
                if (!cancelled) setError(e instanceof Error ? e.message : String(e));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, []);

    function updateCookieFromItems(next: Item[]) {
        try {
            // store as array of names (texts) to match cookie format used elsewhere
            const names = next.map(i => i.name);
            setCookie('shoppingList', JSON.stringify(names), 30);
        } catch (e) { /* ignore */ }
    }

    function toggleChecked(id: number) {
        setItems(prev => {
            if (!prev) return prev;
            const next = prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
            return next;
        });
    }

    function removeItem(id: number) {
        setItems(prev => {
            if (!prev) return prev;
            const next = prev.filter(i => i.id !== id);
            updateCookieFromItems(next);
            return next;
        });
    }

    function removeChecked() {
        setItems(prev => {
            if (!prev) return prev;
            const next = prev.filter(i => !i.checked);
            updateCookieFromItems(next);
            return next;
        });
    }

    const [newEntry, setNewEntry] = useState<string>("");

    function addEntry() {
        const text = (newEntry ?? "").trim();
        if (!text) return;
        setItems(prev => {
            const next = (prev ?? []).concat({ id: Date.now(), name: text, checked: false });
            updateCookieFromItems(next);
            return next;
        });
        setNewEntry("");
    }

    if (loading) return (<div><header className="header"><a href="/"><h1 className="h1">Rezepte</h1></a></header><div>Loading…</div></div>);
    if (error) return (<div><header className="header"><a href="/"><h1 className="h1">Rezepte</h1></a></header><div style={{color:'red'}}>Error: {error}</div></div>);

    return (
        <div>
            <header className="header">
                <a href="/"><h1 className="h1">Rezepte</h1></a>
            </header>

            <main style={{ padding: 12 }}>
                <h2 className="h2">Einkaufsliste</h2>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                    <input
                        className="input"
                        placeholder="Manuelle Zutat hinzufügen"
                        value={newEntry}
                        onChange={(e) => setNewEntry(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addEntry(); }}
                        aria-label="Neue Zutat"
                        style={{ flex: 1 }}
                    />
                    <button className="button" onClick={addEntry}>Hinzufügen</button>
                </div>

                {!items || items.length === 0 ? (
                    <div>Keine Einträge in der Einkaufsliste.</div>
                ) : (
                    <div>
                        <ul className="ul" style={{paddingLeft: "0"}}>
                                <hr style={{ border: 'none', borderTop: '1px solid #b0c7d1', width: '100%', alignSelf: 'stretch', marginBottom: "7px" }} />
                            {items.map(it => (
                                <li key={it.id} className="li" >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="checkbox" className="checkbox" checked={!!it.checked} onChange={() => toggleChecked(it.id)} />
                                    <span style={{ textDecoration: it.checked ? 'line-through' : 'none', flex: 1 }}>{it.name}</span>
                                    <button className="" onClick={() => removeItem(it.id)}><Trash2 size={25} color="#b0c7d1" /></button>
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