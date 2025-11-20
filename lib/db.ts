import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const dbPath = path.join(process.cwd(), "db.db");

export const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
});

// Ensure schema exists, but do not DROP tables or insert demo data on import.
await db.exec(`
    CREATE TABLE IF NOT EXISTS Cocktail (
        Cocktail_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT,
        Description TEXT
    );

    CREATE TABLE IF NOT EXISTS Step (
        Step_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Cocktail_ID INTEGER,
        Number INTEGER,
        Description TEXT,
        FOREIGN KEY (Cocktail_ID) REFERENCES Cocktail(Cocktail_ID)
    );

    CREATE TABLE IF NOT EXISTS Ingredient (
        Ingredient_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT
    );

    CREATE TABLE IF NOT EXISTS Cocktail_Ingredient (
        Cocktail_ID INTEGER,
        Ingredient_ID INTEGER,
        Amount DECIMAL,
        Unit TEXT,
        Optional BOOLEAN,
        FOREIGN KEY (Cocktail_ID) REFERENCES Cocktail(Cocktail_ID),
        FOREIGN KEY (Ingredient_ID) REFERENCES Ingredient(Ingredient_ID)
    );
`);