import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function GET(request: NextRequest) {
    try {
        const key = request.nextUrl.searchParams.get("key");
        if (!key) {
            return NextResponse.json({ error: "missing key" }, { status: 400 });
        }

        const token = request.cookies.get("auth-token")?.value;
        if (!token) {
            return NextResponse.json({ value: null }, { status: 200 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

        const row = await db.get("SELECT Value FROM UserData WHERE User_ID = ? AND Key = ?", [decoded.userId, key]);

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
        const token = request.cookies.get("auth-token")?.value;
        if (!token) {
            return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const body = await request.json();
        const { key, value } = body as { key?: string; value: any };

        if (!key) {
            return NextResponse.json({ error: "missing key" }, { status: 400 });
        }

        const valueStr = JSON.stringify(value);

        const existing = await db.get("SELECT 1 FROM UserData WHERE User_ID = ? AND Key = ?", [decoded.userId, key]);
        if (existing) {
            await db.run("UPDATE UserData SET Value = ? WHERE User_ID = ? AND Key = ?", [valueStr, decoded.userId, key]);
        } else {
            await db.run("INSERT INTO UserData (User_ID, Key, Value) VALUES (?, ?, ?)", [decoded.userId, key, valueStr]);
        }

        return NextResponse.json({ success: true, value }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: "server error" }, { status: 500 });
    }
}
