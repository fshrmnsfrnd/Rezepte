'use client'
import AllCocktails from "@/components/AllCocktails";
import IngredientList from "@/components/IngredientList";
import React, { useState } from "react";

export default function Home() {
  const [filteredCocktailIds, setFilteredCocktailIds] = useState<number[] | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<'cocktails' | 'ingredients'>('cocktails');
  const [ingredientSearch, setIngredientSearch] = useState<string>("");
  const [cocktailSearch, setCocktailSearch] = useState<string>("");
  const [missingAmount, setMissingAmount] = useState<number>();

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
            <h3>Zutaten</h3>
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
            <input
              id="amountOfMissingIngredients"
              type="number"
              placeholder="Anzahl..."
              value={missingAmount ?? 0}
              onChange={(e) => setMissingAmount(Number(e.target.value))}
              aria-label="Anzahl fehlender Zutaten"
            />
          </div>
          <IngredientList onFilterChange={setFilteredCocktailIds} searchTerm={ingredientSearch} amountMissingIngredients={missingAmount} />
          <button><a href="#">Nach oben</a></button>
        </div>

        <div className="displayArea" data-visible={selectedPanel === 'cocktails' ? 'true' : 'false'}>
          <div style={{ marginBottom: 12, justifySelf: 'center'}}>
            <input
              id="cocktail-search"
              type="text"
              placeholder="Suchbegriff..."
              value={cocktailSearch}
              onChange={(e) => setCocktailSearch(e.target.value)}
              aria-label="Suche Cocktails"
            />
          </div>
          <AllCocktails filterIds={filteredCocktailIds} searchTerm={cocktailSearch}/>
          <button><a href="#">Nach oben</a></button>
        </div>
      </div>
    </div>
  );
}
