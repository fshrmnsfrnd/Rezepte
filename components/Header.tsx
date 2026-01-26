"use client";

import { useMemo, useState, useEffect, type ComponentType } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BarChart3, Menu, ShoppingBasket, UserRound, X } from "lucide-react";
import "./landingpage.css";

type NavLink = {
    href: string;
    label: string;
    Icon: ComponentType<{ size?: number; className?: string }>;
};

export default function Header() {
    const [authed, setAuthed] = useState<boolean>(false);

    // Check user session for DB-backed persistence
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/auth/session');
                const j = await res.json();
                setAuthed(!!j.authenticated);
            } catch { }
        })();
    }, []);

    const links = useMemo<NavLink[]>(() => [
        { href: "/shoppingList", label: "Einkaufsliste", Icon: ShoppingBasket },
        { href: "/stats", label: "Statistiken", Icon: BarChart3 },
        { href: "/user", label: "Account", Icon: UserRound }
    ], []);

    const [open, setOpen] = useState(false);

    return (
        <header className="header">
            <div id="firstLine">
                <a href="/"><h1 className="h1">Rezepte</h1></a>

                <nav className="nav-links" aria-label="Hauptnavigation">
                    {links.map(({ href, label }) => (
                        <a key={href} className="nav-link" href={href}>
                            {label}
                        </a>
                    ))}
                </nav>

                <Dialog.Root open={open} onOpenChange={setOpen}>
                    <Dialog.Trigger asChild>
                        <button
                            type="button"
                            className="burger-button"
                            aria-label="Navigation öffnen"
                        >
                            <Menu size={20} />
                        </button>
                    </Dialog.Trigger>

                    <Dialog.Portal>
                        <Dialog.Overlay className="sheet-overlay" />
                        <Dialog.Content className="sheet-content" aria-label="Navigation">
                            <div className="sheet-header">
                                <span className="sheet-title">Menü</span>
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="burger-close"
                                        aria-label="Navigation schließen"
                                    >
                                        <X size={18} />
                                    </button>
                                </Dialog.Close>
                            </div>

                            <nav className="sheet-nav" aria-label="Navigation portrait">
                                {links.map(({ href, label, Icon }) => (
                                    <a
                                        key={href}
                                        className="sheet-link"
                                        href={href}
                                        onClick={() => setOpen(false)}
                                    >
                                        <Icon size={18} aria-hidden />
                                        <span>{label}</span>
                                    </a>
                                ))}
                            </nav>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
        </header>
    );
}
