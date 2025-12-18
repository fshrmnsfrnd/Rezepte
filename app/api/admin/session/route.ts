import { NextResponse } from "next/server";
import { isAuthenticated } from "../../../../lib/webauthn";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/session=([^;]+)/);
  const sessionId = match ? match[1] : undefined;
  const authed = await isAuthenticated(sessionId);
  return NextResponse.json({ authenticated: authed });
}
