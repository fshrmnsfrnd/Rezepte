import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { } from "@/lib/dbUtils";

export async function POST(req: NextRequest) {
    // No Authorization because it doesnt write on the Server and Database
    
    try {
        //Get Param
        const body = await req.json();
        const ids = Array.isArray(body) ? body : body?.ids;

        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'Expected an array of category IDs' }, { status: 400 });
        }

        const providedIds = Array.from(new Set(ids
            .map((v: any) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; })
            .filter((v: number | null) => v !== null)));

        //Get the Recipe
        const dbRes = await db.all(`
            SELECT RC.Recipe_ID, RC.Category_ID
            FROM Recipe_Category RC
            ORDER BY RC.Recipe_ID;
        `);

        let recipeMap = new Map<number, number[]>();

        for (const row of dbRes) {
            const currRID = Number(row.Recipe_ID);
            const currCID = Number(row.Category_ID);
            if (recipeMap.has(currRID)){
                recipeMap.get(currCID)?.push(currCID);
            }else{
                recipeMap.set(currRID, [currCID]);
            }
        }

        const recipeIds: number[] = new Array<number>;

        for (const [rId, caIds] of recipeMap) {
            for (const currCId of caIds) {
                if (providedIds.includes(currCId) ) {
                    recipeIds.push(rId);
                }
            }
        }

        return NextResponse.json(recipeIds);
    } catch (ex) {
        console.error('Error in recipesFilteredByCategorys', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
