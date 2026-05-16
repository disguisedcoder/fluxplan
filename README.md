# FluxPlan (Bachelorarbeits-Prototyp)

FluxPlan ist ein **human-centered, adaptiver Aufgaben- und Planungs-Prototyp** mit Fokus auf **Transparenz**, **Nutzerkontrolle** und **ruhiger UX**.

- **Keine Black-Box-AI**: Adaptivität basiert auf einfachen, erklärbaren Heuristiken.
- **Keine autonomen Umplanungen**: Vorschläge sind **optional**, **erklärbar** und **rückgängig machbar**.
- **Study/Evaluation ready**: Logging in eigener PostgreSQL-DB + Export als JSON/CSV.

> Ausführliche Anleitung + Technologie-Erklärung: siehe [`docs/DOKUMENTATION.md`](docs/DOKUMENTATION.md).  
> **UI-Features, Trigger & sichtbare Effekte** (für Moderation/BA): [`docs/UI-FEATURES-KATALOG.md`](docs/UI-FEATURES-KATALOG.md) · Study Sheets & Ablauf: [`docs/study-sheets/README.md`](docs/study-sheets/README.md).

## Stack
- **Next.js 16 (App Router)** + **TypeScript** + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** + **lucide-react**
- **next-themes** für Hell/Dunkel-Wechsel
- **PostgreSQL 16** (lokal via Docker Compose; **Hosting z. B. Railway nur optional**, siehe unten)
- **Prisma** (Schema, Migrations, Seed)

## Routen (UI)
| Pfad | Inhalt |
| --- | --- |
| `/` | Weiterleitung auf `/start` |
| `/start` | **`GET`-Route-Handler** → HTTP-Redirect auf die **Standardansicht** (`startView`); ohne gesetzte Startansicht → `/willkommen` (Logik: `getStartRedirectHref` / `src/app/(app)/start/route.ts`) |
| `/willkommen` | Tour, Prinzipien; **Demo-Story-Buttons** nur für Pseudonyme **G01** / **G02** (optional) |
| `/heute` | Heute-Dashboard (To‑Do‑Liste, Agenda, Mini-Kalender, Schnellzugriff/Shortcuts) |
| `/aufgaben` | Liste, Suche, Quickfilter, Sortierung, Kategorie-Gruppen |
| `/kalender` | Wochen-Grid mit Konflikt-Markierung, ungeplante Aufgaben, freie Slots |
| `/erstellen` | Progressives Formular + deutscher Sprachparser |
| `/anpassungen` | Transparenz-Panel + 3 Tabs: Vorschläge · Personalisierung · Cooldown |
| `/einstellungen` | Pseudonym, Darstellung (Hell/Dunkel/System), Master-Toggle, Eingriffsstufe, Export, Reset |

Alte englische Pfade (`/today`, `/tasks`, `/planning`, `/adaptive`, `/settings`, `/study`) leiten automatisch auf die neuen deutschen Routen.

## API-Endpunkte
| Methode + Pfad | Zweck |
| --- | --- |
| `GET /api/me` | Aktuelles Pseudonym + Session |
| `POST /api/study/session` | Pseudonym-Session starten |
| `GET /api/tasks` (q, status, priority) | Aufgaben listen |
| `POST /api/tasks` | Aufgabe anlegen (löst Engine aus) |
| `PATCH /api/tasks/:id` | Aufgabe ändern |
| `DELETE /api/tasks/:id` | Aufgabe löschen |
| `POST /api/parser/task` | Deutsche Eingabe deterministisch parsen |
| `GET /api/suggestions` | Vorschläge (pending + Verlauf) |
| `POST /api/suggestions/:id/respond` | Accept / Reject / Snooze / Undo (Reject-Cooldown) |
| `POST /api/adaptive/evaluate` | Heuristiken einmalig prüfen (z. B. Probelauf) |
| `GET /api/insights` | Aggregat der letzten 7 Tage für Transparenz-Panel |
| `GET /api/rules` · `PATCH /api/rules` | Regeln auflisten / einzeln deaktivieren |
| `GET /api/preferences` · `PUT /api/preferences` | Adaptive-Master, Eingriffsstufe, Cooldowns |
| `POST /api/data/reset` | Mit Session: session-scopes Löschen (siehe `docs/DOKUMENTATION.md` §1.10); ohne Session: User-weit |
| `POST /api/data/demo` | Rollen-Demo (Reset optional); UI-Karte **Demo-Setup** für **G01/G02** und **F01–F05, T01–T05, E01–E05, P01–P05** |
| `POST /api/data/reset-demo-users` | Admin: 20 Demo-Codes + G01/G02 löschen, 20 Demo-User neu seeden |
| `POST /api/data/reset-guest-users` | Admin: nur G01/G02 löschen (`RESET_GUEST_USERS`) |
| `GET /api/export?format=json\|csv` | Pseudonymer Daten-Export |
| `POST /api/interactions` · `POST /api/events` | Interaktions- und Event-Logging |

