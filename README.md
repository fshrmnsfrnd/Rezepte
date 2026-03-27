# Recipes

Kurze, lokale Next.js-Anwendung zum Anzeigen und Verwalten von Rezepten.

Dieses Repository enthält eine kleine Next.js App mit:
- einer Such-/Filter-UI
- JSON/Markdown-Importen für Rezepte
- Benutzer-Authentication mit better-auth (Email/Password + Username)
- Persistierung von Benutzerauswahlen in SQLite

---

## Docker Compose (empfohlen)

```yaml
services:
  recipes:
    container_name: recipes
    image: fshrmnsfrnd/recipes:latest
    ports:
        - 3000:3000
    volumes:
        - /path/to/md/recipes:/app/resources/Markdown
        - ./db.db:/app/db.db
        - ./betterAuth.db:/app/betterAuth.db
    environment:
        - BETTER_AUTH_SECRET=YOUR_SECRET_HERE
        - BETTER_AUTH_URL=http://localhost:3000 # Base URL of your app
    restart: always
```

---

## Developer-Übersicht

Wesentliche Ordner und Dateien:

- `app/` – Next.js App-Router-Ordner
	- `page.tsx` – Startseite
	- `api/` – Backend-Routen (z. B. `recipes`, `ingredients`, `user/data`)
	- `layout.tsx` – Root Layout mit SessionProvider
	- `Providers.tsx` – Client-Provider für SessionProvider
- `components/` – React-Komponenten
	- `Login.tsx` – Login/Registrierungs-Box
	- `Header.tsx` – Header mit Auth-Status
	- weitere: `AllRecipes.tsx`, `IngredientList.tsx`, ...
- `lib/` – Hilfsbibliotheken
	- `auth.ts` – Better-Auth Server-Instanz
	- `auth-client.ts` – Better-Auth Client-Instanz (mit dynamischer baseURL)
	- `db.ts` – SQLite-Wrapper mit Migration-System
- `migrations/` – SQL-Migrationsdateien (führen sich automatisch aus)
- `resources/json/` und `Markdown/` – Rohdaten für Rezepte
- `tools/` – Skripte zum Überwachen und Importieren
- `app/globals.css` – globale Styles
- `components/landingpage.css` – Komponenten-spezifische Styles

---

## Authentication mit better-auth

### Übersicht

Die App nutzt [better-auth](https://better-auth.com) für Email/Password + Username-basierte Authentication.

- **Server-Side Session:** `lib/auth.ts` verwaltet die Auth-Logik
- **Client-Side Session:** `lib/auth-client.ts` mit React-Hook `useSession()` 
- **SessionProvider:** In `app/Providers.tsx` – wrapet die ganze App für globalen Session-Zugriff

### Login Component

- Datei: [components/Login.tsx](components/Login.tsx)
- Handelt Sign-In, Sign-Up und Sign-Out
- Zeigt Benutzernamen nach erfolgreichem Login
- Wird im Header als Modal/Overlay angezeigt

### Session in der App

**Client-Components:**
```tsx
import { useSession } from "@/lib/auth-client";

export function MyComponent() {
    const { data: session, isPending } = useSession();
    
    if (!session?.user) return <p>Nicht angemeldet</p>;
    return <p>Hallo {session.user.name || session.user.username}</p>;
}
```

**Server-Routes:**
```tsx
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // ...
}
```

### Datenbanken

- **Rezepte & Zutaten:** `db.db` (SQLite)
- **Authentication:** `betterAuth.db` (Better-Auth User/Session-Storage)

---

## Datenbank-Migrationen

Das System nutzt ein einfaches Migrationssystem:

1. **Automatisches Tracking:** Alle Migrationen werden in der `migrations` Tabelle verzeichnet
2. **SQL-Dateien:** Im `migrations/` Ordner, alphabetisch sortiert (z. B. `001_initial.sql`, `002_add_column.sql`)
3. **Execution:** Beim App-Start laufen alle neuen Migrationen automatisch aus

### Neue Migration hinzufügen:

Datei `migrations/003_add_created_at.sql` erstellen:
```sql
-- Migration: 003_add_created_at.sql
ALTER TABLE Recipe ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

Beim nächsten App-Start wird die Migration automatisch ausgeführt.

---

## APIs / Backend-Routen

### GET /api/allRecipes
- **Beschreibung:** Gibt eine Liste aller Recipes zurück.
- **Parameter:** Keine.
- **Antwort:** JSON-Array mit Recipe-Objekten.

### GET /api/ingredients
- **Beschreibung:** Gibt eine Liste aller Zutaten zurück.
- **Parameter:** Keine.
- **Antwort:** JSON-Array mit Zutaten-Objekten.

### GET /api/categories
- **Beschreibung:** Gibt eine Liste aller Kategorien zurück.
- **Parameter:** Keine.
- **Antwort:** JSON-Array mit Kategorie-Objekten.

### POST /api/recipesFilteredByIngredients
- **Beschreibung:** Gibt Recipes zurück, die bestimmte Zutaten enthalten.
- **Parameter:**
  - `ingredients` (erforderlich, Array): Liste der Zutaten.
- **Antwort:** JSON-Array mit passenden Recipe IDs.

### POST /api/recipesFilteredByCategories
- **Beschreibung:** Gibt Recipes zurück, die in den Kategorien enthalten sind.
- **Parameter:**
  - `categories` (erforderlich, Array): Liste der Kategorien.
- **Antwort:** JSON-Array mit passenden Recipe IDs.

### GET/POST /api/user/data
- **Beschreibung:** Benutzerdaten lesen/schreiben (erfordert Authentifizierung).
- **Parameter (GET):**
  - `key` (erforderlich, Query): Der Daten-Key.
- **Parameter (POST):**
  - `key` (erforderlich): Der Daten-Key.
  - `value` (erforderlich): Der Daten-Wert.
- **Antwort:** `{ value: any }` oder Fehler.
- **Authentifizierung:** Nutzt Better-Auth Session aus Cookies.

---

## Styling

Globaler Stil: `app/globals.css`. 
Komponenten-spezifische Anpassungen: `components/landingpage.css`.

Header-Layout: Im Querformat zwei `.showArea`-Boxen (Zutaten, Recipes); im Hochformat Umschaltung per Klick.

---

## Daten & Import

__Es muss mindestens eine Zutat und der Name enthalten sein.__

### Markdown Format
Der Dateiname ist der Name des Rezepts
```markdown
---
Kategorie:
	- Kategorie1
---
>Beschreibung
# Zutaten
---

| Menge  | Zutat             |
| ------ | ----------------- |
| 2.5 cl | Zutat1            |
| 10 oz  | Zutat2 (optional) |

# Zubereitung
---
1. Step nr. 1
```

### JSON Format
Der Dateiname ist wieder der Name des Rezepts
```json
{
    "recipe_id": null,
    "recipe_name": "recipeName",
    "recipe_description": "Beschreibung",
    "categories": [
        {
            "category_id": null,
            "category_name": "KategorieName"
        }
    ],
    "ingredients": [
        {
            "ingredient_name": "NameZutat1",
            "amount": 5,
            "unit": "cl",
            "optional": false
        }
    ],
    "steps": [
        {
            "step_number": 1,
            "instruction": "Instruktion Step 1"
        }
    ]
}
```

Rohdaten liegen in `resources/json` (JSON) und `resources/Markdown/` (Markdown-Rezepte). Die `tools/`-Skripte überwachen diese Ordner und importieren Änderungen automatisch in die SQLite-Datenbank.

---

Alles Open Source
