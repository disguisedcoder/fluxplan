# FluxPlan – „Mockup-genaue Endausbau-Spezifikation“ (One-Shot-Prompt)

Du bist Senior Fullstack Engineer, UI/UX Designer und Softwarearchitekt.
Arbeite im bestehenden Repository `fluxplan/` weiter. NICHT alles neu bauen. Erhalte funktionierenden Code (Next.js App Router, Prisma/Postgres, Docker, Tailwind, shadcn/ui, lucide). Refactore nur, wo nötig.

Ziel dieses Prompts: FluxPlan in **einem Durchlauf** mockup-konform, bachelorarbeits-tauglich und stabil fertigstellen.

---

## 0) Verbindliche Bachelorarbeits-Regeln (NICHT verletzen)

1. Grundoberfläche muss **ohne** Adaptivität überzeugen (Tasks, Filter, Planung, Today). Adaptivität ist optionaler Layer.
2. Adaptivität verändert NIE Layout/Daten ohne Zustimmung. Keine versteckten Sprünge. Keine Aufgaben ausblenden.
3. Keine Black-Box. Jede Adaption: „Warum sehe ich das?“ + „Was passiert beim Annehmen?“ verständlich erklärt.
4. Nutzerkontrolle: jede Suggestion hat **Annehmen / Nicht jetzt / Ablehnen / Rückgängig** + sichtbarer Verlauf.
5. Wissenschaftliche Idee sichtbar: Transparenz, kontrollierte Adaptivität, Anpassungsverlauf, leichte Planung, gute FTUE.
6. Inspiration: Microsoft To Do (Ruhe), Apple Erinnerungen (Reminder), Todoist (Struktur/Priorität), TickTick + Any.do (Tagesplanung). KEINE Funktionsüberladung. KEIN AI-Marketing.
7. Planung bleibt **leicht**: Week Strip + Tagescolumn + Mini-Kalender. KEIN voller Kalender.
8. Evaluation einfach: pseudonymisiertes Logging + JSON Export reicht.
9. Erklärbarkeit der Tech-Wahl: Next.js/TS/Prisma/Postgres/Railway/Docker-für-DB/Heuristiken statt KI.
10. Im Zweifel: einfacher, stabiler, besser erklärbar.

---

## 1) Mockup-Quelle (verbindlich)

