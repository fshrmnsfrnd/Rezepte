'use client'
import React, { Suspense, useEffect, useState } from "react";
import {
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion"
import { MostUsedIngredients } from "@/components/MostUsedIngredients";
import Header from "@/components/Header"

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
            <Header/>
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