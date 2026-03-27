import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"

function resolveBaseURL(): string | undefined {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (typeof window !== "undefined") return window.location.origin;
    return undefined;
}

export const authClient = createAuthClient({
    baseURL: resolveBaseURL(),
    plugins: [
        usernameClient(),
    ]
})

export const { useSession } = authClient;