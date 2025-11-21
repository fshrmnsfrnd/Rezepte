import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const ids = Array.isArray(body) ? body : body?.ingredient_ids || body?.ids;

        if (!Array.isArray(ids)) {
            return NextResponse.json({ error: 'Expected an array of ingredient IDs' }, { status: 400 });
        }

        // Normalize ids to integers and remove duplicates
        const providedIds = Array.from(new Set(ids
            .map((v: any) => { const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null; })
            .filter((v: number | null) => v !== null)));
        
        //For later implementation of functionality
        const acceptMissingIngredients = 0;

        const sql = `
            SELECT CI.Cocktail_ID, CI.Ingredient_ID
            FROM Cocktail_Ingredient CI
            WHERE CI.Optional = 0
            ORDER BY CI.Cocktail_ID;
        `;

        const dbRes = await db.all(sql);

        let cocktailMap = new Map<number, number[]>();

        for (const row of dbRes) {
            const currCID = Number(row.Cocktail_ID);
            const currIID = Number(row.Ingredient_ID);
            if(cocktailMap.has(currCID)){
                cocktailMap.get(currCID)?.push(currIID);
            }else{
                cocktailMap.set(currCID, [currIID]);
            }
        }

        const cocktailIds = new Array<number>;

        for (const [cid, iids] of cocktailMap) {
            let ingredientsNotProvided: number = 0;
            for (const iid of iids) {
                if (!providedIds.includes(iid)) {
                    ingredientsNotProvided += 1;
                }
            }
            if(ingredientsNotProvided <= acceptMissingIngredients){
                cocktailIds.push(cid);
            }
        }

        return NextResponse.json(cocktailIds);
    } catch (ex) {
        console.error('Error in cocktailsFilteredByIngredients', ex);
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
