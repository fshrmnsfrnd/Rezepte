import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "./db";
import { createUser, getUserByUsername, upsertCredential, listCredentialsForUser, getCredentialById, createSession, getSession, deleteSession } from "./UserDAO";

function base64urlToBuffer(b64u: string) {
  const padding = "=".repeat((4 - (b64u.length % 4)) % 4);
  const base64 = (b64u + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function bufferToBase64url(buff: ArrayBuffer | Buffer) {
  const b = Buffer.isBuffer(buff) ? buff : Buffer.from(buff);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function normalizeToBase64url(id: string) {
  if (!id) return id;
  if (id.includes("-") || id.includes("_")) return id.replace(/=+$/, "");
  return id.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function baseUrlFromHost(host?: string) {
  if (!host) return "http://localhost";
  if (host.startsWith("localhost") || host.includes("localhost")) return `http://${host}`;
  return `https://${host.split(":")[0]}`;
}

function rpIdFromHost(host?: string) {
  if (!host) return "localhost";
  return host.split(":")[0];
}

export async function createUserRegistrationOptions(username: string, host?: string) {
  const rpID = rpIdFromHost(host);
  const origin = baseUrlFromHost(host);

  const user = (await getUserByUsername(username)) ?? (await createUser(username));
  const existing = await listCredentialsForUser(user.user_ID!);
  const excludeCredentials = existing.map((c) => ({ id: c.id, type: "public-key" }));

  const options = await generateRegistrationOptions({
    rpName: "Rezepte User",
    rpID,
    userID: Buffer.from(String(user.user_ID)),
    userName: user.username,
    attestationType: "none",
    authenticatorSelection: { userVerification: "preferred" },
    excludeCredentials,
  });

  // Store ephemeral flow with challenge
  const { randomBytes } = await import("crypto");
  const flowId = randomBytes(16).toString("hex");
  await db.run(
    "INSERT INTO UserFlow (flowId, User_ID, type, createdAt, challenge) VALUES (?, ?, ?, ?, ?)",
    [flowId, user.user_ID!, "register", Date.now(), options.challenge]
  );
  return { options, origin, rpID, userId: user.user_ID!, flowId };
}

export async function verifyUserRegistration(flowId: string, attestation: any, host?: string) {
  const rpID = rpIdFromHost(host);
  const origin = baseUrlFromHost(host);
  if (!attestation || (!attestation.id && !attestation.rawId)) throw new Error("Missing credential ID");
  const row = await db.get("SELECT * FROM UserFlow WHERE flowId = ?", [flowId]);
  if (!row || row.type !== "register") throw new Error("Invalid registration flow");

  const verification = await verifyRegistrationResponse({
    response: attestation,
    expectedChallenge: row.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  } as any);

  if (!verification.verified) throw new Error("Registration not verified");

  const reg = verification.registrationInfo!;
  const credentialID = (reg as any).credentialID ?? (reg as any).credential?.id ?? (reg as any).credential?.rawId;
  const credentialPublicKey = (reg as any).credentialPublicKey ?? (reg as any).credential?.publicKey ?? (reg as any).credential?.credentialPublicKey;
  const counter = (reg as any).counter ?? (reg as any).credential?.counter ?? 0;

  let idB64u: string;
  if (Buffer.isBuffer(credentialID) || credentialID instanceof ArrayBuffer || ArrayBuffer.isView(credentialID)) {
    idB64u = bufferToBase64url(credentialID as any);
  } else if (typeof credentialID === "string") {
    const asStr = credentialID;
    if (asStr.includes("-") || asStr.includes("_")) {
      idB64u = normalizeToBase64url(asStr);
    } else {
      try {
        const decoded = Buffer.from(asStr, "base64").toString("utf8");
        idB64u = normalizeToBase64url(decoded);
      } catch {
        idB64u = normalizeToBase64url(asStr);
      }
    }
  } else {
    throw new Error("Unsupported credentialID type");
  }

  let pubkeyB64: string;
  if (Buffer.isBuffer(credentialPublicKey) || credentialPublicKey instanceof ArrayBuffer || ArrayBuffer.isView(credentialPublicKey)) {
    pubkeyB64 = Buffer.from(credentialPublicKey as any).toString("base64");
  } else if (typeof credentialPublicKey === "string") {
    try {
      pubkeyB64 = base64urlToBuffer(credentialPublicKey).toString("base64");
    } catch {
      pubkeyB64 = Buffer.from(credentialPublicKey, "base64").toString("base64");
    }
  } else {
    throw new Error("Unsupported credentialPublicKey type");
  }

  const userId = Number(row.User_ID);
  await upsertCredential(userId, idB64u, pubkeyB64, counter);
  await db.run("DELETE FROM UserFlow WHERE flowId = ?", [flowId]);
  return true;
}

export async function createUserLoginOptions(host?: string) {
  const rpID = rpIdFromHost(host);
  // Allow platform authenticators to choose credential; omit allowCredentials
  const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  const { randomBytes } = await import("crypto");
  const flowId = randomBytes(16).toString("hex");
  await db.run(
    "INSERT INTO UserFlow (flowId, User_ID, type, createdAt, challenge) VALUES (?, ?, ?, ?, ?)",
    [flowId, null, "login", Date.now(), options.challenge]
  );
  return { options, rpID, flowId };
}

export async function verifyUserLogin(flowId: string, assertion: any, host?: string) {
  const rpID = rpIdFromHost(host);
  const origin = baseUrlFromHost(host);
  const row = await db.get("SELECT * FROM UserFlow WHERE flowId = ?", [flowId]);
  if (!row || row.type !== "login") throw new Error("Invalid login flow");

  let incomingId: string | null = null;
  if (typeof assertion.id === "string") incomingId = normalizeToBase64url(assertion.id);
  else if (assertion.rawId) incomingId = bufferToBase64url(assertion.rawId as any);
  if (!incomingId) throw new Error("Missing credential id");

  const credential = await getCredentialById(incomingId);
  if (!credential) throw new Error("Unknown credential");

  const pubkeyBuf = credential.publicKey ? Buffer.from(credential.publicKey, "base64") : undefined;
  const verification = await verifyAuthenticationResponse({
    response: assertion,
    expectedChallenge: row.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: { id: credential.id, publicKey: pubkeyBuf, counter: credential.counter ?? 0 } as any,
  } as any);
  if (!verification.verified) throw new Error("Authentication failed");

  const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  const { sessionId, expiresAt } = await createSession(credential.user_ID, maxAgeMs);
  await db.run("DELETE FROM UserFlow WHERE flowId = ?", [flowId]);
  return { sessionId, userId: credential.user_ID, expiresAt };
}

export async function isUserAuthenticated(sessionId?: string): Promise<{ authenticated: boolean; userId?: number }> {
  if (!sessionId) return { authenticated: false };
  const sess = await getSession(sessionId);
  if (!sess) return { authenticated: false };
  if (sess.expiresAt < Date.now()) {
    await deleteSession(sessionId);
    return { authenticated: false };
  }
  return { authenticated: true, userId: sess.user_ID };
}

export async function logoutUserSession(sessionId?: string) {
  if (!sessionId) return;
  await deleteSession(sessionId);
}
