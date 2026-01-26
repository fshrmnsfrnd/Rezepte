'use client'
import Header from "@/components/Header"
import React, { useEffect, useState } from "react";
import Login from "@/components/Login"

export default function UserAuthPage() {
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

    return (
        <div>
            <Header />
            <div className="login-page">
                {authed === null && (<div>Loading...</div>)}
                {authed === false && (
                    <Login />
                )}
            </div>
        </div>
    );
}
