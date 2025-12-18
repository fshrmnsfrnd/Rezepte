import { NextResponse } from "next/server";
import { db as authDb } from "../../../../../lib/authDb";
import { createRegistrationOptions, isAuthenticated } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;

  const creds = await authDb.all("SELECT id FROM AdminCredential");
  if (creds.length > 0) {
    // require auth
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session=([^;]+)/);
    const sessionId = match ? match[1] : undefined;
    const authed = await isAuthenticated(sessionId);
    if (!authed) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { options, sessionId } = await createRegistrationOptions(host);
  return NextResponse.json({ options, sessionId });
}
