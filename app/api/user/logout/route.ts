import { NextResponse } from "next/server";
import { logoutUserSession } from "../../../../lib/userAuth";

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/user_session=([^;]+)/);
  const sessionId = match ? match[1] : undefined;
  if (sessionId) await logoutUserSession(sessionId);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", `user_session=; HttpOnly; Path=/; Max-Age=0`);
  return res;
}
