import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    const recipes = await db.all("SELECT Recipe_ID, Name, Description FROM Recipe ORDER BY Name");
    return NextResponse.json(recipes)
}