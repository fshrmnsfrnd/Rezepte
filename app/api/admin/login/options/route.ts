import { NextResponse } from "next/server";
import { db as authDb } from "../../../../../lib/authDb";
import { createLoginOptions } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;
  const creds = await authDb.all("SELECT id FROM AdminCredential");
  if (creds.length === 0) return NextResponse.json({ error: "no-credentials" }, { status: 404 });

  const { options, sessionId } = await createLoginOptions(host);
  return NextResponse.json({ options, sessionId });
}
