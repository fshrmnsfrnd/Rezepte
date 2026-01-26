import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export async function saveUserData(key: string, value: string) {
    console.log("Saving user data:", key, value);
    //Save to DB (API checks if Authenticated)
    try {
        const res = await fetch('/api/user/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key, value: value })
        });

        // If server responded non-ok (e.g. 401 when not authenticated), fallback to cookie
        if (!res.ok) {
            console.log('Server save failed (status', res.status, '). Falling back to cookie.');
            try {
                const d = new Date();
                const days = 30;
                d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
                const expires = 'expires=' + d.toUTCString();
                document.cookie = `${key}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
            } catch (ex) { }
        }
    } catch (e) {
        // Network or other error — fallback to cookie
        console.log('Network error while saving to server, saving to cookie instead.', e);
        try {
            const d = new Date();
            const days = 30;
            d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
            const expires = 'expires=' + d.toUTCString();
            document.cookie = `${key}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=Lax`;
        } catch (ex) { }
    }
}

export async function getUserData(key: string): Promise<Array<any> | undefined> {
    let value: Array<any> = [];
    //Get from Cookie
    try {
        const cookies = document.cookie ? document.cookie.split('; ') : [];
        const found = cookies.find(c => c.startsWith(key + '='));
        if (!found) throw new Error("Not found in cookies");
        let raw = decodeURIComponent(found.split('=').slice(1).join('='));
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                value = parsed;
            }
        }
    } catch (e) {}
    //Get from DB (API checks if Authenticated) — prefer DB value when present
    try {
        const res = await fetch(`/api/user/data?key=${encodeURIComponent(key)}`);
        if (res.ok) {
            const j = await res.json();
            if (j && typeof j.value !== 'undefined' && j.value !== null) {
                let parsed = j.value;
                if (typeof parsed === 'string') {
                    try { parsed = JSON.parse(parsed); } catch (e) { }
                }
                if (Array.isArray(parsed)) {
                    value = parsed;
                }
            }
        }
    } catch (e) { }
    return value;
}