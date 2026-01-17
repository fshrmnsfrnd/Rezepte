import { NextResponse } from "next/server";
import { verifyUserRegistration, verifyUserLogin } from "../../../../lib/userAuth";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;
  const body = await req.json().catch(() => ({}));
  const type = body?.type || "login";
  try {
    if (type === "register") {
      const { flowId, attestation } = body;
      await verifyUserRegistration(flowId, attestation, host);
      return NextResponse.json({ ok: true });
    } else {
      const { flowId, assertion } = body;
      const { sessionId, userId } = await verifyUserLogin(flowId, assertion, host);
      const res = NextResponse.json({ ok: true, userId });
      const secure = process.env.NODE_ENV === "production";
      res.headers.set(
        "Set-Cookie",
        `user_session=${sessionId}; HttpOnly; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`
      );
      return res;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 400 });
  }
}
