'use client'
import React, { Suspense, useEffect, useState } from "react";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion"
import { MostUsedIngredients } from "@/components/MostUsedIngredients";

export default function StatsWrapper(){
    return(
        <Suspense fallback={<div>Loading Stats</div>}>
            <Stats />
        </Suspense>
    )
}

export function Stats() {
    return (
        <div>
            <header className="header">
            <a href="/"><h1 className="h1">Rezepte</h1></a>
            </header>
            <div className="stats">
                <Accordion type="multiple">
                    <AccordionItem value="mostUsedIngredients">
                        <AccordionTrigger className="text-2xl">Meist genutzte Zutaten</AccordionTrigger>
                        <AccordionContent>
                            <MostUsedIngredients />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}