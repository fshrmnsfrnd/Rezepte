import { NextResponse } from "next/server";
import { createUserRegistrationOptions, createUserLoginOptions } from "../../../../lib/userAuth";

export async function POST(req: Request) {
  const host = req.headers.get("host") || undefined;
  const body = await req.json().catch(() => ({}));
  const requested = body?.type as string | undefined;
  const username = body?.username as string | undefined;

  try {
    if (requested === "register") {
      if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
      const { options, flowId } = await createUserRegistrationOptions(username, host);
      return NextResponse.json({ options, flowId, action: "register" });
    } else {
      const { options, flowId } = await createUserLoginOptions(host);
      return NextResponse.json({ options, flowId, action: "login" });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}
