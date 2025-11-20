import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    const cocktails = await db.all("SELECT Cocktail_ID, Name, Description FROM Cocktail");
    return NextResponse.json(cocktails)
}