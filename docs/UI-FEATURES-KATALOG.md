# FluxPlan – UI-Features-Katalog

**Zielgruppe:** Studienleitung, Moderation, Entwicklung, Bachelorarbeit (Nachvollziehbarkeit).  
**Nicht** als ausgedrucktes Blatt für Probanden gedacht — die [Study Sheets](study-sheets/README.md) bleiben bewusst „blind“ gegenüber konkreten Hilfen.

Dieses Dokument beschreibt **was in der UI sichtbar ist**, **welche Aktionen die Engine oder die Oberfläche auslösen**, und **welche sichtbaren Änderungen** daraus folgen (Baseline vs. Adaptive).

---

## 1. Kurz: Baseline vs. Adaptive in der UI

| Bereich | Baseline | Adaptive |
| --- | --- | --- |
| **`/heute` und andere Hauptseiten** | Kein adaptives Vorschlags-Banner | **Adaptive:** Banner oben im Inhaltsbereich möglich (pending Vorschlag; Priorität u. a. `daily_focus`, `view_preference`); **nicht** unter `/anpassungen` (dort nur Tabs) |
| **`/anpassungen`** | Tabs nutzbar; kaum neue pending Vorschläge | Liste „Aktive Vorschläge“ + Detail mit **farbigem Rand, Icon, Kategorie-Badge, Strapline** |
| **`/erstellen` / Bearbeiten** | Gleiche Grundfunktionen; optional Schalter „Zusatzfelder eingeklappt“ unter Einstellungen | Wie Baseline **plus** ggf. Vorschläge aus der Engine; **Hinweis** bei möglicher **zeitlicher Überschneidung** am gewählten Tag (nur Warnung, kein Blockieren; Dauer-Herleitung siehe §3.5) |
| **Kalender „überlappt“** (Chips im Raster) | **Zeit-Überlappung** am Tag | **Identisch** in Baseline und Adaptive — **kein** Unterschied |
| **Vorschlag „Planungskonflikt“** (`calendar_conflict`) | — | **Nur Adaptive:** Text-Vorschlag (8 h Tageslast beim Anlegen); **ändert das Raster nicht** |
| **Einstellungen** | Master-Toggle Adaptiv oft aus (Demo) | Vorschläge + Eingriffsstufe aktiv steuerbar |

Technische Details: [`DOKUMENTATION.md`](DOKUMENTATION.md) §1.6–1.7, [`ADAPTIVE_ENGINE_NOTES.md`](ADAPTIVE_ENGINE_NOTES.md).

---

## 2. Globale UI

