import { db } from "./db";

export type User = {
  user_ID?: number;
  username: string;
  createdAt?: number;
};

export async function createUser(username: string): Promise<User> {
  const trimmed = (username || "").trim();
  if (!trimmed) throw new Error("Username required");
  const now = Date.now();
  const existing = await db.get("SELECT User_ID AS user_ID, Username AS username FROM User WHERE Username = ?", [trimmed]);
  if (existing && existing.user_ID) return { user_ID: existing.user_ID, username: existing.username, createdAt: now };
  const res = await db.run("INSERT INTO User (Username, CreatedAt) VALUES (?, ?)", [trimmed, now]);
  return { user_ID: res.lastID as number, username: trimmed, createdAt: now };
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const row = await db.get("SELECT User_ID AS user_ID, Username AS username, CreatedAt AS createdAt FROM User WHERE Username = ?", [username]);
  if (!row) return null;
  return { user_ID: row.user_ID, username: row.username, createdAt: row.createdAt } as User;
}

export async function getUserById(userId: number): Promise<User | null> {
  const row = await db.get("SELECT User_ID AS user_ID, Username AS username, CreatedAt AS createdAt FROM User WHERE User_ID = ?", [userId]);
  if (!row) return null;
  return { user_ID: row.user_ID, username: row.username, createdAt: row.createdAt } as User;
}

export async function upsertCredential(userId: number, idB64u: string, pubkeyB64: string, counter: number): Promise<void> {
  await db.run(
    "INSERT OR REPLACE INTO UserCredential (id, User_ID, publicKey, counter) VALUES (?, ?, ?, ?)",
    [idB64u, userId, pubkeyB64, counter]
  );
}

export async function getCredentialById(idB64u: string): Promise<{ id: string; user_ID: number; publicKey: string; counter: number } | null> {
  const row = await db.get("SELECT id, User_ID AS user_ID, publicKey, counter FROM UserCredential WHERE id = ?", [idB64u]);
  if (!row) return null;
  return row as any;
}

export async function listCredentialsForUser(userId: number): Promise<Array<{ id: string }>> {
  const rows = await db.all("SELECT id FROM UserCredential WHERE User_ID = ?", [userId]);
  return rows || [];
}

export async function createSession(userId: number, maxAgeMs: number): Promise<{ sessionId: string; expiresAt: number }> {
  const { randomBytes } = await import("crypto");
  const sessionId = randomBytes(16).toString("hex");
  const now = Date.now();
  const expiresAt = now + Math.max(7 * 24 * 60 * 60 * 1000, maxAgeMs || 0); // default 7 days
  await db.run("INSERT INTO UserSession (sessionId, User_ID, createdAt, expiresAt) VALUES (?, ?, ?, ?)", [sessionId, userId, now, expiresAt]);
  return { sessionId, expiresAt };
}

export async function getSession(sessionId: string): Promise<{ sessionId: string; user_ID: number; expiresAt: number } | null> {
  const row = await db.get("SELECT sessionId, User_ID AS user_ID, expiresAt FROM UserSession WHERE sessionId = ?", [sessionId]);
  if (!row) return null;
  return row as any;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.run("DELETE FROM UserSession WHERE sessionId = ?", [sessionId]);
}

export async function setUserData(userId: number, key: string, value: any): Promise<void> {
  const v = JSON.stringify(value ?? null);
  await db.run("INSERT OR REPLACE INTO UserData (User_ID, key, value) VALUES (?, ?, ?)", [userId, key, v]);
}

export async function getUserData(userId: number, key: string): Promise<any> {
  const row = await db.get("SELECT value FROM UserData WHERE User_ID = ? AND key = ?", [userId, key]);
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}
