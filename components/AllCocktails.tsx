'use client'
import React, { useEffect, useState } from "react";
import "./landingpage.css";

type CocktailRow = {
    Cocktail_ID?: number;
    Name?: string;
    Description?: string;
};

type Props = {
    filterIds?: number[] | null;
    searchTerm?: string | null;
};

export default function AllCocktails({ filterIds, searchTerm}: Props) {
    const [cocktails, setCocktails] = useState<CocktailRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function loadCocktails(): Promise<void> {
        setError(null);
        try {
            const res = await fetch('/api/cocktails');
            const ct = res.headers.get("content-type") || "";
            let data: any;
            data = await res.json();

            if (Array.isArray(data)) {
                setCocktails(data as CocktailRow[]);
            } else {
                setCocktails(null);
                setError(typeof data === 'string' ? data : 'Unexpected response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setCocktails(null);
        }
    }
    
    useEffect(() => { loadCocktails(); }, []);
    
    let visible;
    if (Array.isArray(cocktails)){
        if (filterIds == null){
                visible = cocktails;
        }else{
            visible = cocktails.filter(c => filterIds.includes(c.Cocktail_ID as number))
        }
    }

    const term = (searchTerm ?? '').trim().toLowerCase();
    const visibleFiltered = Array.isArray(visible) ? (term ? visible.filter(c => {
        const name = (c.Name ?? '').toString().toLowerCase();
        const desc = (c.Description ?? '').toString().toLowerCase();
        return name.includes(term) || desc.includes(term);
    }): visible): null;

    return (
        <div className="cocktailArea">
            {error && <div style={{ color: 'red' }}>Error: {error}</div>}

            {Array.isArray(visibleFiltered) && visibleFiltered.length === 0 && <div>No records found.</div>}

            {Array.isArray(visibleFiltered) /*&& visibleFiltered.length > 0*/ && (
                <div id="cocktailList">
                    {visibleFiltered.map((element, idx) => {
                        const cocktailID = element.Cocktail_ID ?? (idx + 1);
                        return (
                            <div
                                className="cocktailPreview"
                                onClick={() => { window.location = `/recipe?cocktailID=${cocktailID}` as string & Location; }}
                                role="button"
                                key={cocktailID}
                            >
                                <h3 className="h3">{element.Name}</h3>
                                <p className="p">{element.Description}</p>
                                
                            </div>
                        );
                    })}
                    
                </div>
            )}
        </div>
    );
}
