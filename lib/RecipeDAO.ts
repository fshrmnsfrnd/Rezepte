export class Recipe{
    public recipe_ID?: number;
    public name: string;
    public description?: string;
    public ingredients: Ingredient[];
    public steps?: Step[];
    public categories?: Category[];

    constructor(name: string, ingredients: Ingredient[], recipe_id?: number, description?: string, steps?: Step[], categories?: Category[]) {
        this.name = name
        this.ingredients = ingredients
        recipe_id ? this.recipe_ID = recipe_id : null;
        description ? this.description = description : null;
        steps ? this.steps = steps : null;
        categories ? this.categories = categories : null;
    }

    public equals(other: Recipe): boolean {
        let checkID: boolean = true
        let checkName: boolean = this.name === other.name
        let checkDescription: boolean = this.description === other.description
        let checkIngredients: boolean = true
        let checkSteps: boolean = true
        let checkCategories: boolean = true

        //RecipeID
        if (this.recipe_ID && other.recipe_ID) {
            checkID = this.recipe_ID === other.recipe_ID
        }

        //Ingredients
        if(this.ingredients.length === other.ingredients.length){
            for (let index = 0; index < this.ingredients.length; index++) {
                if(!this.ingredients[index].equals(other.ingredients[index])){
                    checkIngredients = false;
                    break;
                }
            }
        }

        //Steps
        if (this.steps && other.steps) {
            if(this.steps.length === other.steps.length){
                for (let index = 0; index < this.steps.length; index++) {
                    if (!this.steps[index].equals(other.steps[index])) {
                        checkSteps = false;
                        break;
                    }
                }
            }else{
                checkSteps = false;
            }
        }

        //Categories
        if (this.categories && other.categories) {
            if (this.categories.length === other.categories.length) {
                for (let index = 0; index < this.categories.length; index++) {
                    if (!this.categories[index].equals(other.categories[index])) {
                        checkCategories = false;
                        break;
                    }
                }
            }else{
                checkCategories = false;
            }
        }

        if(checkID && checkCategories && checkDescription && checkIngredients && checkName && checkSteps){
            return true;
        }else{
            return false;
        }
    }
}

export class Ingredient{
    public ingredient_ID?: number;
    public name: string;
    public amount?: number;
    public unit?: string;
    public optional?: boolean;

    constructor(name: string, ingredient_ID?: number, amount?: number, unit?: string, optional?: boolean){
        this.name = name;
        this.ingredient_ID = ingredient_ID;
        amount ? this.amount = amount : null;
        unit ? this.unit = unit : null;
        optional ? this.optional = optional : null;
    }

    public equals(other: Ingredient): boolean {
        if (this.name != other.name) {
            return false;
        }
        if (this.amount != other.amount) {
            return false;
        }
        if (this.optional != other.optional) {
            return false;
        }
        if (this.unit != other.unit) {
            return false;
        }
        if(this.ingredient_ID && other.ingredient_ID){
            if(this.ingredient_ID != other.ingredient_ID){
                return false;
            }
        }

        return true;
    }
}

export class Step{
    public step_ID?: number;
    public number: number;
    public description: string;
    public duration?: number;

    constructor(number: number, description: string, duration?: number, step_ID?: number) {
        this.step_ID = step_ID;
        this.number = number;
        this.description = description;
        duration ? this.duration = duration : null;
    }

    public equals(other: Step){
        if(this.number != other.number){
            return false;
        }
        if(this.description != other.description){
            return false
        }
        if(this.duration != other.duration){
            return false;
        }
        if(this.step_ID && other.step_ID){
            if(this.step_ID != other.step_ID){
                return false;
            }
        }
        
        return true;
    }
}

export class Category{
    public category_ID?: number;
    public name: string;

    constructor(name: string, category_ID?: number) {
        this.name = name;
        category_ID ? this.category_ID = category_ID : null;
    }

    public equals(other: Category){
        if(this.name != other.name){
            return false;
        }
        if(this.category_ID && other.category_ID){
            if(this.category_ID != other.category_ID){
                return false;
            }
        }
        
        return true;
    }
}