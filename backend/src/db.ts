import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({
    filename: "./src/db.db",
    driver: sqlite3.Database
});

await db.exec(`
    DROP TABLE IF EXISTS Cocktail;
    DROP TABLE IF EXISTS Step;
    DROP TABLE IF EXISTS Ingredient;
    DROP TABLE IF EXISTS Cocktail_Ingredient;
`);

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

// Beispiel-Daten einfügen (nur einmal, bei Konflikt wird die Einfügung ignoriert)
await db.exec(`
    BEGIN TRANSACTION;

    INSERT OR IGNORE INTO Cocktail (Cocktail_ID, Name, Description) VALUES
        (1, 'Mojito', 'Erfrischender Cocktail mit Limette, Minze und Rum'),
        (2, 'Negroni', 'Bitter-süßer Cocktail mit Gin, Campari und Vermouth');

    INSERT OR IGNORE INTO Step (Step_ID, Cocktail_ID, Number, Description) VALUES
        (1, 1, 1, "Limetten und Zucker"), -- Mojito: Limetten und Zucker
        (2, 1, 2, "Minze zerstoßen"), -- Mojito: Minze zerstoßen
        (3, 1, 3, "Rum und Soda"), -- Mojito: Rum und Soda
        (4, 2, 1, "Zutaten ins Glas"), -- Negroni: Zutaten ins Glas
        (5, 2, 2, "Rühren"); -- Negroni: Rühren

    INSERT OR IGNORE INTO Ingredient (Ingredient_ID, Name) VALUES
        (1, 'Limette'),
        (2, 'Minze'),
        (3, 'Weißer Rum'),
        (4, 'Zucker'),
        (5, 'Soda'),
        (6, 'Gin'),
        (7, 'Campari'),
        (8, 'Wermut');

    INSERT OR IGNORE INTO Cocktail_Ingredient (Cocktail_ID, Ingredient_ID, Amount, Unit, Optional) VALUES
        -- Mojito
        (1, 1, 1, 'piece', 0), -- Limette
        (1, 2, 8, 'leaves', 0), -- Minze
        (1, 3, 50, 'ml', 0), -- Weißer Rum
        (1, 4, 2, 'tsp', 0), -- Zucker
        (1, 5, 50, 'ml', 0), -- Soda
        -- Negroni
        (2, 6, 30, 'ml', 0), -- Gin
        (2, 7, 30, 'ml', 0), -- Campari
        (2, 8, 30, 'ml', 0); -- Wermut

    COMMIT;
`);

export { db };