export type Ingredient = {
    Ingredient_ID?: number;
    Name: string;
    Amount?: number | string | null;
    Unit?: string | null;
    Optional?: boolean;
};

export type Step = {
    Step_ID?: number;
    Number: number;
    Description: string;
    Duration?: number | null;
};

export type Recipe = {
    Recipe_ID?: number;
    Name: string;
    Description?: string | null;
    Ingredients: Ingredient[];
    Steps?: Step[];
    Categories?: string[];
};