| Feature | Wo sichtbar | Auslösung / Nutzeraktion | Sichtbare Wirkung |
| --- | --- | --- | --- |
| **Sidebar-Navigation** | Alle Hauptseiten | Klick auf Eintrag | Seitenwechsel; aktiver Eintrag hervorgehoben |
| **Tastatur-Shortcuts** | Global (nicht in Inputs) | `h` `a` `k` `n` `e` | Navigation zu Heute / Aufgaben / Kalender / Erstellen / Einstellungen |
| **Theme Hell/Dunkel** | Sidebar + `/einstellungen` | Klick Theme-Toggle / Darstellung | Farbschema wechselt (CSS-Variablen) |
| **Session / Pseudonym** | `/einstellungen` | Session starten | Ohne Session: APIs 401, keine persönlichen Daten |
| **„Session beenden“** | `/einstellungen` | Klick | Cookies gelöscht, erneuter Start nötig |
| **Demo-Daten laden** | `/einstellungen` — Karte **nur** für **`G01`/`G02`** („Demo-Setup (nur Gast …)“) | Rolle wählen, Button | Aufgaben/Interaktionen/ggf. Reset; danach oft Engine-Läufe. **F01–E05:** gleiche Logik über **`POST /api/data/demo`** (Skript/Runner), nicht über diese Karte |
| **Export JSON/CSV** | `/einstellungen` | Button | Download |
| **Daten zurücksetzen** | `/einstellungen` | Roter Bereich + Bestätigung | **Session:** Aufgaben/Vorschläge/Logs dieser Session + ausgewählte adaptive Outcome-Prefs; **G01/G02 + adaptiv:** Eingriffsstufe bleibt, Workshop neu gesät. **Ohne Session-Cookies:** User-weit Tasks/Suggestions/Interactions/**alle** Preferences; `EventLog` bleibt |
| **Admin: Demo-Testuser** | `/einstellungen` nur Admin-Pseudonym | Bestätigung `RESET_DEMO_USERS` | Löscht F01–E05 **und** G01/G02; legt **15** Demo-Rollenuser neu an (**G01/G02** nicht automatisch wieder) |
| **Admin: Gast-User** | `/einstellungen` nur Admin-Pseudonym | Bestätigung `RESET_GUEST_USERS` | Löscht nur **G01** und **G02** |
| **Adaptives Vorschlags-Banner** (nur Adaptive) | Hauptseiten unter `AppShell` (außer `/anpassungen`, `/`) | Navigation: `view_changed` + Evaluate; Banner-Mount lädt pending | Karte mit Ja / Nicht jetzt / Ablehnen; Logging `suggestion_seen` / `why_clicked` mit aktuellem Pfad als `screen` |

---

## 3. Seiten im Überblick

### 3.1 `/start` und `/willkommen`

| UI | Trigger | Sichtbare Änderung |
| --- | --- | --- |
| Weiterleitung | App-Logik nach Session/Willkommen-Status | Landet auf `startView` oder `/willkommen` |
| Willkommen-Tour | Erstbesuch / fehlendes „Willkommen“ | Erklärt Prinzipien; **Demo-Story-Buttons** nur für **G01/G02** |

### 3.2 `/heute` (Heute-Dashboard)

| UI-Bereich | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| **Fokusliste (To‑Do)** | Lädt `GET /api/tasks?status=open` + Preference `adaptive.dailyFocusListHighlight` | **Ohne** angenommenen Fokus-Hinweis (`daily_focus`): Liste **ohne Überfällige** — Reihenfolge **heute fällig** → **später fällig** (nach Datum) → undatierte Auffüller (bis 5). **Mit** Hinweis (nach „Verstanden“/Annehmen): **überfällig** → **heute** → Auffüller wie oben. **Zeilenoptik** bei aktivem Hinweis: überfällig + heute = rosa hervorgehoben + Metatext „Überfällig …“ / „Heute fällig …“; sonst dieselben Einträge **neutral** (kein rotes Row-Styling). Später fällig / ohne Datum: neutral (`today-dashboard.tsx`) |
| **„Gerade erledigt“** | Task auf erledigt | Kurze Liste mit „Rückgängig“-Button |
| **Quick-Add** | Eingabe + Absenden | Neue Aufgabe erscheint nach Reload in Liste |
| **Agenda „Heute im Überblick“** | Tasks mit Uhrzeit heute | Zeitleiste |
| **„Woche im Überblick“** (Mini-Monat) | `MiniMonthCalendar` | Monatsraster; **Tage mit Aufgaben: Punkte unter der Zahl** (feste Zeilenhöhe); Klick öffnet Popover mit Titeln |
| **Status-Zeilen** | Baseline/Adaptive | Textzeilen zu Modus / Vorschlag verfügbar |
| **Vorschlags-Banner** | — | **Entfällt:** Banner liegt **global** in der App-Shell (siehe §2), nicht mehr nur auf dieser Seite |

### 3.3 `/aufgaben`

| UI | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| Suche | Input | Filter auf Titel/Beschreibung |
| Quick-Filter-Chips | Klick | Heute / Überfällig / Woche / Ohne Datum |
| Sortierung | Dropdown | Ändert Reihenfolge |
| Kategorie-Gruppen | Daten | Gruppierte Liste mit Badges |
| **Neue Aufgabe** | Dialog oder Link | Formular wie Erstellen (Chips, optional eingeklappt) |
| **Bearbeiten** | Stift | Dialog: Titel, Datum, Uhrzeit, Priorität, **Zusatzfelder per Chips** (Kategorie, Tags, Dauer, Erinnerung, Beschreibung) |
| Erledigt / Löschen | Checkbox / Mülleimer | Statuswechsel oder Entfernen |

### 3.4 `/kalender`

| UI | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| Wochenraster | Tasks mit `dueDate` | Chips pro Slot |
| **Konflikt-Markierung („überlappt“)** | Zwei (oder mehr) Aufgaben **überlappen sich in der Zeit** am selben Tag (Wochenraster: voller Tag sichtbar; Dauer aus `estimatedMinutes` oder Fallback **45 min** im Code `week-planner.tsx`) | Hervorhebung am Chip (z. B. Ring); **gleich in Baseline und Adaptive** — hängt **nicht** von der Session-Variante ab |
| Ungeplante Aufgaben | Tasks ohne Datum | Rechte Spalte; Aktionen Planen/Heute |
| **Neue Aufgabe** | CTA | Weiterleitung `/erstellen` o. ä. |

**Wichtig:** Die Regel **`calendar_conflict`** (Adaptiv) nutzt eine **andere** Bedingung: Summe der geschätzten Minuten **aller offenen Aufgaben an einem Tag ≥ 8 h** beim **Anlegen** einer Aufgabe. Das löst **keine** extra Markierung im Wochenraster aus, sondern höchstens einen **Vorschlag** unter `/anpassungen` (bzw. Banner). Wenn du nur die Überlappungsansicht vergleichst, merkst du deshalb **keinen** Baseline-vs.-Adaptive-Unterschied.

### 3.5 `/erstellen`

| UI | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| Sprachfeld | Texteingabe | Live-Chips aus Parser (Tokens) |
| Titel, Datum, Uhrzeit, Priorität | immer sichtbar | Standardformular |
| **Zusatzfelder** | Chips „Kategorie / Tags / …“ | Felder erscheinen nur wenn Chip aktiv |
| **Eingeklappt** | Präferenz `taskFormOptionalFold` oder Vorschlag angenommen | Statt Chip-Leiste: **„Weitere Felder einblenden“**; Parser mit Tags etc. klappt automatisch auf |
| **Einklappen** | Klick wenn keine aktiven Zusatz-Chips | Chip-Leiste verbirgt sich wieder |
| **Überlappungs-Hinweis** (Datum + Uhrzeit gesetzt) | Client vergleicht mit `GET /api/tasks?status=open` | Gelber Hinweis, wenn Zeitfenster sich mit anderer Aufgabe **am selben Kalendertag** schneidet; **Speichern bleibt möglich**. Fehlende Dauer: siehe `inferOverlapHintDurationMinutes` in `task-time-overlap.ts` (zuletzt angelegte Aufgabe mit Dauer → häufigster Wert → **60 min**); andere Aufgaben ohne Dauer nutzen dieselbe Herleitung. **Kalender-Raster** nutzt weiterhin **45 min**-Fallback. |
| Absenden | Button | Toast, Redirect zu `/aufgaben` |

### 3.6 `/anpassungen`

| UI | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| Transparenz-Panel | `GET /api/insights` | Zahlen der letzten 7 Tage |
| Tab **Anpassungen** | — | Links Liste pending/historisch; rechts **Detailkarte** mit farbigem linken Rand, Icon, Badge, Strapline, „Warum?“, „Was passiert beim Annehmen“, Buttons |
| Tab **Personalisierung** | — | Regeln an/aus, Eingriffsstufe, **Erinnerungs-Vorschläge vertagen** (Tage bis zum nächsten Vorschlag nach „Nicht jetzt“, Standard 3), Probelauf „Heuristiken prüfen“ |
| Tab **Cooldown** | Prefs + History | Regeln mit Abklingzeit |

### 3.7 `/einstellungen`

| UI | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| Pseudonym & Session | Formular | Study-Modus |
| **Vorschläge** Master + **Eingriffsstufe** | Nur Adaptive sichtbar voll | Schalter und Slider |
| **Aufgabe anlegen: Zusatzfelder** | Schalter | Speichert `taskFormOptionalFold` — **sofort** wirksam auf Erstellen + Bearbeiten-Dialog (eingeklappt wenn an) |
| Darstellung | Theme-Buttons | Hell/Dunkel/System |
| Export / Demo / Reset / Admin | Buttons | Demo-Karte nur G01/G02; sonst wie oben + Admin Gast-Reset |

---

## 4. Adaptive Engine: Trigger → wo sichtbar → UI-Effekt

Die Engine wird u. a. getriggert durch:

- `POST /api/adaptive/evaluate` (manuell Tab Personalisierung, oder beim **Seitenwechsel** über das globale Banner-Outlet mit `screen: pathname`, …)
- `POST /api/interactions` mit `view_changed` nach Navigation (App-Shell)
- **`POST /api/tasks`** nach erfolgreichem Anlegen (`screen: "task_created"`)

| `ruleKey` | Typischer `type` | Typische Auslöser (vereinfacht) | Wo sieht man es? | Was ändert sich sichtbar? |
| --- | --- | --- | --- | --- |
| `view_preference` | `start_view` | Wiederholte Wechsel zu **Kernrouten** `/heute`, `/kalender`, `/aufgaben`, `/erstellen` (andere Seiten zählen nicht); **Gewinner** = am häufigsten in einem gleitenden Fenster, sofern Schwelle erreicht (**Gast G01/G02:** Fenster **8** Events, Basis-Schwelle **3**; **sonst:** Fenster **28**, Basis **7** — effektive Schwelle kann durch Eingriffsstufe steigen, siehe `viewPreferenceRule.ts`) | Banner (Hauptseiten), `/anpassungen` | **Annehmen:** Startansicht gespeichert; ggf. Sprung zur neuen Startseite; Sidebar „Start“ zeigt neue Zielseite |
| `reminder_preference` | `reminder_suggestion` | Wiederholtes Muster mit Erinnerungen | `/anpassungen`, ggf. Banner | **Annehmen:** Erinnerungszeit an konkreter Aufgabe in DB; in UI in Aufgaben/Kalender sichtbar. **Nicht jetzt:** Pause bis konfiguriertes Datum (Personalisierung → Tage; Preference `adaptive.reminderSuggestionSnoozeUntil`). **Hinweis:** Auf `/heute` sortiert die Fokusliste nach **Fälligkeitsdatum** (`dueDate`); **rote Zeilen-Hervorhebung** für überfällig/heute nur, wenn `adaptive.dailyFocusListHighlight` aktiv ist — **unabhängig** davon, ob eine Erinnerung gesetzt ist |
| `daily_focus` | `daily_focus` | Viele relevante offene/heutige Aufgaben | Banner, `/anpassungen` | **Annehmen:** setzt `adaptive.dailyFocusListHighlight` — Fokusliste zeigt dann auch **überfällige** Einträge und hebt überfällig + heute **rot** hervor. **Ohne** Annahme: Überfällige **nicht** in der Fokusliste (nur heute + später + undatiert). Button oft **„Verstanden“** |
| `calendar_conflict` | `calendar_conflict` | Nach **task_created**: Summe `estimatedMinutes` der **offenen** Aufgaben an diesem Tag **≥ 8 h** (nicht = Überlappung im Raster) | `/anpassungen`, ggf. Banner | Nur **Vorschlagstext**; **keine** zusätzliche Markierung im Wochenraster |
| `adaptive_task_creation` | `task_form_chips` | Nach mehreren Aufgaben: Muster in **optionalen** Feldern (Kategorie, Tags, Dauer, Erinnerung, Beschreibung); Gast (`G01`/`G02`): letzte „reiche“ Aufgabe | `/anpassungen`, ggf. Banner | **Annehmen:** Preference `adaptive.taskFormChips` → vorgemerkte Chips auf `/erstellen` und im Bearbeiten-Dialog |
| `adaptive_optional_fold` | `task_form_optional_fold` | Wenig Nutzung optionaler Felder; kein offener Chip-Vorschlag; Gast: zwei minimale Aufgaben hintereinander | `/anpassungen`, ggf. Banner | **Annehmen:** `taskFormOptionalFold` — Zusatzfelder eingeklappt |
| `adaptive_optional_unfold` | `task_form_optional_unfold` | Zusatzfelder eingeklappt, Nutzung optionaler Felder wieder hoch; Gast: letzte Aufgabe nutzt wieder Optionalfelder | `/anpassungen`, ggf. Banner | **Annehmen:** Einklappen-Preference entfernt — Zusatzfelder wieder standardmäßig sichtbar |

**Visuelle Unterscheidung** der Vorschläge in `/anpassungen`: jedes `ruleKey` hat eigenes **Icon**, **Randfarbe**, **Kategorie-Badge** (z. B. Überblick, Formular, Kompakt) und eine **Strapline** unter der Überschrift — damit „ähnlicher Text“ nicht wie derselbe Vorschlag wirkt.

---

## 5. Häufige Missverständnisse (für Moderation)

| Thema | Klarstellung |
| --- | --- |
| Konflikte im Kalender (orange / „überlappt“) | Nur **Überlappung** zweier Zeitfenster (`week-planner`); **gleich in Baseline und Adaptive**. Die Regel **`calendar_conflict`** ist **zusätzlich** (8 h Tageslast) und nur ein **Hinweis** unter Anpassungen — **kein** extra Pixel im Raster |
| Fokusliste | **Nicht** vom `daily_focus`-Payload gesteuert; **Annehmen** schaltet nur die Preference `adaptive.dailyFocusListHighlight` (rote Hervorhebung + Einblenden Überfälliger in der Top-Liste). Reihenfolge folgt **Fälligkeitsdatum**; Erinnerungsfelder steuern die Liste nicht |
| Chip-Vorschlag vs. Einklappen | **`adaptive_optional_fold`** wartet, solange ein **`task_form_chips`** noch **pending** ist |
| Gast-Pseudonym **nur** `G01`, `G02` | In der Engine **lockerere Schwellen** / verkürzte Muster (`isGuestStudyUser`) |
| Baseline + eingeklappte Felder | Schalter **„Zusatzfelder“** in Einstellungen wirkt **ohne** Engine |

---

## 6. Verwandte Dateien im Repo

| Thema | Pfad |
| --- | --- |
| Heute: Fokusliste (Buckets + Zeilenfarben) | `src/components/planning/today-dashboard.tsx` |
| Mini-Monat (Punkte, Ausrichtung) | `src/components/planning/mini-month-calendar.tsx` |
| Globales Vorschlags-Banner | `src/components/adaptive/pending-suggestion-banner.tsx`, `src/components/shell/app-shell.tsx` |
| Überlappung Erstellen/Bearbeiten | `src/lib/planning/task-time-overlap.ts`, `src/components/tasks/task-schedule-overlap-hint.tsx` |
| Vorschlags-Metadaten (Farben/Icons) | `src/components/adaptive/suggestion-visuals.ts` |
| Anpassungen-Detail | `src/components/adaptive/adaptations-tab.tsx` |
| Formular Erstellen | `src/components/tasks/progressive-task-form.tsx` |
| Dialog Bearbeiten | `src/components/tasks/task-form-dialog.tsx` |
| Engine & Regeln | `src/lib/adaptive/adaptiveEngine.ts`, `src/lib/adaptive/rules/*.ts` |

---

## 7. Versionhinweis

Stand: Beschreibung deckt u. a. **7 adaptive Regeln**, **globales Vorschlags-Banner**, **Überlappungs-Hinweis beim Erstellen**, **paritätes Bearbeiten-Formular**, **optional eingeklappte Zusatzfelder**, **visuell differenzierte Vorschlagskarten**, **Fokusliste** (ohne `daily_focus`: keine Überfälligen in der Top-Liste; mit Annahme: rot für überfällig + heute) und **Mini-Kalender-Layout mit fester Ziffernhöhe** ab. Bei größeren UI-Änderungen dieses Dokument mitpflegen.
