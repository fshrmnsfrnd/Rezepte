import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"
import { resolveBaseURL } from "./utils";

export const authClient = createAuthClient({
    baseURL: resolveBaseURL(),
    plugins: [
        usernameClient(),
    ]
})

export const { useSession } = authClient;