## Adaptive Engine
- **7 Regeln**: `view_preference`, `reminder_preference`, `daily_focus`, `calendar_conflict`, `adaptive_task_creation`, `adaptive_optional_fold`, `adaptive_optional_unfold`.
- **Master-Toggle** (`adaptive.enabled`) deaktiviert die gesamte Engine.
- **Eingriffsstufe** 0–3 skaliert die Trigger-Schwellen jeder Regel.
- **Snooze** (standardmäßig 24 h, in `DEMO_MODE` verkürzbar): vertagte Vorschläge pausieren dieselbe Regel für dieses Fenster.
- **Cooldown** (standardmäßig 14 Tage, in `DEMO_MODE` verkürzbar): zwei Rejects derselben Regel innerhalb des Cooldown-Fensters pausieren sie automatisch.
- **Reversibilität**: Annahmen sind rückgängig machbar, soweit im Code umgesetzt (z. B. `start_view`, `reminder_suggestion`, `task_form_optional_fold` setzen bzw. löschen Präferenzen/Felder).
- **Probelauf**: Im Tab Personalisierung können Heuristiken auf Knopfdruck einmalig ausgeführt werden.
- **Präferenz „Formular kompakt“**: `taskFormOptionalFold` (`{ enabled: true }`) klappt Zusatzfelder beim Anlegen/Bearbeiten zunächst ein — u. a. nach Annahme des Vorschlags `task_form_optional_fold` oder manuell unter Einstellungen.

### Baseline vs. Adaptive (Studienvariante)
| | **Baseline** | **Adaptive** |
| --- | --- | --- |
| Session-Variante | `baseline` | `adaptive` |
| Engine | läuft nicht sinnvoll (Vorschläge aus, Demo setzt `adaptive.enabled` oft auf `false`) | Regeln dürfen Vorschläge erzeugen |
| Banner auf `/heute` | kein Vorschlags-Banner | ggf. Banner für ausgewählte pending Vorschläge |
| `/anpassungen` | Verlauf lesbar, neue Vorschläge praktisch keine | aktive Vorschläge + visuell getrennte Karten (Farbe/Icon/Kategorie pro Regel) |
| Formular `/erstellen` | gleiche Basis-UI; ohne adaptive Regeln keine Chip-/Fold-Vorschläge aus der Engine | optional: Vorschlag „Felder schneller hinzufügen?“ (`task_form_chips`) bzw. „Zusatzfelder einklappen?“ (`task_form_optional_fold`); manuelle Einstellung **Zusatzfelder eingeklappt** wirkt in **beiden** Varianten |

Details und Trigger: [`docs/DOKUMENTATION.md`](docs/DOKUMENTATION.md) (Abschnitt Heuristiken & Baseline), [`docs/ADAPTIVE_ENGINE_NOTES.md`](docs/ADAPTIVE_ENGINE_NOTES.md).

## UI-Detail-Features
- **Theme-Toggle**: Hellmodus ist Standard. Schalter in der Sidebar (Sonne/Mond) oder unter `/einstellungen → Darstellung`.
- **Transparenz-Panel** (`/anpassungen`): zeigt die 7-Tage-Aggregate, die in die Heuristiken einfließen — keine versteckten Daten.
- **Vorschlags-Karten** (`/anpassungen`): pro Regeltyp eigene **Kategorie-Badges**, **Farbe am linken Rand** und **Kurz-Erklärung** (Strapline), damit z. B. Fokus-Hinweis und Formular-Vorschläge auf einen Blick unterscheidbar sind.
- **Aufgaben-Formular**: Bearbeiten-Dialog und Erstellen-Seite unterstützen dieselben Zusatzfelder (Kategorie, Tags, Dauer, Erinnerung, Beschreibung); optionaler Bereich kann eingeklappt sein (`taskFormOptionalFold`).
- **Tastatur-Shortcuts** (global): `h` Heute, `a` Aufgaben, `k` Kalender, `n` Neue Aufgabe, `e` Einstellungen. Werden in Eingabefeldern automatisch ignoriert.

## Logging (Auswahl)
- `view_changed`, `task_created`, `task_completed`, `task_undone`, `task_deleted`
- `filter_used`, `reminder_added`
- `suggestion_seen`, `suggestion_accepted`, `suggestion_rejected`, `suggestion_snoozed`, `suggestion_undone`, `why_clicked`
- `rule_toggled`, `rule_cooldown_started`, `preference_changed`, `engine_evaluated`
- `data_reset`, `seed_initialized`

