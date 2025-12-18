import { NextResponse } from "next/server";
import { logoutSession } from "../../../../lib/webauthn";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  const sessionId = match ? match[1] : undefined;
  if (sessionId) await logoutSession(sessionId);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", `session=; HttpOnly; Path=/; Max-Age=0`);
  return res;
}
