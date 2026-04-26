# FluxPlan (Bachelorarbeits-Prototyp)

FluxPlan ist ein **human-centered, adaptiver Aufgaben- und Planungs-Prototyp** mit Fokus auf **Transparenz**, **Nutzerkontrolle** und **ruhiger UX**.

- **Keine Black-Box-AI**: Adaptivität basiert auf einfachen, erklärbaren Heuristiken.
- **Keine autonomen Umplanungen**: Vorschläge sind **optional**, **erklärbar** und **rückgängig machbar**.
- **Study/Evaluation ready**: Logging in eigener PostgreSQL-DB + Export als JSON/CSV.

> Ausführliche Anleitung + Technologie-Erklärung: siehe [`docs/DOKUMENTATION.md`](docs/DOKUMENTATION.md).

## Stack
- **Next.js 16 (App Router)** + **TypeScript** + **React 19**
- **Tailwind CSS v4** + **shadcn/ui** + **lucide-react**
- **next-themes** für Hell/Dunkel-Wechsel
- **PostgreSQL 16** (lokal via Docker Compose, später Railway)
- **Prisma** (Schema, Migrations, Seed)

## Routen (UI)
| Pfad | Inhalt |
| --- | --- |
| `/start` | Onboarding-Hero (Welcome + Prinzipien) |
| `/heute` | Heute-Dashboard (Fokusliste, Agenda, Mini-Kalender, Schnellzugriff/Shortcuts) |
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
| `POST /api/data/reset` | Aufgaben/Vorschläge/Logs/Prefs für Pseudonym löschen |
| `GET /api/export?format=json\|csv` | Pseudonymer Daten-Export |
| `POST /api/interactions` · `POST /api/events` | Interaktions- und Event-Logging |

## Adaptive Engine
- 5 Regeln: `view_preference`, `reminder_preference`, `daily_focus`, `calendar_conflict`, `adaptive_task_creation`.
- **Master-Toggle** (`adaptive.enabled`) deaktiviert die gesamte Engine.
- **Eingriffsstufe** 0–3 skaliert die Trigger-Schwellen jeder Regel.
- **Snooze 24 h**: vertagte Vorschläge verhindern dieselbe Regel für 24 Stunden.
- **Cooldown 14 Tage**: zwei Rejects derselben Regel innerhalb von 14 Tagen pausieren sie automatisch.
- **Reversibilität**: Jede Annahme kann rückgängig gemacht werden (z. B. Startansicht wird zurückgesetzt, Reminder entfernt).
- **Probelauf**: Im Tab Personalisierung können Heuristiken auf Knopfdruck einmalig ausgeführt werden.

## UI-Detail-Features
- **Theme-Toggle**: Hellmodus ist Standard. Schalter in der Sidebar (Sonne/Mond) oder unter `/einstellungen → Darstellung`.
- **Transparenz-Panel** (`/anpassungen`): zeigt die 7-Tage-Aggregate, die in die Heuristiken einfließen — keine versteckten Daten.
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

Der App-Container führt `prisma generate`, `prisma migrate deploy` und `prisma db seed` automatisch aus.

App läuft auf `http://localhost:3000`, PostgreSQL auf `localhost:5432`.

Stop:

```bash
docker compose down
```

> Falls Routen nach grösseren Änderungen plötzlich 404 liefern: einmalig den Turbopack-Cache leeren — `docker compose exec app rm -rf /app/.next && docker compose restart app`.

## Study Session (Pseudonym)
- Öffne `/einstellungen`
- Pseudonym-Code z. B. `P01` eingeben → Server setzt **httpOnly Cookies**
- Danach sind Tasks, Suggestions und Logs dem Pseudonym zugeordnet.

## Export & Reset (Evaluation)
- `/einstellungen` → Export JSON / Export CSV
- `/einstellungen` → "Daten zurücksetzen" (Pseudonym + Session bleiben, alles andere wird gelöscht)
- API: `GET /api/export?format=json|csv`, `POST /api/data/reset`

## Prisma Shortcuts
- Generate: `npm run prisma:generate`
- Migrate: `npm run prisma:migrate`
- Seed: `npm run prisma:seed`
- Studio: `npm run prisma:studio`

## Railway Deployment
1. **Railway Postgres** hinzufügen → Railway setzt `DATABASE_URL` automatisch.
2. App als **Dockerfile Deploy** konfigurieren.
3. Environment Variables:
   - `DATABASE_URL` (Railway)
   - `NEXT_PUBLIC_APP_NAME=FluxPlan`
   - `STUDY_MODE_ENABLED=true`
   - `NODE_ENV=production`
4. Migration auf Railway: `npx prisma migrate deploy` als Build-/Release-Step.

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
