export type User = {
  user_ID?: number;
  username: string;
  password: string;
};

export async function checkSession(): Promise<{ authenticated: boolean; username?: string; userId?: number }> {
  try {
    const response = await fetch("/api/auth/session");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Check session error:", error);
    return { authenticated: false };
  }
}

export async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Register error:", error);
    return { success: false, error: "Fehler bei der Registrierung" };
  }
}

export async function login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Fehler bei der Anmeldung" };
  }
}

export async function logout(): Promise<{ success: boolean }> {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    return { success: response.ok };
  } catch (error) {
    console.error("Logout error:", error);
    return { success: false };
  }
}