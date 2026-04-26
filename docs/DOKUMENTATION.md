# FluxPlan – Anleitung & Technologie

Dieses Dokument hat zwei Teile:

1. **Anleitung** – was die Anwendung kann und wie du jede Funktion ausprobieren kannst.
2. **Technologie** – was hinter den Kulissen passiert, einfach erklärt. Ziel: Du kannst jeden Punkt im Code zeigen und in 1–2 Sätzen erklären.

---

# Teil 1 · Anleitung

## 1.1 Erste Schritte

1. App starten (Docker Compose):

   ```bash
   docker compose up -d --build
   ```

   Browser öffnen: `http://localhost:3000`.

2. Auf `/start` landest du auf dem Onboarding. Über `/einstellungen → Pseudonym & Session` legst du einen frei wählbaren Code an (z. B. `P01`). Erst danach werden Aufgaben und Logs unter diesem Pseudonym gespeichert.

3. Über die Sidebar wechselst du zwischen den Hauptbereichen. Auf Mobile gibt es die untere Tab-Bar.

## 1.2 Aufgaben verwalten

| Aktion | Wo |
| --- | --- |
| Anlegen (klassisch) | `/aufgaben` → Knopf „Neue Aufgabe" |
| Anlegen (mit Sprache) | `/erstellen` |
| Schnell anlegen | `/heute` → Eingabezeile unter der Fokusliste |
| Bearbeiten | Stift-Icon an jeder Aufgabe |
| Erledigen | Häkchen anklicken |
| Löschen | Mülleimer-Icon |
| Suchen / Filtern | `/aufgaben` (Suche oben, Quick-Chips: Heute, Überfällig, Diese Woche, Ohne Datum) |
| Sortieren | Dropdown rechts neben den Filtern |

### Sprachparser (`/erstellen`)

Du tippst frei deutsch und FluxPlan extrahiert daraus Datum, Zeit, Priorität, Tags und Dauer. Beispiele:

- `morgen 9:30 für Studium 60 min` → Datum + Zeit + Liste + Dauer
- `Fr 12.5. !hoch #recherche` → Datum + Priorität + Tag
- `heute 14 uhr` → Datum + Zeit

Die geparsten Werte erscheinen als Chips. Du kannst sie jederzeit überschreiben oder zusätzliche Felder per Klick öffnen.

## 1.3 Heute-Dashboard (`/heute`)

