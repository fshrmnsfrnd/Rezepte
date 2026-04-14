import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "db.db");

const database = new Database(dbPath);
database.pragma("foreign_keys = ON");

function normalizeParams(params?: unknown[] | Record<string, unknown>) {
    if (params === undefined) return [];
    return Array.isArray(params) ? params : [params];
}

export const db = {
    async exec(sql: string): Promise<void> {
        database.exec(sql);
    },
    async run(sql: string, params?: unknown[] | Record<string, unknown>) {
        const result = database.prepare(sql).run(...normalizeParams(params));
        return {
            lastID: Number(result.lastInsertRowid),
            changes: result.changes,
        };
    },
    async get(sql: string, params?: unknown[] | Record<string, unknown>) {
        return database.prepare(sql).get(...normalizeParams(params));
    },
    async all(sql: string, params?: unknown[] | Record<string, unknown>) {
        return database.prepare(sql).all(...normalizeParams(params));
    },
};

await db.exec(`
    CREATE TABLE IF NOT EXISTS Recipe (
        Recipe_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL,
        Description TEXT
    );

    CREATE TABLE IF NOT EXISTS Step (
        Step_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Recipe_ID INTEGER,
        Number INTEGER NOT NULL,
        Description TEXT NOT NULL,
        Duration INTEGER,
        FOREIGN KEY (Recipe_ID) REFERENCES Recipe(Recipe_ID)
    );

    CREATE TABLE IF NOT EXISTS Ingredient (
        Ingredient_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Recipe_Ingredient (
        Recipe_ID INTEGER,
        Ingredient_ID INTEGER,
        Amount DECIMAL,
        Unit TEXT,
        Optional BOOLEAN,
        FOREIGN KEY (Recipe_ID) REFERENCES Recipe(Recipe_ID),
        FOREIGN KEY (Ingredient_ID) REFERENCES Ingredient(Ingredient_ID)
    );

    CREATE TABLE IF NOT EXISTS Category (
        Category_ID INTEGER PRIMARY KEY AUTOINCREMENT,
        Name TEXT
    );

    CREATE TABLE IF NOT EXISTS Recipe_Category (
        Recipe_ID INTEGER,
        Category_ID INTEGER,
        FOREIGN KEY (Recipe_ID) REFERENCES Recipe(Recipe_ID),
        FOREIGN KEY (Category_ID) REFERENCES Category(Category_ID)
    );

    -- User related tables (User_ID references better-auth users)
    CREATE TABLE IF NOT EXISTS User_Cart (
        User_ID TEXT,
        Item INTEGER
    );

    CREATE TABLE IF NOT EXISTS UserData (
        User_ID TEXT,
        Key TEXT,
        Value TEXT,
        UNIQUE(User_ID, Key)
    );
`);