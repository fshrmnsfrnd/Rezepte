"use client"
import "./landingpage.css";

export default function Header(){
    return (
        <header className="header">
            <div id="firstLine">
                <a href="/"><h1 className="h1">Rezepte</h1></a>
                <a
                    id="shoppingList"
                    onClick={() => { window.location = `/shoppingList` as string & Location; }}
                    role="button"
                    style={{ margin: "6px 6px 6px auto" }}
                >
                    Einkaufsliste
                </a>
                <a
                    id="statsButton"
                    onClick={() => { window.location = `/stats` as string & Location; }}
                    role="button"
                    style={{ margin: "6px" }}
                >
                    Statistiken
                </a>
                <a
                    id="userButton"
                    onClick={() => { window.location = `/user` as string & Location; }}
                    role="button"
                    style={{ margin: "6px" }}
                >
                    Account
                </a>
            </div>
        </header>
    );
}
