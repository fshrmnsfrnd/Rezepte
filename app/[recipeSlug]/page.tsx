import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import { getAllRecipes, getRecipeById } from "@/lib/dbUtils";
import { recipeNameToSlug } from "@/lib/recipe-slug";
import RecipeDetailClient, { RecipePayload } from "./RecipeDetailClient";

export const dynamic = "force-static";
export const dynamicParams = false;

type PageProps = {
    params: Promise<{
        recipeSlug: string;
    }>;
};

type IngredientPayload = {
    name: string;
    amount?: number | null;
    unit?: string | null;
    optional?: boolean | null;
};

type StepPayload = {
    number: number;
    description: string;
    duration?: number | null;
};

function toRecipePayload(recipe: any): RecipePayload {
    const ingredients: IngredientPayload[] = Array.isArray(recipe.ingredients)
        ? recipe.ingredients.map((ing: any) => ({
              name: (ing.name ?? "").toString(),
              amount: ing.amount ?? null,
              unit: ing.unit ?? null,
              optional: ing.optional ?? null,
          }))
        : [];

    const steps: StepPayload[] = Array.isArray(recipe.steps)
        ? recipe.steps.map((step: any) => ({
              number: Number(step.number ?? 0),
              description: (step.description ?? "").toString(),
              duration: step.duration ?? null,
          }))
        : [];

    return {
        id: Number(recipe.recipe_ID ?? recipe.id ?? 0),
        name: (recipe.name ?? "").toString(),
        description: recipe.description ?? null,
        ingredients,
        steps,
    };
}

const CACHE_FILE = path.join(
    process.env.INIT_CWD || process.cwd(),
    ".next",
    "cache",
    "recipe-static.json"
);

async function loadRecipeIndex(): Promise<Record<string, RecipePayload>> {
    if (fs.existsSync(CACHE_FILE)) {
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        return JSON.parse(raw) as Record<string, RecipePayload>;
    }

    const recipes = await getAllRecipes();
    const entries = await Promise.all(
        recipes.map(async (recipe) => {
            const recipeId = recipe.recipe_ID;
            const slug = recipeNameToSlug(recipe.name ?? "");
            if (!recipeId || !slug) return null;
            const full = await getRecipeById(recipeId);
            if (!full) return null;
            return [slug, toRecipePayload(full)] as const;
        })
    );

    const index = Object.fromEntries(
        entries.filter((entry): entry is readonly [string, RecipePayload] => !!entry)
    );
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(index));
    return index;
}

export async function generateStaticParams() {
    const recipeIndex = await loadRecipeIndex();
    return Object.keys(recipeIndex).map((recipeSlug) => ({ recipeSlug }));
}

export default async function RecipePage({ params }: PageProps) {
    const { recipeSlug } = await params;
    const recipeIndex = await loadRecipeIndex();
    const recipe = recipeIndex[recipeSlug];
    if (!recipe) {
        notFound();
    }

    return <RecipeDetailClient recipe={recipe} />;
}
