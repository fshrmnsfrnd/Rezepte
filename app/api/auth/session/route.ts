import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: number;
      username: string;
    };

    return NextResponse.json(
      { authenticated: true, userId: decoded.userId, username: decoded.username },
      { status: 200 }
    );
  } catch (error) {
    // Token is invalid or expired
    return NextResponse.json(
      { authenticated: false },
      { status: 200 }
    );
  }
}
