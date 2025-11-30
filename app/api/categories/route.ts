import { NextResponse } from "next/server";
import { getCategories } from '@/lib/dbUtils';

export async function GET(request: Request) {
    const categories = await getCategories();
    return NextResponse.json(categories);
}