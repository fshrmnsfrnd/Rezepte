import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: "Benutzername und Passwort sind erforderlich" },
                { status: 400 }
            );
        }

        // Find user
        const user = await db.get(
            "SELECT * FROM User WHERE Username = ?",
            [username]
        );

        if (!user) {
            return NextResponse.json(
                { error: "Ungültige Anmeldedaten" },
                { status: 401 }
            );
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.Password);

        if (!isValid) {
            return NextResponse.json(
                { error: "Ungültige Anmeldedaten" },
                { status: 401 }
            );
        }

        if (!JWT_SECRET) {
            console.error("JWT_SECRET is not set");
            return NextResponse.json(
                { error: "Serverkonfiguration fehlt" },
                { status: 500 }
            );
        }

        // Create JWT token
        const token = jwt.sign(
            { userId: user.User_ID, username: user.Username },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Create response with cookie
        const response = NextResponse.json(
            { message: "Anmeldung erfolgreich", username: user.Username },
            { status: 200 }
        );

        response.cookies.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Fehler bei der Anmeldung" },
            { status: 500 }
        );
    }
}
