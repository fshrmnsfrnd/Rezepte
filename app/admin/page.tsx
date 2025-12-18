'use client'
import React, { useEffect, useState } from "react";

function base64urlToBuffer(base64url: string) {
    const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
    const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const buffer = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) buffer[i] = raw.charCodeAt(i);
    return buffer.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let str = "";
    for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
    const base64 = btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return base64;
}

export default function RecipeDetail() {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        checkSession();
    }, []);

    async function checkSession() {
        const res = await fetch("/api/admin/session");
        const j = await res.json();
        setAuthenticated(!!j.authenticated);
    }

    async function createPasskey() {
        try {
            const res = await fetch("/api/admin/options", { method: "POST", body: JSON.stringify({ type: "register" }), headers: { "Content-Type": "application/json" } });
            if (res.status === 401) return alert("Bitte zuerst anmelden");
            const j = await res.json();
            const { options, sessionId } = j;

            // convert challenge and allowCredentials ids
            options.challenge = base64urlToBuffer(options.challenge);
            if (options.user && options.user.id) options.user.id = base64urlToBuffer(options.user.id);
            if (options.excludeCredentials) {
                options.excludeCredentials = options.excludeCredentials.map((c: any) => ({ ...c, id: base64urlToBuffer(c.id) }));
            }

            // navigator create
            // @ts-ignore
            const cred: any = await navigator.credentials.create({ publicKey: options });

            const attestationId = typeof cred.id === "string" ? cred.id : bufferToBase64url(cred.rawId);
            const attestation = {
                id: attestationId,
                rawId: bufferToBase64url(cred.rawId),
                response: {
                    clientDataJSON: bufferToBase64url(cred.response.clientDataJSON),
                    attestationObject: bufferToBase64url(cred.response.attestationObject),
                },
                type: cred.type,
            };

            const verifyRes = await fetch("/api/admin/verify", { method: "POST", body: JSON.stringify({ type: "register", sessionId, attestation }), headers: { "Content-Type": "application/json" } });
            const vj = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vj.error || "Registration failed");
            alert("Passkey erstellt");
            checkSession();
        } catch (e: any) {
            alert(String(e));
        }
    }

    async function login() {
        try {
            const res = await fetch("/api/admin/options", { method: "POST", body: JSON.stringify({ type: "login" }), headers: { "Content-Type": "application/json" } });
            const j = await res.json();
            if (!res.ok) return alert(j.error || "Keine Credentials");
            const { options, sessionId } = j;

            options.challenge = base64urlToBuffer(options.challenge);
            if (options.allowCredentials) options.allowCredentials = options.allowCredentials.map((c: any) => ({ ...c, id: base64urlToBuffer(c.id) }));

            // @ts-ignore
            const assertion: any = await navigator.credentials.get({ publicKey: options });

            const assertionId = typeof assertion.id === "string" ? assertion.id : bufferToBase64url(assertion.rawId);
            const payload = {
                id: assertionId,
                rawId: bufferToBase64url(assertion.rawId),
                response: {
                    clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
                    authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
                    signature: bufferToBase64url(assertion.response.signature),
                    userHandle: assertion.response.userHandle ? bufferToBase64url(assertion.response.userHandle) : null,
                },
                type: assertion.type,
            };

            const verifyRes = await fetch("/api/admin/verify", { method: "POST", body: JSON.stringify({ type: "login", sessionId, assertion: payload }), headers: { "Content-Type": "application/json" } });
            const vj = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vj.error || "Login failed");
            setAuthenticated(true);
            alert("Angemeldet");
        } catch (e: any) {
            alert(String(e));
        }
    }

    async function logout() {
        await fetch("/api/admin/logout", { method: "POST" });
        setAuthenticated(false);
    }

    return (
        <div>
            <header className="header">
                <a href="/"><h1 className="h1">Rezepte Admin</h1></a>
            </header>
            {authenticated == null && (<div>Loading...</div>)}
            {!authenticated && (
                <div>
                    <button onClick={createPasskey} className={"button"}>Passkey erstellen</button>
                    <button onClick={login} className={"button"}>Mit Passkey anmelden</button>
                </div>
            )}
            {authenticated && (<div>Authenticated <button onClick={logout} className={"button"}>Abmelden</button> </div>)}

        </div>
    );
}