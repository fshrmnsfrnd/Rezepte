# Cocktails

Kurze, lokale Next.js-Anwendung zum Anzeigen und Verwalten von Cocktail-Rezepten.

Dieses Repository enthält eine kleine Single-Page/Server-Rendered-App (Next.js) mit:
- einer Such-/Filter-UI nach Zutaten
- JSON/Markdown-Importen für Rezepte
- SQLite als lokale Entwicklungs-Datenbank

---

## Zweck

Die App zeigt eine Liste von Cocktails, erlaubt das Filtern nach Zutaten und zeigt Rezeptdetails. Sie ist als Lern-/Verwaltungsprojekt gedacht und eignet sich als Ausgangspunkt für kleine Content-Apps, die lokal mit SQLite betrieben werden.

---

## Voraussetzungen

- Node.js (empfohlen v18+)
- npm
- optional: Docker & Docker Compose

Die Projekt-Abhängigkeiten sind in `package.json` (Next.js v16, React 19, sqlite3).

---

## Schnellstart (lokal)

1. Repository klonen / in Projektordner wechseln

2. Abhängigkeiten installieren:

```
npm install
```

3. Dev-Server starten (öffnet Next Dev auf `http://localhost:3000`):

```
npm run dev
```

4. Die App ist erreichbar unter `http://localhost:3000`.

Hinweis: Zwei Watch-Scripts (`tools/watchMarkdown.js`, `tools/watch-json-importer.js`) laufen in der `dev`-Kombination und importieren bei Änderungen automatisch Inhalte in die Datenbank.

---

## Docker Compose

Beispiele für `docker-compose`-Setups: ein Development- und ein Production-Beispiel.

Development (schnelles Testen, bind-mounted source):

```yaml
version: '3.8'
services:
	app:
		image: node:20
		working_dir: /usr/src/app
		volumes:
			- ./:/usr/src/app
			- /usr/src/app/node_modules
		ports:
			- '3000:3000'
		command: sh -c "npm install --no-audit --no-fund && npm run dev"
		environment:
			- NODE_ENV=development
```

Production (build + start):

```yaml
services:
  cocktails:
    container_name: cocktails
    image: fshrmnsfrnd/cocktails:latest
    ports:
      - 3000:3000
    volumes:
      - /path/to/md/recipes:/app/resources/Markdown
    restart: always
```

Wichtig: dieses Projekt verwendet SQLite (lokale Datei `db.db`). In Produktions-Setups sollte die DB als Volume gemountet werden oder besser: auf einen Server-basierten DB-Dienst migriert werden.

---

## Developer-Übersicht / Projektstruktur

Wesentliche Ordner und Dateien:

- `app/` – Next.js App-Router-Ordner
	- `page.tsx` – Startseite
	- `api/` – Backend-Routen (z. B. `cocktails`, `ingredients`, `cocktailsFilteredByIngredients`)
- `components/` – React-Komponenten (`AllCocktails.tsx`, `IngredientList.tsx`, ...)
- `resources/json/` und `Markdown/` – Rohdaten (JSON & Markdown-Dateien für Rezepte)
- `lib/` – kleine Hilfsbibliotheken, z. B. `db.ts` (SQLite-Wrapper)
- `tools/` – Skripte zum Überwachen und Importieren (`watch-json-importer.js`, `watchMarkdown.js`)
- `public/` – statische Assets
- `app/globals.css` – globale Styles
- `components/landingpage.css` – Komponenten-spezifische Styles

Wichtige Scripts in `package.json`:

- `npm run dev` — startet Next dev plus die Watch-Skripte (konkurrent)
- `npm run build` — Next.js Production-Build
- `npm start` — Startet den Production-Server (`next start`)

---

## APIs / Backend-Routen

Die App stellt mehrere kleine API-Endpunkte unter `app/api` bereit. Wichtige Endpunkte:

- `GET /api/cocktails` — liefert alle Cocktails
- `POST /api/cocktailsFilteredByIngredients` — nimmt ein Array von Ingredient-IDs und liefert passende Cocktail-IDs
- `GET /api/ingredients` — listet alle verfügbaren Zutaten
- `GET /api/cocktail` — Details zu einem einzelnen Cocktail (via Query param `cocktailID`)

Diese Endpunkte sind in `app/api/*/route.ts` implementiert.

---

## Styling

Globaler Stil: `app/globals.css`. Komponenten-spezifische Anpassungen: `components/landingpage.css`.

Header-Layout: Die Startseite nutzt im Header zwei `.showArea`-Boxen ("Zutaten" und "Cocktails"). Im Querformat fungieren sie als Überschriften für jeweils die darunterliegenden Komponenten; im Hochformat kann der Nutzer per Klick auswählen, welche Komponente angezeigt wird (die andere wird nur ausgeblendet).

---

## Daten & Import

Rohdaten liegen in `resources/json` (JSON-Dateien) und `Markdown/` (Markdown-Rezepte). Die `tools/`-Skripte überwachen diese Ordner und importieren Änderungen in die SQLite-Datenbank.

Hinweis zur Sicherheit: Der Import-Endpunkt (`/api/import-cocktail`) kann mit einem `API_KEY` geschützt werden. Die Watch-Skripte (z. B. `tools/watch-json-importer.js`) lesen `API_KEY` aus der Umgebung (z. B. `.env.local`) und senden ihn als Header beim Posten. Wenn auf dem Server kein `API_KEY` gesetzt ist, wird die Authentifizierung im lokalen/dev-Setup übersprungen, damit lokale Importe unkompliziert funktionieren. In Produktionsumgebungen sollte `API_KEY` gesetzt werden, um den Endpunkt zu schützen.

Wenn du Daten manuell importieren willst, schau dir `tools/watch-json-importer.js` und `tools/watchMarkdown.js` an; du kannst die Logik auch direkt ausführen, z. B.: `node tools/watch-json-importer.js`.

Die SQLite-Datei liegt (im Development) typischerweise als `db.db` im Projekt-Root.

---

## Hinweise zur Entwicklung

- Beim Ändern von API-Routen oder Servercode `npm run dev` neu starten (Next überwacht die meisten Änderungen automatisch).
- Nutze die Browser-Devtools, um Layout bei Portrait/Landscape zu prüfen.
- Wenn du neue Felder für Cocktails oder Zutaten hinzufügst, passe `lib/db.ts` sowie die Importskripte an.

---

## Mitwirken

Pull Requests sind willkommen. Bitte beschreibe Änderungen klar und halte Tests/Importskripte up-to-date.