- **Fokusliste**: Überfällige + heute fällige Aufgaben in einer Liste.
- **Heute im Blick**: Termine mit Uhrzeit als Mini-Agenda.
- **Schnellzugriff**: Liste der Tastatur-Shortcuts (siehe 1.10).
- **Woche im Blick**: Mini-Monatskalender mit Tagen, an denen Aufgaben fällig sind.
- **Systemstatus**: Status-Badges (z. B. „Undo verfügbar").

## 1.4 Kalender (`/kalender`)

- Wochenraster mit Stundenslots (8–19 Uhr).
- Jede Aufgabe mit Datum erscheint als Chip am richtigen Tag.
- **Konflikte** (mehrere Aufgaben gleichzeitig oder >8 h Gesamtschätzung) werden rot markiert. FluxPlan verschiebt nichts automatisch.
- Rechte Spalte: ungeplante Aufgaben (kein Datum) und freie Slots-Vorschau.
- Wochen-Navigation oben (Pfeile + Heute-Knopf).

## 1.5 Adaptive Vorschläge (`/anpassungen`)

Drei Tabs:

### Tab „Anpassungen"

- **Aktive Vorschläge** links, Detailpanel rechts.
- Pro Vorschlag: Titel, Erklärung, „Was passiert beim Annehmen", Buttons **Annehmen / Nicht jetzt / Ablehnen**.
- **„Warum sehe ich das?"** öffnet die ausführliche Erklärung.
- **Verlauf** zeigt vergangene Entscheidungen. Bei `accepted` gibt es **Rückgängig**.

### Tab „Personalisierung"

- Schalter pro Heuristik (Regel ein/aus).
- **Eingriffsstufe** 0–3 (skaliert die Schwellen aller Regeln).
- **Probelauf**: Knopf „Heuristiken jetzt prüfen" — ruft die Engine sofort auf, ohne auf Aktionen zu warten.
- Transparenz-Statistiken (gesamt / angenommen / abgelehnt / vertagt).

### Tab „Cooldown"

- Listet Regeln, die wegen 2× Ablehnung 14 Tage pausiert sind.
- Zeigt zuletzt abgelehnte Vorschläge.

### Transparenz-Panel oben

Zeigt vor allen Tabs, welche Zahlen aus den letzten 7 Tagen in die Engine fließen (Anzahl Aufgaben, % mit Datum, % mit Erinnerung). Garantiert: **es geht nichts darüber hinaus** in die Engine.

## 1.6 Heuristiken im Test

Jede Regel reagiert auf einfache Muster. So kannst du jede gezielt auslösen:

| Regel | Auslöser |
| --- | --- |
| `view_preference` | Wechsle 4× zwischen `/heute` und `/kalender` |
| `reminder_preference` | Lege 3 Aufgaben mit Erinnerungszeit an |
| `daily_focus` | Lege ≥ 4 Aufgaben für heute an |
| `calendar_conflict` | Plane an einem Tag > 8 h Aufgaben (Summe `estimatedMinutes`) |
| `adaptive_task_creation` | Lege 6 Aufgaben mit Datum + Erinnerung an |

Alternativ: Tab Personalisierung → **Heuristiken jetzt prüfen**.

## 1.7 Theme (Hell / Dunkel / System)

- Sidebar oben rechts: kleiner Sonne/Mond-Knopf für schnellen Wechsel.
- `/einstellungen → Darstellung`: drei Buttons **Hell**, **Dunkel**, **System**.
- Standard ist **Hell**. Auswahl wird nur im Browser (`localStorage`) gespeichert, beeinflusst keine Studiendaten.

## 1.8 Studienmodus, Pseudonym, Export, Reset

- **Pseudonym**: `/einstellungen → Pseudonym & Session`. Frei wählbar, keine Klarnamen.
- **Session-Code** (optional): zur Trennung mehrerer Test-Durchläufe pro Pseudonym.
- **Export**: `/einstellungen → Export JSON` oder `Export CSV` (oder direkt `GET /api/export?format=json|csv`).
- **Reset**: roter Knopf „Daten zurücksetzen" + Bestätigungsdialog. Löscht Aufgaben, Vorschläge, Logs und Präferenzen für das Pseudonym. Pseudonym selbst bleibt.

## 1.9 Logging im Hintergrund (transparent)

Alle wichtigen Interaktionen werden mitgeschrieben (in `TaskInteraction` oder `EventLog`):

- Navigation (`view_changed`)
- Aufgaben-CRUD (`task_created`, `task_completed`, `task_undone`, `task_deleted`)
- Filter & UI (`filter_used`, `reminder_added`)
- Vorschläge (`suggestion_seen`, `suggestion_accepted/rejected/snoozed/undone`, `why_clicked`)
- Engine (`engine_evaluated`, `rule_toggled`, `rule_cooldown_started`, `preference_changed`)
- System (`data_reset`, `seed_initialized`)

Der Export liefert genau diese Tabellen — kein zusätzliches Tracking, kein externer Service.

## 1.10 Tastatur-Shortcuts

| Taste | Wirkung |
| --- | --- |
| `h` | Zu **Heute** |
| `a` | Zu **Aufgaben** |
| `k` | Zu **Kalender** |
| `n` | Zu **Erstellen** (Neue Aufgabe) |
| `e` | Zu **Einstellungen** |

Shortcuts sind in Eingabefeldern automatisch deaktiviert (du kannst also normal tippen). Mod-Tasten (Ctrl/Alt/Cmd) werden ignoriert.

---

# Teil 2 · Technologie (Bachelor-Niveau)

## 2.1 Was ist Next.js?

Ein React-Framework. Es bietet:

- **Routing über Dateien**: jede `page.tsx` in `src/app/<pfad>/` wird automatisch zur Route. Beispiel: `src/app/(app)/heute/page.tsx` ⇒ URL `/heute`.
- **Server-Komponenten und Client-Komponenten**: Standardmäßig läuft eine Komponente auf dem Server. Mit der Direktive `"use client"` oben in der Datei läuft sie im Browser. Wir nutzen Client-Komponenten überall dort, wo `useState`, `useEffect` oder Eventhandler nötig sind.
- **API-Routes**: jede `route.ts` in `src/app/api/...` ist ein Backend-Endpunkt. Statt eines extra Express-Servers schreiben wir `export async function GET()` oder `POST()` direkt in die Datei.

### Route Groups

Ordnernamen mit runden Klammern wie `(app)` erscheinen **nicht** in der URL. Wir nutzen `src/app/(app)/...`, damit alle Hauptseiten ein gemeinsames Layout (`layout.tsx` in `(app)`) bekommen, ohne dass `/app` Teil der URL wird.

### App Router (App Directory)

Alles spielt sich in `src/app/` ab. `layout.tsx` umschließt jede Seite. `page.tsx` ist der Inhalt einer Route. `route.ts` ist ein API-Endpunkt.

## 2.2 React 19 + TypeScript

- **Komponenten** sind Funktionen, die JSX zurückgeben. Beispiel: `function FocusListCard() { return <Card>…</Card>; }`.
- **Hooks** sind Funktionen, die mit `use…` beginnen. Wir nutzen vor allem:
  - `useState` für lokalen Zustand
  - `useEffect` für Seiteneffekte (Daten laden beim Mount, Event-Listener)
  - `useMemo` / `useCallback` für stabile Werte zwischen Renders
- **TypeScript** ergänzt JavaScript um Typen (`string`, `number`, `User`, …). Vorteil: viele Fehler werden schon beim Tippen sichtbar, ohne den Code zu starten.

## 2.3 Tailwind CSS v4 + shadcn/ui

- **Tailwind** ist eine Sammlung kleiner CSS-Hilfsklassen wie `flex`, `gap-2`, `text-muted-foreground`. Statt CSS-Dateien zu pflegen, schreiben wir Klassen direkt in JSX. Vorteil: konsistentes Design, kaum „toter" CSS-Code.
- **shadcn/ui** ist *kein* npm-Paket im klassischen Sinn. Es ist ein Sammlung kopierbarer React-Komponenten (Button, Card, Dialog, Switch, …), die wir lokal in `src/components/ui/` haben. Wir können sie frei anpassen.
- **CSS-Variablen für Themes**: Farben sind in `src/app/globals.css` als Variablen (`--primary`, `--background`, …) definiert — einmal für Hellmodus (`:root`) und einmal für Dunkelmodus (`.dark`). Tailwind/shadcn liest die Variablen, also ändert ein Klassenwechsel an `<html>` automatisch alle Farben.

### Theme-Wechsel mit `next-themes`

Die Library setzt nur die Klasse `.dark` (oder entfernt sie) auf das `<html>`-Element. Der Rest passiert automatisch via CSS-Variablen. Unser Toggle (`src/components/shell/theme-toggle.tsx`) ruft im Wesentlichen `setTheme("dark")` oder `setTheme("light")` auf.

## 2.4 Prisma + PostgreSQL

- **PostgreSQL** ist die Datenbank. Sie läuft als eigener Docker-Container (`db`).
- **Prisma** ist der ORM (Object-Relational Mapper). Er hat drei Bestandteile:
  1. `prisma/schema.prisma` — die Definition aller Tabellen (`Task`, `User`, `AdaptiveSuggestion`, …).
  2. `prisma migrate` — verwandelt das Schema in echte SQL-Migrations und führt sie auf der DB aus.
  3. `@prisma/client` — der TypeScript-Client. Damit schreiben wir z. B. `prisma.task.findMany({ where: { userId } })` ohne SQL.
- **Seed**: `prisma/seed.ts` füllt die DB mit Beispiel-Daten (User, Aufgaben, Vorschläge). Beim ersten Start im Container wird das automatisch ausgeführt.

## 2.5 Auth: HTTP-only Cookies, kein OAuth

Wir setzen beim ersten Pseudonym-Login zwei Cookies (`fp_user_id` und `fp_session_id`). Sie sind **httpOnly**, also vom JS im Browser nicht lesbar — nur das Backend kann sie auswerten. Das ist sicher genug für einen Studien-Prototyp und braucht keine externen Auth-Provider.

Hilfsfunktion: `requireUserId()` in `src/lib/auth/require-user.ts` wirft `HttpError(401)` wenn kein User-Cookie da ist. So müssen API-Routes nichts mehr selbst prüfen.

## 2.6 Validation mit Zod

In jeder API-Route, die einen Body nimmt, definieren wir ein `Zod`-Schema (z. B. `z.object({ title: z.string().min(1) })`). Wir parsen dann den Body damit. Vorteile: keine ungültigen Daten gelangen in die DB, die Fehlermeldung ist klar, und TypeScript bekommt automatisch den passenden Typ.

## 2.7 Docker & Docker Compose

- **Dockerfile** beschreibt, wie das App-Image gebaut wird (auf Basis Node 22, Dependencies installieren, Code kopieren, Startbefehl).
- **docker-compose.yml** orchestriert mehrere Container:
  - `db` (Postgres 16) mit Healthcheck und persistentem Volume.
  - `app` (unsere Next-App) mit Mount des Projektverzeichnisses (`.:/app`), so dass Hot-Reload greift.
  - Beim Start ruft die App das Skript `scripts/docker-start-dev.mjs` auf, das `prisma generate`, `migrate deploy` und `seed` ausführt, bevor `next dev` startet.
- **Hot-Reload**: weil das Projekt als Volume eingebunden ist, sieht der Container sofort jede Änderung an `.tsx`/`.ts`-Dateien. Du musst meistens nur den Browser refreshen.

## 2.8 Adaptive Engine — die wichtigste Stelle der Arbeit

In `src/lib/adaptive/`:

- `adaptiveEngine.ts` — die Hauptschleife. Sie läuft pro Aufruf einmal alle Regeln durch und legt einen Vorschlag an, wenn die Regel zustimmt und es noch keinen offenen gleichen gibt.
- `engineConfig.ts` — lädt aus `UserPreference`:
  - `adaptive.enabled` (Master-Toggle)
  - `adaptive.interventionLevel` (0–3, skaliert Schwellen)
  - `adaptive.cooldown.<ruleKey>` (Pausen nach Ablehnungen)
  - aktuelle 24-h-Snoozes aus den Suggestions
- `rules/` — fünf eigenständige Dateien, eine pro Heuristik. Jede Datei exportiert ein `AdaptiveRule`-Objekt mit `key`, `name`, `description` und einer `evaluate(ctx)`-Funktion. Die Funktion gibt entweder einen `SuggestionDraft` oder `null` zurück.

### Beispiel-Lebenszyklus eines Vorschlags

1. Du klickst eine Aufgabe an.
2. Die App ruft `POST /api/adaptive/evaluate`.
3. `runAdaptiveEngine` lädt die Engine-Konfiguration und durchläuft alle Regeln.
4. Trifft `dailyFocusRule` zu (≥ 4 heutige Aufgaben), erzeugt sie einen Draft.
5. Ist die Regel nicht pausiert (kein Cooldown, kein Snooze, Master-Toggle aktiv) und gibt es noch keinen offenen gleichen Vorschlag → eintragen in `AdaptiveSuggestion`.
6. Du siehst ihn auf `/anpassungen`. Klick auf „Annehmen" ruft `POST /api/suggestions/:id/respond` mit Action `accept` auf — der Vorschlag wird umgesetzt (z. B. Reminder eintragen).
7. Klick auf „Ablehnen" zählt als Reject. Zwei Rejects in 14 Tagen ⇒ Cooldown (Regel 14 Tage pausiert).

### Warum so einfach?

Bewusst — die Bachelor-Arbeit will **erklärbare** Adaptivität. Jede Regel ist ein TypeScript-File mit ein paar Datenbank-Queries und einer Bedingung. Du kannst jede in 30 Sekunden lesen.

## 2.9 Logging-Modelle

- `TaskInteraction` — alles, was direkt mit Aufgaben oder Engine-Ereignissen zu tun hat (`task_created`, `engine_evaluated`, …).
- `EventLog` — eher UI- und Studien-Ereignisse (`view_changed`, `suggestion_seen`, `filter_used`, …).

Beide Tabellen haben Felder für `userId`, `type`/`eventType`, `metadata` (JSON) und `createdAt`. Der Export liefert beide direkt aus.

## 2.10 Wo finde ich was?

```
src/
  app/                    # Routen (UI + API)
    (app)/                # Hauptseiten mit gemeinsamem AppShell
      heute/              # Today-Dashboard
      aufgaben/           # Aufgabenliste
      kalender/           # Wochen-Kalender
      erstellen/          # Progressives Formular
      anpassungen/        # Adaptive Vorschläge (3 Tabs)
      einstellungen/      # Pseudonym, Theme, Master-Toggle, Reset
    api/                  # Route Handlers (Backend)
  components/
    shell/                # AppShell, Sidebar, ThemeToggle, PageHeader
    tasks/                # TaskCard, ProgressiveTaskForm, TasksScreen
    planning/             # TodayDashboard, WeekPlanner, MiniMonthCalendar
    adaptive/             # SuggestionsScreen + Tab-Komponenten
    settings/             # PreferencesForm, AppearanceCard, DataResetButton
    study/                # SessionCodeInput, StudySessionBanner
    ui/                   # shadcn-Bausteine (Button, Card, …)
  lib/
    db/prisma.ts          # Prisma Singleton
    auth/                 # Cookie- und User-Helper
    adaptive/             # Engine + Regeln + EngineConfig
    parser/               # Sprachparser für /erstellen
    hooks/                # useKeyboardShortcuts
    ui/                   # Kategorie-Helper
prisma/
  schema.prisma           # Datenmodell
  seed.ts                 # Beispiel-Daten
  migrations/             # SQL-Migrations
docs/
  DOKUMENTATION.md        # diese Datei
  NEXT_PROMPT.md          # ursprünglicher Bauplan
docker-compose.yml        # db + app
Dockerfile                # Container für die App
```

## 2.11 So baust du etwas Neues

### Neue API-Route

1. Datei anlegen: `src/app/api/<pfad>/route.ts`.
2. `export async function GET()` oder `POST(req: Request)` schreiben.
3. Bei Bedarf `requireUserId()` verwenden für Auth.
4. Für Body: Zod-Schema oben definieren und mit `safeParse(body)` prüfen.
5. Mit `NextResponse.json(...)` antworten.

### Neue Heuristik

1. Datei anlegen: `src/lib/adaptive/rules/myRule.ts`.
2. Exportiere ein Objekt vom Typ `AdaptiveRule`:

   ```ts
   export const myRule: AdaptiveRule = {
     key: "my_rule",
     name: "Beispielregel",
     description: "Erklärt, wann sie greift.",
     async evaluate(ctx) {
       // Datenbank-Queries via ctx.userId
       if (!bedingungErfüllt) return null;
       return {
         ruleKey: "my_rule",
         type: "my_suggestion",
         title: "...",
         explanation: "Warum sehe ich das?",
         payload: { /* Daten zum Annehmen */ },
       };
     },
   };
   ```

3. In `src/lib/adaptive/adaptiveEngine.ts` zur Liste `rules` hinzufügen.
4. In `prisma/seed.ts` einen `AdaptiveRule`-Datensatz mit demselben `key` anlegen.
5. Migration / Seed neu laufen lassen.

### Neue Theme-Farbe

1. Variable in `src/app/globals.css` ergänzen, einmal in `:root`, einmal in `.dark`.
2. In Tailwind-Klassen verwenden: `bg-[var(--my-color)]` oder die Variable im `@theme inline {}`-Block registrieren.

### Neuen Shortcut

In `src/lib/hooks/use-shortcuts.ts` in `useGlobalNavigationShortcuts` einen Eintrag ergänzen, z. B. `s: () => router.push("/start")`. Pflegen: in der ShortcutsCard auf `/heute` aufnehmen, damit er sichtbar dokumentiert ist.

## 2.12 Häufige Stolpersteine

| Symptom | Lösung |
| --- | --- |
| 404 nach grossem Routing-Umbau | `docker compose exec app rm -rf /app/.next && docker compose restart app` |
| Prisma-Fehler `did not initialize yet` | `npx prisma generate` (oder Container neu bauen) |
| „Theme" wechselt nicht | Hard-Reload (`Strg+Shift+R`), `localStorage` ggf. leeren |
| Vorschläge erscheinen nie | Eingriffsstufe ≥ 1 prüfen, Master-Toggle an, Tab Personalisierung → „Heuristiken jetzt prüfen" |
| Build-Warnung über Lockfile | Im `next.config.ts` `turbopack.root` setzen oder lockfile in `C:\Users\janse\` löschen |

---

## Anhang A · Wichtige Befehle

```bash
# Lokal entwickeln (Docker empfohlen)
docker compose up -d --build
docker compose logs -f app
docker compose down

# Prisma
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run prisma:studio

# Code-Qualität
npm run lint
npm run build
```

## Anhang B · Bachelorarbeits-Prinzipien (Erinnerung)

1. Basis-UI funktioniert ohne Adaptivität.
2. Adaptivität ist eine zweite, optionale Schicht — nichts verändert sich autonom.
3. Jede Anpassung ist erklärbar (Button „Warum sehe ich das?").
4. Annehmen, Ablehnen, Vertagen und Rückgängig sind immer sichtbar.
5. Vorschläge erscheinen nur bei klar erkennbaren Mustern.
6. UI orientiert sich an Microsoft To Do / Apple Reminders / Todoist — kein Gamification, keine aggressive AI-Aura.
7. Planung ist leichtgewichtig (Liste + Zeitbezug, keine Vollkalender-Suite).
8. Evaluation ist simpel (Logging in eigener DB, JSON/CSV-Export).
9. Technische Entscheidungen sind erklärbar (siehe Teil 2).
10. Wenn zwei Lösungen gleich gut sind: die einfachere und stabilere.
