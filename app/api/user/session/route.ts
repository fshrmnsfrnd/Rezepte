import { NextResponse } from "next/server";
import { isUserAuthenticated } from "../../../../lib/userAuth";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/user_session=([^;]+)/);
  const sessionId = match ? match[1] : undefined;
  const status = await isUserAuthenticated(sessionId);
  return NextResponse.json(status);
}
