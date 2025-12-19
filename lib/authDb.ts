import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";

const authDbPath = path.join(process.cwd(), "auth.db");

export const db = await open({
  filename: authDbPath,
  driver: sqlite3.Database,
});

await db.exec(`
    CREATE TABLE IF NOT EXISTS AdminCredential (
        id TEXT PRIMARY KEY,
        publicKey TEXT,
        counter INTEGER
    );

    CREATE TABLE IF NOT EXISTS Session (
        sessionId TEXT PRIMARY KEY,
        createdAt INTEGER,
        challenge TEXT,
        type TEXT
    );
`);
