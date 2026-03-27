'use client'
import React, { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useSession } from "@/lib/auth-client";
import "./Login.css"

export default function Login({ loggedInObserver = () => { } }) {
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [emailOrUsername, setEmailOrUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const {data: session} = useSession();

    useEffect(() => {
        if (session) loggedInObserver();
    }, [session]);

    async function handleSignUp(email: string, password: string, username: string, callbackURL: string = "/") {
        await authClient.signUp.email({
            "email": email,
            "password": password,
            "name": username,
            "username": username,
            //"callbackURL": callbackURL,
        }, {
            onRequest: () => setLoading(true),
            onSuccess: () => {
                setInfo("Registrierung erfolgreich");
                handleSignIn(email, password)
            },
            onError: (ctx) => {
                setError(ctx.error.message);
            },
        })
    }

    async function handleSignIn(email: string, password: string, callbackURL: string = "/") {
        const validateMail: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
        if (validateMail.test(email)) {
            await authClient.signIn.email({
                "email": email,
                "password": password,
                //"callbackURL": callbackURL,
                "rememberMe": true,
            }, {
                onRequest: () => setLoading(true),
                onSuccess: () => {
                    setInfo("Angemeldet.");
                },
                onError: (ctx) => {
                    setError(ctx.error.message);
                },
            })
        } else {
            await authClient.signIn.username({
                "username": email,
                "password": password,
            }, {
                onRequest: () => setLoading(true),
                onSuccess: () => {
                    setInfo("Angemeldet.");
                },
                onError: (ctx) => {
                    setError(ctx.error.message);
                },
            })
        }
    }

    async function handleSignOut() {
        await authClient.signOut()
    }

    return (
        <div className="login-shell">
            <div className="login-card">
                {!session?.user.id && (
                    <div>
                        <div className="login-header">
                            <div className="pill-group">
                                <button
                                    className={`pill ${mode === "signin" ? "active" : ""}`}
                                    onClick={() => { setMode("signin"); setError(null); setInfo(null); }}
                                    type="button"
                                >
                                    Anmelden
                                </button>
                                <button
                                    className={`pill ${mode === "signup" ? "active" : ""}`}
                                    onClick={() => { setMode("signup"); setError(null); setInfo(null); }}
                                    type="button"
                                >
                                    Registrieren
                                </button>
                            </div>
                        </div>

                        <form
                            className="form"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                setError(null);
                                setInfo(null);
                                setLoading(true);
                                try {
                                    if (mode === "signin") {
                                        await handleSignIn(emailOrUsername, password);
                                    } else {
                                        await handleSignUp(emailOrUsername, password, username);
                                    }
                                } catch (err: unknown) {
                                    const message = err instanceof Error ? err.message : "Unerwarteter Fehler";
                                    setError(message);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            <label className="field">
                                <span>{mode === "signin" ? "E-Mail oder Benutzername" : "E-Mail"}</span>
                                <input
                                    type="text"
                                    placeholder={mode === "signin" ? "hi@example.com oder username" : "hi@example.com"}
                                    value={emailOrUsername}
                                    onChange={(e) => setEmailOrUsername(e.target.value)}
                                    required
                                />
                            </label>

                            {mode === "signup" && (
                                <label className="field">
                                    <span>Benutzername</span>
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </label>
                            )}

                            <label className="field">
                                <span>Passwort</span>
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </label>

                            <button className="primary" type="submit" disabled={loading}>
                                {loading ? "Loading..." : mode === "signin" ? "Anmelden" : "Registrieren"}
                            </button>
                        </form>

                        <div className="status-line">
                            {error && <span className="error">{error}</span>}
                            {info && <span className="info">{info}</span>}
                        </div>
                    </div>
                )}

                {session?.user.id && (
                    <div>
                        <h2>Hallo {session?.user.displayUsername}</h2>
                        <button className="secondary" type="button" onClick={handleSignOut}>
                            Abmelden
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
