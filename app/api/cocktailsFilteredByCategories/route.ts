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

        //Get the Cocktails
        const dbRes = await db.all(`
            SELECT cc.Cocktail_ID, cc.Category_ID
            FROM Cocktail_Category cc
            ORDER BY cc.Cocktail_ID;
        `);

        let cocktailMap = new Map<number, number[]>();

        for (const row of dbRes) {
            const currCoID = Number(row.Cocktail_ID);
            const currCaID = Number(row.Category_ID);
            if(cocktailMap.has(currCoID)){
                cocktailMap.get(currCoID)?.push(currCaID);
            }else{
                cocktailMap.set(currCoID, [currCaID]);
            }
        }

        const cocktailIds: number[] = new Array<number>;

        for (const [coId, caIds] of cocktailMap) {
            for (const currCaId of caIds) {
                if (providedIds.includes(currCaId) ) {
                    cocktailIds.push(coId);
                }
            }
        }

        return NextResponse.json(cocktailIds);
    } catch (ex) {
        console.error('Error in cocktailsFilteredByCocktails', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
