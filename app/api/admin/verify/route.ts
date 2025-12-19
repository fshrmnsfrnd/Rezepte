import { NextResponse } from "next/server";
import { verifyRegistration, verifyLogin } from "../../../../lib/webauthn";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;
  const body = await req.json().catch(() => ({}));
  const type = body?.type || "login";
  try {
    if (type === "register") {
      const { sessionId, attestation } = body;
      await verifyRegistration(sessionId, attestation, host);
      return NextResponse.json({ ok: true });
    } else {
      const { sessionId, assertion } = body;
      const authSessionId = await verifyLogin(sessionId, assertion, host);
      const res = NextResponse.json({ ok: true });
      const secure = process.env.NODE_ENV === "production";
      res.headers.set(
        "Set-Cookie",
        `session=${authSessionId}; HttpOnly; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`
      );
      return res;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
