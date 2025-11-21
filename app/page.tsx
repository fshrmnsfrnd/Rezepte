'use client'
import AllCocktails from "@/components/AllCocktails";
import IngredientList from "@/components/IngredientList";
import React, { useState } from "react";

export default function Home() {
  const [filteredCocktailIds, setFilteredCocktailIds] = useState<number[] | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<'cocktails' | 'ingredients'>('cocktails');

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
          <IngredientList onFilterChange={setFilteredCocktailIds} />
        </div>

        <div className="displayArea" data-visible={selectedPanel === 'cocktails' ? 'true' : 'false'}>
          <AllCocktails filterIds={filteredCocktailIds} />
        </div>
      </div>
    </div>
  );
}
