import { NextResponse } from "next/server";
import { createRegistrationOptions, createLoginOptions } from "../../../../lib/webauthn";
import { db as authDb } from "../../../../lib/authDb";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;
  const body = await req.json().catch(() => ({}));
  const requested = body?.type as string | undefined;

  // Determine whether credentials already exist
  const creds = await authDb.all("SELECT id FROM AdminCredential");
  const haveCreds = creds.length > 0;

  // Choose action: explicit `type` wins, otherwise use presence of creds
  const action = requested === "register" ? "register" : requested === "login" ? "login" : haveCreds ? "login" : "register";

  try {
    if (action === "register") {
      const { options, sessionId } = await createRegistrationOptions(host);
      return NextResponse.json({ options, sessionId, action });
    } else {
      const { options, sessionId } = await createLoginOptions(host);
      return NextResponse.json({ options, sessionId, action });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
