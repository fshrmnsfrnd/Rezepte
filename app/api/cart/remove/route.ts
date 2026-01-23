import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { item } = await request.json();

    if (!item) {
      return NextResponse.json(
        { error: "Item ist erforderlich" },
        { status: 400 }
      );
    }

    await db.run(
      "DELETE FROM User_Cart WHERE User_ID = ? AND Item = ?",
      [decoded.userId, item]
    );

    return NextResponse.json(
      { message: "Item aus Warenkorb entfernt" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Remove from cart error:", error);
    return NextResponse.json(
      { error: "Fehler beim Entfernen aus Warenkorb" },
      { status: 500 }
    );
  }
}
