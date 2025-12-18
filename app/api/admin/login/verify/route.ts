import { NextResponse } from "next/server";
import { verifyLogin } from "../../../../../lib/webauthn";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;
  const body = await req.json();
  const { sessionId, assertion } = body;
  try {
    const authSessionId = await verifyLogin(sessionId, assertion, host);
    const res = NextResponse.json({ ok: true });
    // set cookie
    const secure = process.env.NODE_ENV === "production";
    res.headers.set(
      "Set-Cookie",
      `session=${authSessionId}; HttpOnly; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`
    );
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
