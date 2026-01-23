'use client'
import React, { useEffect, useState } from "react";
import Header from "@/components/Header"
import { checkSession, register, login, logout } from "@/lib/UserDAO"

export default function UserAuthPage() {
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const [currentUsername, setCurrentUsername] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [message, setMessage] = useState<string>("");

    useEffect(() => {
        checkSessionStatus();
    }, []);

    async function checkSessionStatus() {
        const result = await checkSession();
        setAuthenticated(result.authenticated);
        if (result.authenticated && result.username) {
            setCurrentUsername(result.username);
        }
    }

    async function handleRegister() {
        setError("");
        setMessage("");
        const result = await register(username, password);
        if (result.success) {
            setMessage("Registrierung erfolgreich! Bitte melde dich an.");
            setUsername("");
            setPassword("");
        } else {
            setError(result.error || "Fehler bei der Registrierung");
        }
    }

    async function handleLogin() {
        setError("");
        setMessage("");
        const result = await login(username, password);
        if (result.success) {
            setAuthenticated(true);
            setCurrentUsername(username);
            setUsername("");
            setPassword("");
        } else {
            setError(result.error || "Fehler bei der Anmeldung");
        }
    }

    async function handleLogout() {
        const result = await logout();
        if (result.success) {
            setAuthenticated(false);
            setCurrentUsername("");
        }
    }

    return (
        <div>
            <Header />
            <div className="login-box">
                
                {authenticated === null && (<div>Loading...</div>)}
                {authenticated === false && (
                    <div>
                        <h2>Anmeldung / Registrierung</h2>
                        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
                        {message && <div style={{ color: 'green', marginBottom: '10px' }}>{message}</div>}
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '10px' }}>
                            <input 
                                placeholder="Benutzername" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                            />
                            <input 
                                type="password"
                                placeholder="Passwort" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleLogin();
                                    }
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={handleRegister} className={"button"}>Registrieren</button>
                            <button onClick={handleLogin} className={"button"}>Anmelden</button>
                        </div>
                    </div>
                )}
                {authenticated && (
                    <div>
                        <h2>Willkommen, {currentUsername}!</h2>
                        <button onClick={handleLogout} className={"button"}>Abmelden</button>
                    </div>
                )}
            </div>
        </div>
    );
}
