import { db } from "./db";
import { randomBytes } from "crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

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
  // already base64url
  if (id.includes("-") || id.includes("_")) return id.replace(/=+$/, "");
  // looks like base64 -> convert
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

export async function createRegistrationOptions(host?: string) {
  const rpID = rpIdFromHost(host);
  const origin = baseUrlFromHost(host);

  const existing = await db.all("SELECT id FROM AdminCredential");
  const excludeCredentials = existing.map((c: any) => ({ id: c.id, type: "public-key" }));

  const options = await generateRegistrationOptions({
    rpName: "Rezepte Admin",
    rpID,
    userID: Buffer.from("admin"),
    userName: "admin",
    attestationType: "none",
    authenticatorSelection: { userVerification: "preferred" },
    excludeCredentials,
  });

  const sessionId = randomBytes(16).toString("hex");
  await db.run("INSERT INTO Session (sessionId, createdAt, challenge, type) VALUES (?, ?, ?, ?)", [
    sessionId,
    Date.now(),
    options.challenge,
    "register",
  ]);

  return { options, sessionId, origin, rpID };
}

export async function verifyRegistration(sessionId: string, attestation: any, host?: string) {
  const row = await db.get("SELECT * FROM Session WHERE sessionId = ?", [sessionId]);
  if (!row || row.type !== "register") throw new Error("Invalid session");

  const rpID = rpIdFromHost(host);
  const origin = baseUrlFromHost(host);

  // prefer passing the full credential object (id/rawId/response/type)
  // to support different browser shapes (Windows Hello may provide rawId only)
  if (!attestation || (!attestation.id && !attestation.rawId)) throw new Error("Missing credential ID");
  try {
    const verification = await verifyRegistrationResponse({
      // simplewebauthn expects the received PublicKeyCredential under `response`
      response: attestation,
      expectedChallenge: row.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    } as any);

    if (!verification.verified) throw new Error("Registration not verified");

    const reg = verification.registrationInfo!;
    // registrationInfo shape can vary between versions — prefer explicit fields but
    // fall back to nested 'credential' properties if present.
    const credentialID = (reg as any).credentialID ?? (reg as any).credential?.id ?? (reg as any).credential?.rawId;
    const credentialPublicKey = (reg as any).credentialPublicKey ?? (reg as any).credential?.publicKey ?? (reg as any).credential?.credentialPublicKey;
    const counter = (reg as any).counter ?? (reg as any).credential?.counter ?? 0;

    // Normalize credentialID: it may be a Buffer/ArrayBuffer or already a base64/base64url string
    let idB64u: string;
    if (Buffer.isBuffer(credentialID) || credentialID instanceof ArrayBuffer || ArrayBuffer.isView(credentialID)) {
      idB64u = bufferToBase64url(credentialID as any);
    } else if (typeof credentialID === "string") {
      // Credential ID can arrive as a base64url string (normal), but some
      // browsers/environments occasionally provide a base64-encoded string
      // whose decoded value is the base64url form. Detect and normalize
      // that double-encoded shape so we store the canonical base64url id.
      const asStr = credentialID;
      if (asStr.includes("-") || asStr.includes("_")) {
        idB64u = normalizeToBase64url(asStr);
      } else {
        try {
          const decoded = Buffer.from(asStr, "base64").toString("utf8");
          if (decoded.includes("-") || decoded.includes("_")) {
            idB64u = normalizeToBase64url(decoded);
          } else {
            idB64u = normalizeToBase64url(asStr);
          }
        } catch {
          idB64u = normalizeToBase64url(asStr);
        }
      }
    } else {
      throw new Error("Unsupported credentialID type");
    }

    // Normalize public key: prefer to store as base64. Accept Buffer/ArrayBuffer or string.
    let pubkeyB64: string;
    if (Buffer.isBuffer(credentialPublicKey) || credentialPublicKey instanceof ArrayBuffer || ArrayBuffer.isView(credentialPublicKey)) {
      pubkeyB64 = Buffer.from(credentialPublicKey as any).toString("base64");
    } else if (typeof credentialPublicKey === "string") {
      // try base64url -> buffer, else assume base64
      try {
        pubkeyB64 = base64urlToBuffer(credentialPublicKey).toString("base64");
      } catch {
        pubkeyB64 = Buffer.from(credentialPublicKey, "base64").toString("base64");
      }
    } else {
      throw new Error("Unsupported credentialPublicKey type");
    }

    await db.run(
      "INSERT OR REPLACE INTO AdminCredential (id, publicKey, counter) VALUES (?, ?, ?)",
      [idB64u, pubkeyB64, counter]
    );
  } catch (err: any) {
    console.error("[webauthn] registration verification failed, attestation:", attestation);
    throw err;
  }

  await db.run("DELETE FROM Session WHERE sessionId = ?", [sessionId]);
  return true;
}

export async function createLoginOptions(host?: string) {
  const rpID = rpIdFromHost(host);
  const origin = baseUrlFromHost(host);

  const creds = await db.all("SELECT id FROM AdminCredential");

  // If we provide `allowCredentials`, some browsers/OS authenticators may hide
  // the platform authenticator option — omitting allowCredentials lets the
  // authenticator present platform (Windows Hello) options. For stricter
  // matching, set an env var `REQUIRE_ALLOW_CREDENTIALS=true` to keep the
  // existing behavior.
  const includeAllow = process.env.REQUIRE_ALLOW_CREDENTIALS === "true";
  const allowCredentials = includeAllow
    ? creds.map((c: any) => ({ id: c.id, type: "public-key" }))
    : undefined;

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: "preferred",
  });

  const sessionId = randomBytes(16).toString("hex");
  await db.run("INSERT INTO Session (sessionId, createdAt, challenge, type) VALUES (?, ?, ?, ?)", [
    sessionId,
    Date.now(),
    options.challenge,
    "login",
  ]);

  return { options, sessionId, origin, rpID };
}

