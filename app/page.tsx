import AllCocktails from "@/components/AllCocktails";
import IngredientList from "@/components/IngredientList";

export default function Home() {
  return (
    <div>
      <header>
        <a href="/"><h1>Cocktails</h1></a>
      </header>
        <IngredientList />
        <AllCocktails />
    </div>
  );
}
