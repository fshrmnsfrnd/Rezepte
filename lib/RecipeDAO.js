"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Category = exports.Step = exports.Ingredient = exports.Recipe = void 0;
var Recipe = /** @class */ (function () {
    function Recipe(name, ingredients, recipe_id, description, steps, categories) {
        this.name = name;
        this.ingredients = ingredients;
        recipe_id ? this.recipe_ID = recipe_id : null;
        description ? this.description = description : null;
        steps ? this.steps = steps : null;
        categories ? this.categories = categories : null;
    }
    Recipe.prototype.equals = function (other) {
        var checkID = true;
        var checkName = this.name === other.name;
        var checkDescription = this.description === other.description;
        var checkIngredients = true;
        var checkSteps = true;
        var checkCategories = true;
        //RecipeID
        if (this.recipe_ID && other.recipe_ID) {
            checkID = this.recipe_ID === other.recipe_ID;
        }
        //Ingredients
        if (this.ingredients.length === other.ingredients.length) {
            for (var index = 0; index < this.ingredients.length; index++) {
                if (!this.ingredients[index].equals(other.ingredients[index])) {
                    checkIngredients = false;
                    break;
                }
            }
        }
        //Steps
        if (this.steps && other.steps) {
            if (this.steps.length === other.steps.length) {
                for (var index = 0; index < this.steps.length; index++) {
                    if (!this.steps[index].equals(other.steps[index])) {
                        checkSteps = false;
                        break;
                    }
                }
            }
            else {
                checkSteps = false;
            }
        }
        //Categories
        if (this.categories && other.categories) {
            if (this.categories.length === other.categories.length) {
                for (var index = 0; index < this.categories.length; index++) {
                    if (!this.categories[index].equals(other.categories[index])) {
                        checkCategories = false;
                        break;
                    }
                }
            }
            else {
                checkCategories = false;
            }
        }
        if (checkID && checkCategories && checkDescription && checkIngredients && checkName && checkSteps) {
            return true;
        }
        else {
            return false;
        }
    };
    return Recipe;
}());
exports.Recipe = Recipe;
var Ingredient = /** @class */ (function () {
    function Ingredient(name, ingredient_ID, amount, unit, optional) {
        this.name = name;
        this.ingredient_ID = ingredient_ID;
        amount ? this.amount = amount : null;
        unit ? this.unit = unit : null;
        optional ? this.optional = optional : null;
    }
    Ingredient.prototype.equals = function (other) {
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
        if (this.ingredient_ID && other.ingredient_ID) {
            if (this.ingredient_ID != other.ingredient_ID) {
                return false;
            }
        }
        return true;
    };
    return Ingredient;
}());
exports.Ingredient = Ingredient;
var Step = /** @class */ (function () {
    function Step(number, description, duration, step_ID) {
        this.step_ID = step_ID;
        this.number = number;
        this.description = description;
        duration ? this.duration = duration : null;
    }
    Step.prototype.equals = function (other) {
        if (this.number != other.number) {
            return false;
        }
        if (this.description != other.description) {
            return false;
        }
        if (this.duration != other.duration) {
            return false;
        }
        if (this.step_ID && other.step_ID) {
            if (this.step_ID != other.step_ID) {
                return false;
            }
        }
        return true;
    };
    return Step;
}());
exports.Step = Step;
var Category = /** @class */ (function () {
    function Category(name, category_ID) {
        this.name = name;
        category_ID ? this.category_ID = category_ID : null;
    }
    Category.prototype.equals = function (other) {
        if (this.name != other.name) {
            return false;
        }
        if (this.category_ID && other.category_ID) {
            if (this.category_ID != other.category_ID) {
                return false;
            }
        }
        return true;
    };
    return Category;
}());
exports.Category = Category;
