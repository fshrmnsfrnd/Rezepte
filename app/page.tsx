'use client'
import AllCocktails from "@/components/AllCocktails";
import IngredientList from "@/components/IngredientList";
import { useState } from "react";

export default function Home() {
    const [filteredCocktailIds, setFilteredCocktailIds] = useState<number[] | null>(null);
    const [selectedPanel, setSelectedPanel] = useState<'cocktails' | 'ingredients'>('cocktails');
    const [ingredientSearch, setIngredientSearch] = useState<string>("");
    const [cocktailSearch, setCocktailSearch] = useState<string>("");
    const [missingAmount, setMissingAmount] = useState<number>();

    function decreaseAmount() {
        setMissingAmount((prev) => (prev && prev > 0 ? prev - 1 : 0));
    };

    function increaseAmount() {
        setMissingAmount((prev) => (prev ? prev + 1 : 1));
    };

    return (
        <div>
            <header>
                <a href="/"><h1>Cocktails</h1></a>
                <div className="showRow">
                    <div
                        role="button"
                        className={`showArea ${selectedPanel === 'ingredients' ? 'active' : ''}`}
                        onClick={() => setSelectedPanel('ingredients')}
                    >
                        <h3>Filter</h3>
                    </div>
                    <div
                        role="button"
                        className={`showArea ${selectedPanel === 'cocktails' ? 'active' : ''}`}
                        onClick={() => setSelectedPanel('cocktails')}
                    >
                        <h3>Cocktails</h3>
                    </div>
                </div>
            </header>

            <div className="mainRow">
                <div className="displayArea" data-visible={selectedPanel === 'ingredients' ? 'true' : 'false'}>
                    <div style={{ marginBottom: 12, justifySelf: 'center' }}>
                        <input
                            id="ingredient-search"
                            type="text"
                            placeholder="Suchbegriff..."
                            value={ingredientSearch}
                            onChange={(e) => setIngredientSearch(e.target.value)}
                            aria-label="Suche Zutaten"
                        />
                    </div>
                    <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <label htmlFor="amountOfMissingIngredients">Anzahl der Zutaten, die fehlen dürfen:</label>
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <button
                                id="decreaseAmount"
                                type="button"
                                aria-label="Verringern"
                                onClick={decreaseAmount}
                            >
                                -
                            </button>
                            <input
                                id="amountOfMissingIngredients"
                                type="number"
                                placeholder="Anzahl..."
                                value={missingAmount ?? 0}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    setMissingAmount(Number.isFinite(n) ? n : 0);
                                }}
                                aria-label="Anzahl fehlender Zutaten"
                                style={{ width: '6ch', minWidth: '3ch', textAlign: 'center' }}
                            />
                            <button
                                id="increaseAmount"
                                type="button"
                                aria-label="Erhöhen"
                                onClick={increaseAmount}
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <IngredientList onFilterChange={setFilteredCocktailIds} searchTerm={ingredientSearch} amountMissingIngredients={missingAmount} />
                    <button style={{ display: 'block', margin: '12px auto' }}><a href="#">Nach oben</a></button>
                </div>

                <div className="displayArea" data-visible={selectedPanel === 'cocktails' ? 'true' : 'false'}>
                    <div style={{ marginBottom: 12, justifySelf: 'center' }}>
                        <input
                            id="cocktail-search"
                            type="text"
                            placeholder="Suchbegriff..."
                            value={cocktailSearch}
                            onChange={(e) => setCocktailSearch(e.target.value)}
                            aria-label="Suche Cocktails"
                        />
                    </div>
                    <AllCocktails filterIds={filteredCocktailIds} searchTerm={cocktailSearch} />
                    <button style={{ display: 'block', margin: '12px auto' }}><a href="#">Nach oben</a></button>
                </div>
            </div>
        </div>
    );
}