export async function verifyLogin(sessionId: string, assertion: any, host?: string) {
  const row = await db.get("SELECT * FROM Session WHERE sessionId = ?", [sessionId]);
  if (!row || row.type !== "login") throw new Error("Invalid session");

  const rpID = rpIdFromHost(host);
  const origin = baseUrlFromHost(host);

  // normalize incoming id to the base64url form used for storage
  let incomingId: string | null = null;
  if (typeof assertion.id === "string") {
    incomingId = normalizeToBase64url(assertion.id);
  } else if (assertion.rawId) {
    try {
      // rawId may be an ArrayBuffer or Buffer-like view
      incomingId = bufferToBase64url(assertion.rawId as any);
    } catch (e) {
      incomingId = null;
    }
  }
  let credential: any = incomingId
    ? await db.get("SELECT * FROM AdminCredential WHERE id = ?", [incomingId])
    : null;

  if (!credential) {
    // try tolerant matching: compare raw buffers between incoming id and stored ids
    try {
      const rows = await db.all("SELECT id, publicKey, counter FROM AdminCredential");
      const incomingBuf = incomingId ? base64urlToBuffer(incomingId) : null;
      for (const r of rows) {
        try {
          const storedBuf = Buffer.from(r.id, "base64");
          if (incomingBuf && storedBuf.equals(incomingBuf)) {
            credential = r;
            break;
          }
        } catch {}
        try {
          const storedBuf2 = base64urlToBuffer(r.id);
          if (incomingBuf && storedBuf2.equals(incomingBuf)) {
            credential = r;
            break;
          }
        } catch {}
        // Handle the case where the stored id is a base64 encoding of the
        // base64url string (double-encoded). Decode the stored value to
        // UTF-8 and then treat that as the base64url id to compare against
        // the incoming id bytes. If it matches, update the DB to store the
        // canonical base64url id so future lookups succeed directly.
        try {
          const maybeAscii = Buffer.from(r.id, "base64").toString("utf8");
          const maybeBuf = base64urlToBuffer(maybeAscii);
          if (incomingBuf && maybeBuf.equals(incomingBuf)) {
            credential = r;
            const normalized = normalizeToBase64url(maybeAscii);
            try {
              await db.run("UPDATE AdminCredential SET id = ? WHERE id = ?", [normalized, r.id]);
              credential.id = normalized;
              console.info("[webauthn] Fixed stored double-encoded credential id, updated DB to normalized id");
            } catch (e) {
              // if updating fails, still proceed with the found credential
            }
            break;
          }
        } catch {}
      }
      if (!credential) {
        const incomingHex = incomingBuf ? incomingBuf.toString("hex") : null;
        const storedInfo = rows.map((r: any) => {
          let hexBase64: string | null = null;
          let hexBase64url: string | null = null;
          try {
            hexBase64 = Buffer.from(r.id, "base64").toString("hex");
          } catch {}
          try {
            hexBase64url = base64urlToBuffer(r.id).toString("hex");
          } catch {}
          return { id: r.id, hexBase64, hexBase64url };
        });
        console.error("[webauthn] Unknown credential id sent:", assertion.id, "normalized:", incomingId, "incomingHex:", incomingHex);
        console.error("[webauthn] Stored credential ids (with decoded hex variants):", storedInfo);
        throw new Error("Unknown credential");
      }
    } catch (e) {
      console.error("[webauthn] Failed to read stored credential ids", e);
      throw new Error("Unknown credential");
    }
  }

  if (!credential) {
    console.error("[webauthn] No matching credential found after tolerant matching", { incomingId, assertion });
    throw new Error("Unknown credential");
  }

  const pubkeyBuf = credential.publicKey ? Buffer.from(credential.publicKey, "base64") : undefined;
  const credIdBuf = base64urlToBuffer(credential.id);

  console.debug("[webauthn] verifying assertion with credential:", { credential, authenticator: { credentialID: credIdBuf, credentialPublicKey: pubkeyBuf, counter: credential?.counter ?? 0 } });
  const verification = await verifyAuthenticationResponse({
    // simplewebauthn expects the assertion under `response` as well
    response: assertion,
    expectedChallenge: row.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    // the library expects the stored credential under the `credential` key
    credential: {
      id: credential.id,
      publicKey: pubkeyBuf,
      counter: credential?.counter ?? 0,
    } as any,
  } as any);

  if (!verification.verified) throw new Error("Authentication failed");

  // update counter (use stored id)
  const newCounter = verification.authenticationInfo?.newCounter ?? credential.counter ?? 0;
  await db.run("UPDATE AdminCredential SET counter = ? WHERE id = ?", [newCounter, credential.id]);

  // create auth session cookie id
  const authSessionId = randomBytes(16).toString("hex");
  await db.run("INSERT INTO Session (sessionId, createdAt, type) VALUES (?, ?, ?)", [
    authSessionId,
    Date.now(),
    "auth",
  ]);

  await db.run("DELETE FROM Session WHERE sessionId = ?", [sessionId]);

  return authSessionId;
}

export async function isAuthenticated(sessionId?: string) {
  if (!sessionId) return false;
  const row = await db.get("SELECT * FROM Session WHERE sessionId = ? AND type = 'auth'", [sessionId]);
  return !!row;
}

export async function logoutSession(sessionId?: string) {
  if (!sessionId) return;
  await db.run("DELETE FROM Session WHERE sessionId = ?", [sessionId]);
}
