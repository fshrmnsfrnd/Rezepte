import { importRecipePayload } from './dbUtils';

export async function importRecipe(payload: any) {
    // delegate all DB work to dbUtils to centralize SQL and transactions
    return importRecipePayload(payload);
}
