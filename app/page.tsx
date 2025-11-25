'use client'
import AllCocktails from "@/components/AllCocktails";
import IngredientList from "@/components/IngredientList";
import CategoryList from "@/components/CategoryList";
import { Children, useState } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

export default function Home() {
    const [filteredCocktailIds, setFilteredCocktailIds] = useState<number[] | null>(null);
    const [selectedPanel, setSelectedPanel] = useState<'cocktails' | 'ingredients'>('cocktails');
    const [ingredientSearch, setIngredientSearch] = useState<string>("");
    const [categorySearch, setCategorySearch] = useState<string>("");
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
            {/*Head of Page*/}
            <header className="header">
                <a href="/"><h1 className="h1">Cocktails</h1></a>
                <div className="showRow">
                    <div
                        role="button"
                        className={`showArea ${selectedPanel === 'ingredients' ? 'active' : ''}`}
                        onClick={() => setSelectedPanel('ingredients')}
                    >
                        <h3 className="h3">Filter</h3>
                    </div>
                    <div
                        role="button"
                        className={`showArea ${selectedPanel === 'cocktails' ? 'active' : ''}`}
                        onClick={() => setSelectedPanel('cocktails')}
                    >
                        <h3 className="h3">Cocktails</h3>
                    </div>
                </div>
            </header>

            <div className="mainRow">
                {/*Left Side with the Filters*/}
                <div className="displayArea leftArea" data-visible={selectedPanel === 'ingredients' ? 'true' : 'false'}>
                    <Accordion type="multiple">
                        <AccordionItem value="ingredientArea">
                            <AccordionTrigger className="text-2xl">Zutaten</AccordionTrigger>
                            <AccordionContent>
                                <div className="ingredientArea">
                                    {/*Search ingredient:*/}
                                    <input
                                        id="ingredient-search"
                                        className="input searchTextField"
                                        type="text"
                                        placeholder="Suchbegriff..."
                                        value={ingredientSearch}
                                        onChange={(e) => setIngredientSearch(e.target.value)}
                                        aria-label="Suche Zutaten"
                                    />                                    

                                    {/*Enter Amount of allowed missing Ingredients */}
                                    <div className="centered-column" style={{ marginBottom: 12}}>
                                        <label className="label">Anzahl der Zutaten, die fehlen dürfen:</label>
                                        <div className="centered-row" style={{ gap: 8 }}>
                                            <button
                                                id="decreaseAmount"
                                                className="button"
                                                type="button"
                                                aria-label="Verringern"
                                                onClick={decreaseAmount}
                                            >
                                                -
                                            </button>
                                            <input
                                                id="amountOfMissingIngredients"
                                                className="numberInput"
                                                type="number"
                                                placeholder="Anzahl..."
                                                value={missingAmount ?? 0}
                                                onChange={(e) => {
                                                    const n = parseInt(e.target.value, 10);
                                                    setMissingAmount(Number.isFinite(n) ? n : 0);
                                                }}
                                                aria-label="Anzahl fehlender Zutaten"
                                            />
                                            <button
                                                id="increaseAmount"
                                                className="button"
                                                type="button"
                                                aria-label="Erhöhen"
                                                onClick={increaseAmount}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/*The List of Ingredients */}
                                    <IngredientList onFilterChange={setFilteredCocktailIds} searchTerm={ingredientSearch} amountMissingIngredients={missingAmount} />
                                    <button className="button upButton"><a href="#">Nach oben</a></button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="categoryArea">
                            <AccordionTrigger className="text-2xl">Kategorien</AccordionTrigger>
                            <AccordionContent>
                                <div className="ingredientArea">
                                    {/*Search ingredient:*/}

                                    <input
                                        id="ingredient-search"
                                        className="input searchTextField"
                                        type="text"
                                        placeholder="Suchbegriff..."
                                        value={ingredientSearch}
                                        onChange={(e) => setIngredientSearch(e.target.value)}
                                        aria-label="Suche Zutaten"
                                    />

                                    {/*Enter Amount of allowed missing Ingredients */}
                                    <div className="centered-column" style={{ marginBottom: 12 }}>
                                        <label className="label">Anzahl der Zutaten, die fehlen dürfen:</label>
                                        <div className="centered-row" style={{ gap: 8 }}>
                                            <button
                                                id="decreaseAmount"
                                                className="button"
                                                type="button"
                                                aria-label="Verringern"
                                                onClick={decreaseAmount}
                                            >
                                                -
                                            </button>
                                            <input
                                                id="amountOfMissingIngredients"
                                                className="numberInput"
                                                type="number"
                                                placeholder="Anzahl..."
                                                value={missingAmount ?? 0}
                                                onChange={(e) => {
                                                    const n = parseInt(e.target.value, 10);
                                                    setMissingAmount(Number.isFinite(n) ? n : 0);
                                                }}
                                                aria-label="Anzahl fehlender Zutaten"
                                            />
                                            <button
                                                id="increaseAmount"
                                                className="button"
                                                type="button"
                                                aria-label="Erhöhen"
                                                onClick={increaseAmount}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>

                                    {/*The List of Ingredients */}
                                    <IngredientList onFilterChange={setFilteredCocktailIds} searchTerm={ingredientSearch} amountMissingIngredients={missingAmount} />
                                    <button className="button upButton"><a href="#">Nach oben</a></button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>

                {/*Right Side with the List of Cocktails */}
                <div className="displayArea rightArea" data-visible={selectedPanel === 'cocktails' ? 'true' : 'false'}>
                    <div style={{ marginBottom: 12, justifySelf: 'center' }}>
                        <input
                            id="cocktail-search"
                            className="input searchTextField"
                            type="text"
                            placeholder="Suchbegriff..."
                            value={cocktailSearch}
                            onChange={(e) => setCocktailSearch(e.target.value)}
                            aria-label="Suche Cocktails"
                        />
                    </div>
                    <AllCocktails filterIds={filteredCocktailIds} searchTerm={cocktailSearch} />
                    <button className="button upButton"><a href="#">Nach oben</a></button>
                </div>
            </div>
        </div>
    );
}
