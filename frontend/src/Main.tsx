import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AllCocktails from "./components/AllCocktails";
import CocktailDetail from "./components/CocktailDetail";

const root = document.getElementById("root");
if (!root) throw new Error('Root element not found');

function getIdFromUrl(): number | null {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("cocktailID");
    return id ? Number(id) : null;
}

ReactDOM.createRoot(root as HTMLElement).render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<AllCocktails />} />
            <Route path="/recipe" element={<CocktailDetail id={getIdFromUrl()} /> } />
        </Routes>
    </BrowserRouter>
);