Alle Events landen in `EventLog` und/oder `TaskInteraction` und sind über den Export verfügbar.

## Lokales Setup (ohne Docker)
1. Dependencies installieren

```bash
npm install
```

2. `.env` anlegen (Beispiel kopieren)

```bash
copy .env.example .env
```

3. PostgreSQL bereitstellen und `DATABASE_URL` in `.env` anpassen.

4. Prisma

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

5. App starten

```bash
npm run dev
```

App läuft auf `http://localhost:3000`.

## Lokales Setup (mit Docker Compose – empfohlen)
Voraussetzung: Docker Desktop läuft.

```bash
docker compose up -d --build
```

Der App-Container führt `prisma generate`, `prisma migrate deploy` und `prisma db seed` automatisch aus. **Der Service `e2e` startet danach automatisch** (wenn `app` „healthy“ ist), führt **Playwright** (`npm run test:e2e:ci`) aus und beendet sich. Ergebnis: `docker compose logs e2e` (bei `-d` im Vordergrund keine Testausgabe im Terminal). **Erneuter Testlauf** ohne kompletten Neuaufbau: `docker compose run --rm e2e` oder `npm run test:e2e:docker`.

App läuft auf `http://localhost:3000`, PostgreSQL auf `localhost:5432`.

**Stack stoppen & Docker-Speicher für dieses Projekt freigeben** (löscht u. a. Postgres-Volume `fluxplan_db` und `e2e_node_modules`; beim nächsten `up` werden Migrate + Seed erneut ausgeführt):

```bash
npm run docker:down
```

Nur Container/Netzwerk beenden, **Named Volumes behalten** (DB + E2E-`node_modules` bleiben):

```bash
npm run docker:down:soft
```

Wenn du nach vielen Builds **viele verwaiste Volumes** (lange Hash-Namen, `LINKS 0`) hast: optional **`npm run docker:down:full`** — entfernt danach **alle** unbenutzten Volumes und den Build-Cache **systemweit** (kann andere Docker-Projekte betreffen; nur nutzen, wenn dir das bewusst ist).

## E2E Tests (Playwright, Demo/Gast)
### Mit Docker Compose (empfohlen)
`docker compose up -d --build` startet **db**, **app** und danach **e2e**; Playwright teilt sich mit `app` das Netzwerk (`network_mode: service:app`) und spricht die App über **`http://127.0.0.1:3000`** (zuverlässiger als Hostname `app` bei manchen Docker-/Proxy-Setups).

```bash
docker compose up -d --build
docker compose logs -f e2e   # Ausgabe nachverfolgen; Ende mit Ctrl+C
```

**Nur E2E erneut** (App/DB laufen schon): `npm run test:e2e:docker` bzw. `docker compose run --rm e2e`.

**Ohne E2E** (schnellerer Dev-Start): `docker compose up -d --build db app`

### Lokal ohne E2E-Container (Node auf dem Host)
Voraussetzung: DB läuft (z. B. Compose nur `db` + `app`) und `.env` ist gesetzt.

```bash
docker compose up -d --build
npm run test:e2e
```

- Exit-Code **0** und in der Ausgabe **passed** → Suite grün.
- HTML-Report liegt danach im Projektordner: `playwright-report/` → lokal mit `npx playwright show-report` öffnen.

Wenn Docker nicht verfügbar ist, müssen PostgreSQL und `DATABASE_URL` anderweitig erreichbar sein — sonst liefern die API-Endpunkte (Session/Seed) einen `503 db_unavailable`.

Optional (Demo-Time-Acceleration): zeitbasierte Features (Snooze/Cooldown) werden auf 10 Minuten verkürzt:

```bash
$env:DEMO_MODE="true"
$env:FP_SNOOZE_MS="600000"
$env:FP_COOLDOWN_WINDOW_MS="600000"
$env:FP_COOLDOWN_DURATION_MS="600000"
npm run test:e2e
```

### Online/CI
Ein GitHub Actions Workflow läuft die E2E Suite automatisch (inkl. Docker Compose + Playwright Report/Traces als Artefakte):
- Workflow: `.github/workflows/e2e.yml`

### Staging/Remote ausführen
Wenn du gegen eine Online-Instanz testen willst (z. B. Staging), setze die Base-URL:

```bash
PLAYWRIGHT_BASE_URL="https://deine-staging-url" npm run test:e2e
```

### Tests gezielt ausführen (Tags)
Die Tests sind über Tags gruppiert (per `--grep`):