Im Workspace liegen die Mockups als Bilder in
`C:\Users\janse\.cursor\projects\c-Users-janse-Documents-FH-Bachelorarbeit\assets\` mit Namen wie
`01_startoberflaeche...png`, `02_grundoberflaeche_heute_fokus...png`, `03_aufgaben_und_kalender...png`,
`04_adaptiver_vorschlag...png`, `05_kontrolle_undo_erklaerung...png`, `06_neue_aufgabe_progressiv...png`,
`07_personalisierung_aktive_regeln_verlauf...png`, `08_ansichtspraeferenz_und_fokusvorschlag...png`,
`09_kalenderkonflikt...png`, `10_formularlogik_reminder_sprachparsing...png`,
`11_cooldown_und_verlauf...png`, plus `00_contact_sheet...png`.

Bitte vor Implementierung diese Bilder lesen (Read-Tool) und sich an exakter
Struktur, Hierarchie, Spaltenanzahl, Card-Aufbau und Microcopy orientieren.
NICHT 1:1 kopieren, aber:
- gleiche Informationsarchitektur,
- gleiche Hauptscreens,
- gleicher minimaler ruhiger Stil (viel Whitespace, dezente Cards, abgerundet, leicht violetter Akzent),
- gleiche Microcopy-Tonalität (kurz, ruhig, kontrollierend).

---

## 2) Designsystem (Pflicht)

- Hintergrund: sehr helles Off-White / leicht warm/bläulich (z.B. `bg-[#F7F8FB]`).
- Karten: `rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04)]`.
- Akzent (Primary): kühler Indigo/Violett (z.B. Tailwind `indigo-600` / `violet-600`). Sparsam einsetzen.
- Typo: große, ruhige H1 (Page Title), darunter dezente Subline (max 1 Satz). Card-Titles `text-base font-medium`.
- Tags/Kategorien-Badges (klein, dezent): „Studium“, „Research“, „Prototype“, „Review“, „Apps“, „Eval“, „Text“, „Hoch“, „Vorsichtig“, „Aktiv“, „Pausiert“, „Akzeptiert“, „Abgelehnt“, „Nicht jetzt“, „Rückgängig“. Pastellige Hintergründe (nicht schreiend).
- Status-Punkte (• vor Items): leichte Farbpunkte (grün/violett/gelb/rot) – konsistent mit Verlauf-Status.
- Buttons:
  - Primary: gefüllt, dunkler Indigo, weiß (`Übernehmen`, `Anlegen`, `Erste Schritte`).
  - Secondary: weiß / outline (`Nicht jetzt`).
  - Tertiary/Ghost: nur Text (`Ablehnen`, „Warum sehe ich das?“).
- Fokus-Outline und Tastaturbedienbarkeit überall sichtbar.
- Konsistente Spacing-Skala: 4 / 8 / 12 / 16 / 24 / 32.

---

## 3) Routing & Navigation (an Mockups anpassen)

Aktuelle Routen: `/today`, `/tasks`, `/planning`, `/adaptive`, `/study`, `/settings`.
Soll-Struktur (deutsch, mockup-konform):

- `/` → redirect `/start` (oder `/heute`, falls Onboarding bereits gemacht).
- `/start` → Willkommen / Onboarding-Karte (Mockup 01).
- `/heute` → Today (Mockup 02 + 08).
- `/aufgaben` → Aufgaben (Liste/Filter).
- `/kalender` → Aufgaben & Kalender (Mockup 03 + 09).
- `/erstellen` → Neue Aufgabe progressiv (Mockup 06 + 10).
- `/anpassungen` → Anpassungen / Verlauf (Mockup 05 + 07 + 11). Ersetzt `/adaptive`.
- `/einstellungen` → Einstellungen (Pseudonym, adaptive an/aus, Export, Reset).

Aliasing/Backwards: `/today` / `/tasks` / `/planning` / `/adaptive` / `/settings` als Redirects auf die neuen Pfade einrichten, damit nichts bricht.

Sidebar (links, fix auf Desktop, Drawer auf Mobile):
- Branding oben: kleiner Plus-Icon-Badge + „FluxPlan“.
- Items: `Start`, `Heute`, `Aufgaben`, `Kalender`, `Erstellen`, `Anpassungen`, `Einstellungen`.
- Aktiv-Item: kleiner farbiger Punkt links + bold.
- Unten: User-Badge mit Pseudonym + Substring „Adaptive Planung aktiv“ (klickbar → `/einstellungen`).

Mobile-Navigation:
- Bottom-Nav mit max 5 Items (`Heute`, `Aufgaben`, `Kalender`, `Erstellen`, `Anpassungen`) + Drawer für `Start`/`Einstellungen`.

Tablet:
- Sidebar einklappbar (nur Icons), Hauptbereich zentriert, rechte Spalte unter Inhalt stapelbar.

---

## 4) Screens – Pflichten je Screen (Akzeptanzkriterien)

Für JEDE Seite gilt: Loading State, Empty State, Fehler-Toast, Tastatur-/Screenreader-tauglich, responsive (Desktop / Tablet / Mobile).

### 4.1 `/start` (Mockup 01)
- H1 „Willkommen bei FluxPlan“, Subline „Planung zuerst. Anpassungen erst, wenn sie sinnvoll sind.“
- Linke Karte „So funktioniert der Einstieg“ mit 3 Punkten + Tags „Stabile Basis“, „Erklärbar“, „Rückgängig“.
- Rechte Karten: „Heute“ (mit 1–2 Beispielaufgaben aus Seed) + „Was direkt sichtbar ist“ (Status-Stats: „Regeln 0 aktiv“, „Undo bereit“).
- CTAs: „Erste Schritte“ (primär, → `/heute`), „Tour starten“ (top right) und „Ohne Tour“.
- Beim ersten Besuch sichtbar; danach automatisch zu `/heute` umlenken (Preference `seenWelcome=true`).

### 4.2 `/heute` (Mockup 02 + 08)
- H1 „Heute“, Subline „Ruhige Übersicht für Aufgaben und Termine.“
- Top right: „Neue Aufgabe“ (öffnet Quick-Add bzw. `/erstellen`).
- 3-Spalten-Layout (Desktop), gestapelt (Mobile):
  - **Fokusliste**: Top 3–5 Aufgaben mit Kategorie-Badge (Mockup zeigt „Studium“, „Research“, „Prototype“, „Review“). Zeile mit Checkbox + Titel + Zeitfenster („Heute - 09:00–10:30“).
  - Quick-Add Eingabefeld + „Anlegen“ Button am Ende der Spalte.
  - **Heute im Blick** (Tagescolumn): Zeitstempel links, kleine Pill-Cards rechts: „10:30 Design-Review“, „13:00 Pause“, „16:00 QG-Notizen“. Reine Anzeige (aus Tasks mit Tagesdatum + Uhrzeit / oder Termin-Tasks).
  - **Ruhige Hinweise** (Empty/Pre-State): Hinweis, dass adaptive Vorschläge erst entstehen, wenn Muster auftreten.
  - **Woche im Blick**: Mini-Monatskalender (markiert: heute fett, Wochenenden andersfarbig). Darunter Stats „6 Aufgaben“ / „2 Termine“ (offene + heute fällig).
  - **Systemstatus**: 3 Pill-Tags („Keine Regel aktiv“ / „Undo verfügbar“ / „Transparenz sichtbar“).
- Wenn adaptive Suggestion „start_view“ ODER „daily_focus“ ODER „view_preference“ aktiv ist, oben volle Breite eine **dezente Banner-Suggestion-Karte** (Mockup 08): „Du wechselst oft zur Kalenderansicht. Kompaktansicht rechts einblenden?“ mit Buttons `Ja` / `Später` und „Warum sehe ich das?“.
- Akzeptanz: Today funktioniert auch wenn KEINE Suggestions vorhanden sind.

### 4.3 `/aufgaben`
- Liste aller Tasks mit:
  - Suchfeld, Filter Status (offen/erledigt/archiv), Priorität, Kategorie/Listenname, „Heute / Überfällig / Diese Woche“.
  - Sortierung: Fälligkeit asc / Priorität desc / Erstellt desc.
- TaskCard: Checkbox, Titel, kleine Sub-Zeile (Liste, Tag, Reminder-Icon falls gesetzt), Due-Badge.
- Empty State: „Noch keine Aufgaben“ + Primary „Neue Aufgabe“.
- `filter_used` Event loggen, wenn Nutzer Filter wechselt.

### 4.4 `/kalender` (Mockup 03 + 09)
- H1 „Aufgaben & Kalender“, Subline „Liste und Zeitbezug greifen sichtbar ineinander.“
- Top right: Primary „Zeitblock erstellen“.
- 3-Spalten-Layout (Desktop):
  - **Ungeplante Aufgaben**: Liste, jeder Task „ohne Zeitblock“ + Kategorie-Badge.
  - **Woche** (z.B. 7.–13. Apr.): horizontale Spalten Mo–Fr, Zeitachse links 08:00–18:00, Tasks mit Zeit als farbige Slot-Cards.
  - **Freie Slots**: 3–5 Vorschläge `Di 15:30-16:15`, `Do 09:00-09:45`. Reines Anzeige-/Hilfemodul, nicht autonom.
  - **Planungslogik**: kleine Erklärbox (4 Bullet-Points: Aufgaben bleiben lesbar, Konflikte werden markiert, Vorschläge bleiben optional, Kalender bleibt Planungsfläche).
- **Konflikt-Modus** (Mockup 09): wenn neuer Zeitblock kollidiert → rote Markierung + rechts „Konflikt erkannt“ mit „Alternativ 16:30“, „Alternativ 17:15“, „Nur als Aufgabe speichern“. KEINE automatische Verschiebung.
- Akzeptanz: ohne Konflikte/ohne Tasks bleibt das Layout ruhig + nutzbar.

### 4.5 `/erstellen` (Mockup 06 + 10)
- Progressive Disclosure:
  - Tabs „Einfach“ / „Details“.
  - Pflicht: Titel, Datum, Uhrzeit (optional), Liste/Kategorie.
  - „Weitere Felder“ rechts als +Chips: Priorität, Reminder, Kategorie/Tag, Dauer, Notiz/Kontext.
- **Adaptive Chips** unter dem Formular (kontextsensitiv): „Reminder 30 Min“, „Kategorie Research“, „Dauer 90 Min“. Bei Click in Form übernehmen, NIE automatisch.
- **Sprachparsing/Microcopy** (Mockup 10): Eingabezeile „Donnerstag 14 Uhr Interviewleitfaden fertig machen“ → Button „Vorschläge prüfen“. Erkannte Felder erscheinen rechts (Titel, Datum, Uhrzeit, Reminder, Kategorie). Buttons „Übernehmen“ / „Manuell prüfen“. Microcopy-Karte: „Nicht automatisch / Nur auf Anfrage / Vor dem Speichern prüfen“.
- Akzeptanz: Sprachparsing ist **deterministisch** (regex/heuristisch, KEINE echte KI). Es wird vom Nutzer immer bestätigt.

### 4.6 `/anpassungen` (Mockup 05 + 07 + 11)
Diese Seite vereint Anpassungen, Personalisierung und Cooldown.

- Default-Tab „Anpassungen“ (Mockup 05):
  - **Verlauf**-Liste mit farbigen Punkten + Status-Badges („Akzeptiert“, „Nicht jetzt“, „Rückgängig“, „Pausiert“).
  - **Änderung im Detail**: Titel, Status-Badges („Aktiv“, „reversibel“), Sektionen „Auslöser“, „Was sich ändert“, „Kontrolle“ mit Buttons `Rückgängig`, `Pause 7 Tage`, `Regel deaktivieren` (primär).
  - **Leitlinien** (kleine Karte): kurze Begründung / sichtbare Aktion / Undo in jedem Verlauf.
- Tab „Personalisierung“ (Mockup 07):
  - **Aktive Regeln** Liste: Karte je Regel mit kurzem Subline-Text + Status-Badge (Aktiv/Vorsichtig/Pausiert).
  - **Eingriffsstufe**-Slider (Niedrig ↔ Hoch). Wirkt als Schwellenmultiplikator für die Engine.
  - **Verlauf**-Mini.
  - **Transparenz**-Karten: „Regeln sichtbar 4“, „Pausiert 0“, „Undo möglich Ja“ + Erklärbox „Warum das wichtig ist“.
- Tab „Cooldown & Verlauf“ (Mockup 11):
  - **Vorschläge pausiert** mit Begründung („2x abgelehnt, 1x ‚nicht jetzt‘“) + Button „Früher aktivieren“.
  - **Regelstatus** Liste.
  - **Was sichtbar bleibt** Erklär-Cards (3 Stück): „Pausiert statt verborgen“, „Reaktivierbar“, „Keine stillen Neustarts“.

Akzeptanz: Verlauf, Pause, Reaktivierung, Regel deaktivieren funktionieren End-to-End (DB + UI).

### 4.7 `/einstellungen`
- Sektion „Pseudonym & Session“: aktuelles Pseudonym (read-only), aktive `sessionCode`, Start „Neue Session“ → Modal.
- Sektion „Adaptivität“: Master-Toggle „Adaptive Vorschläge aktiviert“ (Preference `adaptiveEnabled`); pro Regel Toggle.
- Sektion „Daten“: Buttons „Export JSON“, „Export CSV“, „Daten zurücksetzen“ (mit Confirm-Dialog).
- Sektion „Datenschutz“: max. 3 Sätze: „Logging lokal in PostgreSQL. Kein externes Tracking. Pseudonym frei wählbar.“

---

## 5) Adaptive Suggestions – UI/UX (verbindlich)

- Inline-Suggestion-Karte (Mockup 08) ODER Modal (Mockup 04). Modal **nur** für die erste, „high-impact“ Suggestion.
- Karte/Modal enthält:
  - kleines Icon (`Sparkles` / `BellOff` / etc.),
  - kurzer Titel,
  - 1 Satz Erklärung,
  - „Muster: X von Y Sitzungen“ (wenn vorhanden),
  - Bullet-Liste „Was passiert, wenn ich annehme“ (max 3 Punkte),
  - Buttons `Übernehmen` (primary), `Nicht jetzt` (outline), `Ablehnen` (ghost),
  - Sekundär „Warum sehe ich das?“ (Popover) → loggt `why_clicked`,
  - nach Annahme: Button `Rückgängig`.
- Suggestion-Render-Logging: `suggestion_seen` (genau einmal pro Render).
- Engine-Cooldown: nach 2× Reject ODER 1× Reject + 1× Snooze gleiche Regel → automatisch in Status `paused` für 7 Tage. Sichtbar in `/anpassungen`. „Früher aktivieren“ überschreibt Cooldown.

---

## 6) Heuristiken – MVP final (3 Pflicht, 2 zusätzlich optional)

Pflicht (default enabled):
1. **Fokusvorschlag am Tagesbeginn**: bei `/heute`-Open + ≥3 offene Aufgaben + ≥1 hoch/überfällig.
2. **Reminder-Vorschlag**: bei neuer Aufgabe mit `dueDate` ohne `reminderAt`, wenn ≥2 Aufgaben in den letzten 10 mit Reminder erstellt wurden.
3. **Planungsansicht-Vorschlag**: ≥3 von 10 letzten View-Events sind `/kalender`.

Optional (default DISABLED via Seed):
4. Kalender-Konflikthinweis (nur passive Markierung, KEINE Verschiebung).
5. Adaptive Task-Erstellung (Chips im `/erstellen`).

Engine:
- pro Regel: `key`, `name`, `description`, `evaluate(ctx)`, `explanation`, `payload`.
- Dedupe: keine zweite `pending` Suggestion gleicher `ruleKey`+`type`.
- Apply (`accept`): schreibt UserPreference / Task-Feld.
- Undo: revert der Änderung wenn möglich.
- Snooze: Status `snoozed`, ignoriert von Engine für 24h.
- Reject: Status `rejected`. Bei zweimal Reject in 14 Tagen → Cooldown s.o.

---

## 7) API-Endpoints (Pflicht, klein halten)

Bestehend behalten/ergänzen:
- `POST /api/study/session` (gibt es).
- `GET /api/me` (gibt es).
- `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id` (gibt es).
- `POST /api/events` (gibt es).
- `POST /api/interactions` (gibt es).
- `GET /api/suggestions`, `POST /api/suggestions/:id/respond` (gibt es).
- `POST /api/adaptive/evaluate` (gibt es).
- `GET/PATCH /api/rules` (gibt es).
- `GET /api/export` (gibt es).

Neu hinzufügen:
- `GET/PUT /api/preferences` (Liste aller Preferences des Users + setzen einzelner Keys: `adaptiveEnabled`, `startView`, `interventionLevel: low|med|high`, `seenWelcome`).
- `POST /api/data/reset` (löscht für aktuellen User: Tasks, TaskInteraction, Suggestions, EventLogs, Preferences; behält User+aktive Session).
- `POST /api/parser/task` (deterministisches Sprachparsing: Eingabe `text`, Antwort `title`, `dueDate`, `reminderAt?`, `category?`, `durationMin?` mit Confidence-Hinweis – KEINE LLM-Abhängigkeit).

Validierung: zod-Schemas in `src/lib/validation/*`.
Fehlerbehandlung: zentraler `HttpError`-Pattern (bereits existiert) verwenden.

---

## 8) Logging (für Bachelor-Evaluation)

Pflicht-Events (in `EventLog` UND wo sinnvoll auch `TaskInteraction`):
- `view_changed` (screen)
- `task_created` / `task_completed` / `task_postponed` / `task_deleted`
- `reminder_added`
- `filter_used` (welche filter)
- `suggestion_seen`
- `suggestion_accepted` / `suggestion_rejected` / `suggestion_snoozed` / `suggestion_undone`
- `why_clicked`
- `rule_toggled`
- `data_reset`

Export:
- `format=json`: vollständiges Bundle (User, Session, Tasks, Interactions, Suggestions, EventLogs, Preferences).
- `format=csv`: drei separate CSVs als ZIP (events.csv, tasks.csv, suggestions.csv) ODER mehrteilige CSVs als Strings im JSON. Wenn ZIP zu komplex, dann nur `events.csv` (aktueller Stand) + `suggestions.csv` zusätzlich.

---

## 9) Components (vorhanden + neu)

Erhalte/refactore vorhanden:
- `AppShell`, `PageHeader`, `TaskCard`, `TaskFormDialog` (in `/erstellen` integrieren), `TasksScreen`, `TodayDashboard`, `WeekPlanner`, `SuggestionCard`, `ExplanationPopover`, `SessionCodeInput`, `StudySessionBanner`, `EventLogExportButton`.

Neu:
- `BottomNav` (mobile).
- `BrandSidebar` (mit User-Badge unten).
- `MiniMonthCalendar` (für Today rechts).
- `WeekGridCalendar` (für `/kalender`).
- `ConflictHintCard`.
- `ProgressiveTaskForm` (Tabs Einfach/Details + Chips).
- `LanguageParseInput` (mit Vorschlag-Liste „Erkannte Felder“).
- `AdaptationHistoryList`, `AdaptationDetailPanel`, `RuleListItem`, `InterventionLevelSlider`, `CooldownPanel`.
- `OnboardingHero`, `WhatIsVisibleCard`.

---

## 10) Daten / Seed / Migration

- Prisma Schema bleibt strukturell. Falls neue Preferences-Keys nötig, KEIN Schema-Change (UserPreference ist key-value).
- Seed: 5–8 Beispielaufgaben über 7 Tage verteilt, mit Kategorien (Studium, Research, Prototype, Review, Apps, Eval, Text). 2 Aufgaben überfällig, 1 mit Reminder. 1 Beispiel-Suggestion `pending` (daily_focus).
- Beim ersten User-Onboarding (kein `seenWelcome`-Pref): kein Auto-Seed, aber leere States sind freundlich.
- Reset-Endpoint löscht entsprechende Tabellenzeilen für `userId`.

---

## 11) Performance & Stabilität

- Server-Komponenten wo möglich (Pages); Client-Komponenten nur, wo Interaktion nötig.
- Daten via Server Actions / Route Handlers, NICHT global state libraries.
- `npm run lint` MUSS am Ende grün sein.
- `npm run build` MUSS grün sein.
- `npx prisma generate` und `prisma migrate deploy` werden über `scripts/docker-start-dev.mjs` und `scripts/docker-start-prod.mjs` automatisch ausgeführt – nicht brechen.
- Hydration: `<html suppressHydrationWarning>` bleibt.

---

## 12) Akzeptanzkriterien (MUST PASS)

- [ ] Sidebar + Mobile-Nav umgesetzt, Aktiv-Item sichtbar, User-Badge unten.
- [ ] Alle 7 Hauptscreens existieren und sehen mockup-nah aus.
- [ ] Tasks: Erstellen / Bearbeiten / Erledigen / Archivieren / Löschen / Suche / Filter.
- [ ] Today: Fokusliste + Tagescolumn + Mini-Kalender + Systemstatus.
- [ ] Kalender: Week-Grid + Ungeplante + Freie Slots + Konflikt-Modus.
- [ ] Erstellen: Progressive Form + Chips + Sprachparsing-Modul.
- [ ] Anpassungen: Verlauf + Detail + Personalisierung + Cooldown.
- [ ] Einstellungen: Pseudonym + Adaptive an/aus + Export + Reset.
- [ ] Suggestions: Banner + Modal-Variante, Accept/Reject/Snooze/Undo, Cooldown nach 2× Reject.
- [ ] Logging: alle Pflicht-Events landen in EventLog.
- [ ] Export JSON enthält Preferences.
- [ ] Build + Lint grün.
- [ ] App startet stabil mit `docker compose up -d --build`.

---

## 13) Vorgehensweise (Pflicht)

1. **Bestand & Plan**: prüfe das Repo, fasse 5 Bullets „was bleibt / was muss geändert werden“ zusammen, dann fortfahren.
2. **Routing umstellen** (alte Pfade als Redirects; Sidebar/MobileNav neu).
3. **Designsystem-Tokens** (Tailwind theme + globale Klassen für Card/Badge/Status-Punkte).
4. **`/start` + `/heute`** komplett mockup-nah (zuerst statisch, dann adaptive Banner).
5. **`/aufgaben`** auf neuen Look ziehen.
6. **`/kalender`** mit Week-Grid + Konfliktanzeige.
7. **`/erstellen`** progressive Form + Chips + Parser.
8. **`/anpassungen`** mit 3 Tabs (Anpassungen, Personalisierung, Cooldown).
9. **`/einstellungen`** + `/api/preferences` + `/api/data/reset`.
10. Engine: Cooldown + Snooze-24h + InterventionLevel-Schwellen.
11. Logging-Lücken füllen (`suggestion_seen`, `why_clicked`, `filter_used`, `data_reset`, `rule_toggled`).
12. Seed anreichern, Build/Lint grün, README aktualisieren (Routes/Endpoints/Reset).

Nach jedem Block: `npm run lint`. Am Ende: `npm run build`.

---

## 14) Schluss-Output

Liefere am Ende:
1. kurze Bestand vs. Änderungen (max 10 Zeilen),
2. Liste geänderter Dateien,
3. ausgeführte Checks (`lint`, `build`),
4. offene Risiken (max 5 Punkte),
5. genau 1 nächsten empfohlenen Schritt.

Stelle dabei sicher, dass die App **auch ohne adaptive Vorschläge** ruhig, vollständig und mockup-nah wirkt.
