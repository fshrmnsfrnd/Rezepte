import { NextResponse } from "next/server";
import { isUserAuthenticated } from "../../../../lib/userAuth";
import { setUserData, getUserData } from "../../../../lib/UserDAO";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || undefined;
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/user_session=([^;]+)/);
  const sessionId = match ? match[1] : undefined;
  const status = await isUserAuthenticated(sessionId);
  if (!status.authenticated || !status.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const value = await getUserData(status.userId, key);
  return NextResponse.json({ key, value });
}

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/user_session=([^;]+)/);
  const sessionId = match ? match[1] : undefined;
  const status = await isUserAuthenticated(sessionId);
  if (!status.authenticated || !status.userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const key = body?.key as string | undefined;
  const value = body?.value as any;
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  await setUserData(status.userId, key, value);
  return NextResponse.json({ ok: true });
}
