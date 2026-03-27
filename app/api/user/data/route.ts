import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const key = request.nextUrl.searchParams.get("key");
        if (!key) {return NextResponse.json({ error: "missing key" }, { status: 400 });}

        const session = await auth.api.getSession({ headers: request.headers });
        if(!session?.user?.id){return NextResponse.json({ error: "No User ID or Session" }, { status: 401 });}

        const row = await db.get("SELECT Value FROM UserData WHERE User_ID = ? AND Key = ?", [session.user.id, key]);

        if (!row) {
            return NextResponse.json({ value: null }, { status: 200 });
        }

        try {
            return NextResponse.json({ value: JSON.parse(row.Value) }, { status: 200 });
        } catch (e) {
            return NextResponse.json({ value: row.Value }, { status: 200 });
        }
    } catch (err) {
        return NextResponse.json({ value: null }, { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {

        const session = await auth.api.getSession({ headers: request.headers });
        if(!session?.user?.id){return NextResponse.json({ error: "No User ID or Session" }, { status: 401 });}

        const body = await request.json();
        const { key, value } = body as { key?: string; value: any };

        if (!key) {return NextResponse.json({ error: "missing key" }, { status: 400 });}

        const valueStr = JSON.stringify(value);

        const existing = await db.get("SELECT 1 FROM UserData WHERE User_ID = ? AND Key = ?", [session.user.id, key]);
        if (existing) {
            await db.run("UPDATE UserData SET Value = ? WHERE User_ID = ? AND Key = ?", [valueStr, session.user.id, key]);
        } else {
            await db.run("INSERT INTO UserData (User_ID, Key, Value) VALUES (?, ?, ?)", [session.user.id, key, valueStr]);
        }

        return NextResponse.json({ success: true, value }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
