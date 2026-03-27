import { betterAuth } from "better-auth"
import Database from "better-sqlite3"
import { username } from "better-auth/plugins"

function resolveBaseURL(): string | undefined {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (typeof window !== "undefined") return window.location.origin;
    return undefined;
}

export const auth = betterAuth({
    "database": new Database("betterAuth.db"),
    "baseURL": resolveBaseURL(),
    "emailAndPassword": { 
        "enabled": true,
        "autoSignIn": true,
    },
    "plugins": [ 
        username(),
    ],
    "session": {
        "expiresIn": 60 * 60 * 24 * 7 * 4, // 4 Weeks
        "updateAge": 60 * 60 * 24, //1 Day
        "freshAge": 0, // Check Disabled
    }
})