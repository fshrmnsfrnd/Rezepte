'use client'
import AllRecipes from "@/components/AllRecipes";
import IngredientList from "@/components/IngredientList";
import CategoryList from "@/components/CategoryList";
import MustHaveIngredientList from "@/components/MustHaveIngredientList";
import RandomRecipe from "@/components/RandomRecipe"
import Header from "@/components/Header"
import { useState, useEffect } from "react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { getIntersection } from "@/tools/utils";

export default function Home() {
    const [filteredRecipeIds, setFilteredRecipeIds] = useState<number[] | null>(null);
    const [ingFilteredIds, setIngFilteredIds] = useState<number[] | null>(null); //RecipeID filtered by Ingredient
    const [catFilteredIds, setCatFilteredIds] = useState<number[] | null>(null); //RecipeID filtered by Category
    const [mustHaveIngsFilteredIds, setMustHaveIngsFilteredIds] = useState<number[] | null>(null); //RecipeID filtered by Category
    const [selectedPanel, setSelectedPanel] = useState<'recipes' | 'ingredients'>('recipes');
    const [ingredientSearch, setIngredientSearch] = useState<string>("");
    const [categorySearch, setCategorySearch] = useState<string>("");
    const [recipeSearch, setRecipeSearch] = useState<string>("");
    const [mustHaveIngredientSearch, setMustHaveIngredientSearch] = useState<string>("");
    const [missingAmount, setMissingAmount] = useState<number>();
    const [clearIngredientsSignal, setClearIngredientsSignal] = useState<boolean>(false);
    const [clearCategoriesSignal, setClearCategoriesSignal] = useState<number>(0);
    const [clearMustHaveSignal, setClearMustHaveSignal] = useState<number>(0);

    function decreaseAmount() {
        setMissingAmount((prev) => (prev && prev > 0 ? prev - 1 : 0));
    };

    function increaseAmount() {
        setMissingAmount((prev) => (prev ? prev + 1 : 1));
    };

    function handleFilterChange(ids: number[] | null, source: 'ingredients' | 'categories' | 'mustHaveIngredients') {
        let nextIng: number[] | null = ingFilteredIds;
        let nextCat: number[] | null = catFilteredIds;
        let nextMustHaveIng: number[] | null = mustHaveIngsFilteredIds;

        
        if (source === 'ingredients') {
            nextIng = ids === null ? null : Array.from(ids);
            setIngFilteredIds(ids === null ? null : (ids.length === 0 ? [] : ids));
        } else if( source === 'categories'){
            nextCat = ids === null ? null : Array.from(ids);
            setCatFilteredIds(ids === null ? null : (ids.length === 0 ? [] : ids));
        } else if (source === 'mustHaveIngredients') {
            nextMustHaveIng = ids === null ? null : Array.from(ids);
            setMustHaveIngsFilteredIds(ids === null ? null : (ids.length === 0 ? [] : ids));
        }

        //If none is set show all
        if (nextIng === null && nextCat === null && nextMustHaveIng === null) {
            setFilteredRecipeIds(null);
            return;
        }

        //else build intersection of the ones set
        const intersection:number[] = getIntersection(
            ...(nextIng ? [nextIng] : []),
            ...(nextCat ? [nextCat] : []),
            ...(nextMustHaveIng ? [nextMustHaveIng] : [])
        );
        setFilteredRecipeIds(intersection);
        return;
    }
    
    return (
        <div>
            <Header/>
            {clearIngredientsSignal ? 'true' : 'false'}
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
                    className={`showArea ${selectedPanel === 'recipes' ? 'active' : ''}`}
                    onClick={() => setSelectedPanel('recipes')}
                >
                    <h3 className="h3">Recipes</h3>
                </div>
            </div>

            <div className="mainRow">
                {/*Left Side with the Filters*/}
                <div className="displayArea leftArea" data-visible={selectedPanel === 'ingredients' ? 'true' : 'false'}>
                    <Accordion type="multiple">
                        <AccordionItem value="ingredientArea">
                            <AccordionTrigger className="text-2xl">Verfügbare Zutaten</AccordionTrigger>
                            <AccordionContent>
                                <div className="ingredientArea">
                                    {/*Search ingredient:*/}
                                    <div style={{width: "100%"}} className="sectionControls">
                                        <input
                                            id="ingredient-search"
                                            className="input searchTextField"
                                            type="text"
                                            placeholder="Suchbegriff..."
                                            value={ingredientSearch}
                                            onChange={(e) => setIngredientSearch(e.target.value)}
                                            aria-label="Suche Zutaten"
                                        />
                                        <button id="ingredientsClear" className="clearButton" onClick={() => { setClearIngredientsSignal(true); }}>Clear</button>
                                    </div>
                                    
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
                                                className="input"
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
                                    <IngredientList onFilterChange={handleFilterChange} searchTerm={ingredientSearch} amountMissingIngredients={missingAmount} clearSignal={clearIngredientsSignal} setClearSignal={setClearIngredientsSignal} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="categoryArea">
                            <AccordionTrigger className="text-2xl">Kategorien</AccordionTrigger>
                            <AccordionContent>
                                <div className="categoryArea">
                                    {/*Search Category:*/}

                                    <div className="sectionControls">
                                    <input
                                        id="category-search"
                                        className="input searchTextField"
                                        type="text"
                                        placeholder="Suchbegriff..."
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        aria-label="Suche Kategorien"
                                    />
                                    <button id="categoriesClear" className="clearButton" onClick={() => setClearCategoriesSignal(s => s + 1)}>Clear</button>
                                    </div>

                                    {/*The List of Categories */}
                                    <CategoryList onFilterChange={handleFilterChange} searchTerm={categorySearch} clearSignal={clearCategoriesSignal} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="mustHaveIngredientArea">
                            <AccordionTrigger className="text-2xl">Must Have Zutaten</AccordionTrigger>
                            <AccordionContent>
                                <div className="categoryArea">
                                    {/*Search Must have ingredient:*/}

                                    <div className="sectionControls">
                                    <input
                                        id="mustHaveIngredient-search"
                                        className="input searchTextField"
                                        type="text"
                                        placeholder="Suchbegriff..."
                                        value={mustHaveIngredientSearch}
                                        onChange={(e) => setMustHaveIngredientSearch(e.target.value)}
                                        aria-label="Suche Must Have Ingredients"
                                    />
                                    <button id="mustHaveClear" className="clearButton" onClick={() => setClearMustHaveSignal(s => s + 1)}>Clear</button>
                                    </div>

                                    {/*The List of Categories */}
                                    <MustHaveIngredientList onFilterChange={handleFilterChange} searchTerm={mustHaveIngredientSearch} clearSignal={clearMustHaveSignal} />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    <button className="button upButton"><a href="#">Nach oben</a></button>
                </div>

                {/*Right Side with the List of Recipes */}
                <div className="displayArea rightArea" data-visible={selectedPanel === 'recipes' ? 'true' : 'false'}>
                    <div id="searchAndRandom" style={{ marginBottom: 12, justifySelf: 'center', display: 'flex', alignItems: 'center' }}>
                        <input
                            id="recipe-search"
                            className="input searchTextField"
                            type="text"
                            placeholder="Suchbegriff..."
                            value={recipeSearch}
                            onChange={(e) => setRecipeSearch(e.target.value)}
                            aria-label="Suche Rezepte"
                        />
                        <div>
                            <RandomRecipe filterIds={filteredRecipeIds} />
                        </div>
                    </div>
                    <AllRecipes filterIds={filteredRecipeIds} searchTerm={recipeSearch} />
                    <button className="button upButton"><a href="#">Nach oben</a></button>
                </div>
            </div>
        </div>
    );
}