- `@smoke` – kurzer Sanity-Check
- `@ui` – UI-Feature-Matrix
- `@adaptive` – Adaptive Engine / Rules
- `@study` – Studyflows
- `@admin` – Admin-only Endpunkte
- `@api` – API-basierte E2E/Integration Checks

Scripts:

```bash
npm run test:e2e:smoke
npm run test:e2e:ui-suite
npm run test:e2e:adaptive
npm run test:e2e:study
npm run test:e2e:admin
npm run test:e2e:api
```

### Wie die Tests stabil bleiben
- Login/Session + Demo-Seed laufen per Fixture über `POST /api/study/session` und `POST /api/data/demo`.
- Tests nutzen isolierte Pseudonyme pro Worker und seed/reset pro Run.
- Waiting erfolgt über Playwright Auto-Waits + Polling-Helper (`tests/utils/expectEventually.ts`) statt „sleep loops“.

> Falls Routen nach grösseren Änderungen plötzlich 404 liefern: einmalig den Turbopack-Cache leeren — `docker compose exec app rm -rf /app/.next && docker compose restart app`.

## Study Session (Pseudonym)
- Öffne `/einstellungen`
- Pseudonym-Code z. B. `P01` eingeben → Server setzt **httpOnly Cookies**
- **Gast:** **„Als Gast starten“** in der Session-Karte (wenn sichtbar) → Server vergibt **`G01`** oder **`G02`** (max. zwei Gast-User; sonst Fehler bis Admin **Gast-User** leert)
- Danach sind Tasks, Suggestions und Logs dem Pseudonym zugeordnet.

## Export & Reset (Evaluation)
- `/einstellungen` → Export JSON / Export CSV
- `/einstellungen` → **Daten zurücksetzen**: Inhalte der **aktuellen Studien-Session** (Details + Gast-Sonderfall in `docs/DOKUMENTATION.md` §1.10)
- API: `GET /api/export?format=json|csv`, `POST /api/data/reset`

## Dokumentation als PDF (Windows)
- Im Ordner `fluxplan`: `npm run pdf` bzw. nach Build automatisch (`SKIP_DOCS_PDF=1` zum Überspringen). Siehe `docs/pdf-export/`.

## Prisma Shortcuts
- Generate: `npm run prisma:generate`
- Migrate: `npm run prisma:migrate`
- Seed: `npm run prisma:seed`
- Studio: `npm run prisma:studio`

## Railway / Online-Deployment (optional)

**Brauchst du das für die Bachelorarbeit?** Oft **nein**: Wenn du **lokal** mit Docker Compose entwickelst, die Studie am **eigenen Rechner** oder im **Labor** fährst und **Playwright** (lokal oder im `e2e`-Container) als Qualitätssicherung nutzt, reicht das für einen **Prototyp** und eine **Evaluation** ohne öffentliche URL.

**Sinnvoll wird Hosting**, wenn du z. B. eine **öffentliche Demo-URL** brauchst (Betreuende von außen, Remote-Teilnehmende ohne Install), **dauerhaft** etwas online halten willst oder CI gegen **Staging** statt nur gegen Docker lokal laufen soll.

Wenn du es doch nutzen willst:

1. **Railway Postgres** hinzufügen → Railway setzt `DATABASE_URL` automatisch.
2. App als **Dockerfile Deploy** konfigurieren.
3. Environment Variables:
   - `DATABASE_URL` (Railway)
   - `NEXT_PUBLIC_APP_NAME=FluxPlan`
   - `STUDY_MODE_ENABLED=true`
   - `NODE_ENV=production`
4. Migration auf Railway: `npx prisma migrate deploy` als Build-/Release-Step.

Hinweis: Öffentliche Instanzen brauchen klare **Datenschutz-/Zugriffsentscheidungen** (wer darf rein, welche Daten).

## Datenschutzannahmen (Bachelorarbeit)
- Keine Passwörter, kein OAuth, keine echten Namen erforderlich.
- Logging nur in **eigener PostgreSQL-DB** (lokal/Railway), kein externes Tracking.
- Pseudonym-Code ist frei wählbar (z. B. `P01`). Testpersonen sollten keine privaten Daten in Task-Titel schreiben.

## Bachelorarbeits-Prinzipien
1. Die Basis-UI funktioniert ohne adaptive Logik.
2. Adaptivität ist eine zweite, optionale Schicht.
3. Jede Anpassung ist erklärbar (`Warum sehe ich das?`).
4. Annehmen, Ablehnen, Vertagen und Rückgängig sind immer sichtbar.
5. Vorschläge erscheinen nur bei klar erkennbaren Mustern, nie autonom.
