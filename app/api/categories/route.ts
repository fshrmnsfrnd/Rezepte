import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
    const sql = `
        SELECT DISTINCT c.Category_ID, c.Name
        FROM Category c
        JOIN Recipe_Category rc
            ON c.Category_ID = rc.Category_ID
        ORDER BY c.Name ASC;
    `;
    
    const categories = await db.all(sql);
    return NextResponse.json(categories);
}