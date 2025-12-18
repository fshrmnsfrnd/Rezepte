import { NextResponse } from "next/server";
import { verifyRegistration } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;
  const body = await req.json();
  const { sessionId, attestation } = body;
  console.log("[register/verify] received body:", JSON.stringify(body).slice(0, 2000));
  try {
    await verifyRegistration(sessionId, attestation, host);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[register/verify] error verifying registration:", e && e.stack ? e.stack : e);
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
