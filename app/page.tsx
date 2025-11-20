'use client'
import AllCocktails from "@/components/AllCocktails";
import IngredientList from "@/components/IngredientList";
import React, { useState } from "react";

export default function Home() {
  const [filteredCocktailIds, setFilteredCocktailIds] = useState<number[] | null>(null);

  return (
    <div>
      <header>
        <a href="/"><h1>Cocktails</h1></a>
      </header>
        <IngredientList onFilterChange={setFilteredCocktailIds} />
        <AllCocktails filterIds={filteredCocktailIds} />
    </div>
  );
}
