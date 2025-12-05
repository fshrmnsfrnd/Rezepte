# Recipes

Kurze, lokale Next.js-Anwendung zum Anzeigen und Verwalten von Recipe-Rezepten.

Dieses Repository enthält eine kleine Next.js App mit:
- einer Such-/Filter-UI
- JSON/Markdown-Importen für Rezepte

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
    environment:
      - EXT_API_KEY=Your_API_Key_Here
    restart: always
```

---

## Developer-Übersicht / Projektstruktur

Wesentliche Ordner und Dateien:

- `app/` – Next.js App-Router-Ordner
	- `page.tsx` – Startseite
	- `api/` – Backend-Routen (z. B. `recipes`, `ingredients`, `recipesFilteredByIngredients`)
- `components/` – React-Komponenten (`AllRecipes.tsx`, `IngredientList.tsx`, ...)
- `resources/json/` und `Markdown/` – Rohdaten (JSON & Markdown-Dateien für Rezepte)
- `lib/` – kleine Hilfsbibliotheken, z. B. `db.ts` (SQLite-Wrapper)
- `tools/` – Skripte zum Überwachen und Importieren (`watch-json-importer.js`, `watchMarkdown.js`)
- `app/globals.css` – globale Styles
- `components/landingpage.css` – Komponenten-spezifische Styles

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
  - `ingredients` (erforderlich, Array von Strings): Liste der Zutaten.
- **Antwort:** JSON-Array mit passenden Recipe IDs.

### POST /api/recipesFilteredByCategories
- **Beschreibung:** Gibt Recipes zurück, die in den Kategorien sind enthalten.
- **Parameter:**
  - `categories` (erforderlich, Array von Strings): Liste der Kategorien.
- **Antwort:** JSON-Array mit passenden Recipe IDs.

### POST /api/recipesFilteredByCategories
- **Beschreibung:** Gibt Recipes zurück, die die zutaten enthalten.
- **Parameter:**
  - `ids` (erforderlich): Liste der Zutaten IDs.
- **Antwort:** JSON-Array mit passenden Recipe IDs.

### POST /api/import-recipe
- **Beschreibung:** Importiert ein neues Recipe-Rezept.
- **Parameter:**
  - `API_KEY` (erforderlich, Header): Authentifizierungsschlüssel.
  - `recipe` (erforderlich, JSON): Das Rezept als JSON-Objekt.
- **Antwort:** Bestätigung des Imports oder Fehlermeldung.

---

## Styling

Globaler Stil: `app/globals.css`. 
Komponenten-spezifische Anpassungen: `components/landingpage.css`.

Header-Layout: Die Startseite nutzt im Header zwei `.showArea`-Boxen ("Zutaten" und "Recipes"). Im Querformat fungieren sie als Überschriften für jeweils die darunterliegenden Komponenten; im Hochformat kann der Nutzer per Klick auswählen, welche Komponente angezeigt wird (die andere wird nur ausgeblendet).

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
        },
        {
            "ingredient_name": "NameZutat2",
            "amount": 15,
            "unit": "etwas",
            "optional": true
        }
    ],
    "steps": [
		{
            "step_number": 1,
            "instruction": "Instruktion Step 1"
        },
        {
            "step_number": 2,
            "instruction": "Instruktion Step 2"
        }
	]
}
```

Rohdaten liegen in `resources/json` (JSON-Dateien) und `Markdown/` (Markdown-Rezepte). Die `tools/`-Skripte überwachen diese Ordner und importieren Änderungen in die SQLite-Datenbank.

Hinweis zur Sicherheit: Der Import-Endpunkt (`/api/import-recipe`) kann mit einem `API_KEY` geschützt werden. Die Watch-Skripte (z. B. `tools/watch-json-importer.js`) lesen `API_KEY` aus der Umgebung (z. B. `.env.local`) und senden ihn als Header beim Posten. Wenn auf dem Server kein `API_KEY` gesetzt ist, wird die Authentifizierung im lokalen/dev-Setup übersprungen, damit lokale Importe unkompliziert funktionieren. In Produktionsumgebungen sollte `API_KEY` gesetzt werden, um den Endpunkt zu schützen.

Wenn du Daten manuell importieren willst, schau dir `tools/watch-json-importer.js` und `tools/watchMarkdown.js` an; du kannst die Logik auch direkt ausführen, z. B.: `node tools/watch-json-importer.js`.

Die SQLite-Datei liegt (im Development) typischerweise als `db.db` im Projekt-Root.

---

Alles Open Source