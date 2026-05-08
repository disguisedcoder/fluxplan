# FluxPlan – UI-Features-Katalog

**Zielgruppe:** Studienleitung, Moderation, Entwicklung, Bachelorarbeit (Nachvollziehbarkeit).  
**Nicht** als ausgedrucktes Blatt für Probanden gedacht — die [Study Sheets](study-sheets/README.md) bleiben bewusst „blind“ gegenüber konkreten Hilfen.

Dieses Dokument beschreibt **was in der UI sichtbar ist**, **welche Aktionen die Engine oder die Oberfläche auslösen**, und **welche sichtbaren Änderungen** daraus folgen (Baseline vs. Adaptive).

---

## 1. Kurz: Baseline vs. Adaptive in der UI

| Bereich | Baseline | Adaptive |
| --- | --- | --- |
| **`/heute`** | Kein Vorschlags-Banner oben | Banner möglich (pending Vorschlag, Priorität u. a. Fokus/Startansicht/Formular) |
| **`/anpassungen`** | Tabs nutzbar; kaum neue pending Vorschläge | Liste „Aktive Vorschläge“ + Detail mit **farbigem Rand, Icon, Kategorie-Badge, Strapline** |
| **`/erstellen` / Bearbeiten** | Gleiche Grundfunktionen; optional Schalter „Zusatzfelder eingeklappt“ unter Einstellungen | Wie Baseline **plus** ggf. Vorschläge aus der Engine (Chips-Hinweis, Einklappen-Hinweis) |
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
| **Demo-Daten laden** | `/einstellungen` (Demo-Setup) | Rolle wählen, Button | Aufgaben/Interaktionen/ggf. Reset; danach oft Engine-Läufe |
| **Export JSON/CSV** | `/einstellungen` | Button | Download |
| **Daten zurücksetzen** | `/einstellungen` | Roter Bereich + Bestätigung | Tasks, Vorschläge, Logs, Prefs des Pseudonyms weg |
| **Admin: Demo-Testuser** | `/einstellungen` nur Admin-Pseudonym | Bestätigung `RESET_DEMO_USERS` | Nur F01–E05 Nutzer in DB zurückgesetzt |

---

## 3. Seiten im Überblick

### 3.1 `/start` und `/willkommen`

| UI | Trigger | Sichtbare Änderung |
| --- | --- | --- |
| Weiterleitung | App-Logik nach Session/Willkommen-Status | Landet auf `startView` oder `/willkommen` |
| Willkommen-Tour | Erstbesuch / fehlendes „Willkommen“ | Erklärt Prinzipien; Link zu Demo |

### 3.2 `/heute` (Heute-Dashboard)

| UI-Bereich | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| **Fokusliste (To‑Do)** | Lädt `GET /api/tasks?status=open` | Liste überfällig → heute → Priorität → Auffüller; Checkbox erledigt mit Bestätigung |
| **„Gerade erledigt“** | Task auf erledigt | Kurze Liste mit „Rückgängig“-Button |
| **Quick-Add** | Eingabe + Absenden | Neue Aufgabe erscheint nach Reload in Liste |
| **Agenda „Heute im Überblick“** | Tasks mit Uhrzeit heute | Zeitleiste |
| **„Woche im Überblick“** (Mini-Monat) | `MiniMonthCalendar` | Monatsraster; **Tage mit Aufgaben: Punkte unter der Zahl** (feste Zeilenhöhe); Klick öffnet Popover mit Titeln |
| **Status-Zeilen** | Baseline/Adaptive | Textzeilen zu Modus / Vorschlag verfügbar |
| **Vorschlags-Banner** (nur sinnvoll Adaptive) | Mount: `evaluate` + `GET /api/suggestions`; bevorzugt `daily_focus`, `view_preference` | Karte oben: Titel, Erklärung, **Ja / Nicht jetzt / Ablehnen**, „Warum?“; je nach Typ zusätzlicher Erklärtext (z. B. Fokus vs. Startansicht vs. Formular) |

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
| **Konflikt-Markierung („überlappt“)** | Zwei (oder mehr) Aufgaben **überlappen sich in der Zeit** am selben Tag (Raster 8–19 Uhr; Dauer aus `estimatedMinutes` oder Fallback **45 min**) | Hervorhebung am Chip (z. B. Ring); **gleich in Baseline und Adaptive** — hängt **nicht** von der Session-Variante ab |
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
| Absenden | Button | Toast, Redirect zu `/aufgaben` |

### 3.6 `/anpassungen`

| UI | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| Transparenz-Panel | `GET /api/insights` | Zahlen der letzten 7 Tage |
| Tab **Anpassungen** | — | Links Liste pending/historisch; rechts **Detailkarte** mit farbigem linken Rand, Icon, Badge, Strapline, „Warum?“, „Was passiert beim Annehmen“, Buttons |
| Tab **Personalisierung** | — | Regeln an/aus, Eingriffsstufe, Probelauf „Heuristiken prüfen“ |
| Tab **Cooldown** | Prefs + History | Regeln mit Abklingzeit |

### 3.7 `/einstellungen`

| UI | Trigger | Sichtbare Wirkung |
| --- | --- | --- |
| Pseudonym & Session | Formular | Study-Modus |
| **Vorschläge** Master + **Eingriffsstufe** | Nur Adaptive sichtbar voll | Schalter und Slider |
| **Aufgabe anlegen: Zusatzfelder** | Schalter | Speichert `taskFormOptionalFold` — **sofort** wirksam auf Erstellen + Bearbeiten-Dialog (eingeklappt wenn an) |
| Darstellung | Theme-Buttons | Hell/Dunkel/System |
| Export / Demo / Reset / Admin | Buttons | wie oben |

---

## 4. Adaptive Engine: Trigger → wo sichtbar → UI-Effekt

Die Engine wird u. a. getriggert durch:

- `POST /api/adaptive/evaluate` (manuell Tab Personalisierung, oder `/heute`-Mount, …)
- `POST /api/interactions` mit `view_changed` nach Navigation (App-Shell)
- **`POST /api/tasks`** nach erfolgreichem Anlegen (`screen: "task_created"`)

| `ruleKey` | Typischer `type` | Typische Auslöser (vereinfacht) | Wo sieht man es? | Was ändert sich sichtbar? |
| --- | --- | --- | --- | --- |
| `view_preference` | `start_view` | Häufig zwischen Ansichten wechseln | Banner `/heute`, `/anpassungen` | **Annehmen:** Startansicht gespeichert; ggf. Sprung zur neuen Startseite; Sidebar „Start“ zeigt neue Zielseite |
| `reminder_preference` | `reminder_suggestion` | Wiederholtes Muster mit Erinnerungen | `/anpassungen` | **Annehmen:** Erinnerungszeit an konkreter Aufgabe in DB; in UI in Aufgaben/Kalender sichtbar |
| `daily_focus` | `daily_focus` | Viele relevante offene/heutige Aufgaben | Banner `/heute`, `/anpassungen` | Nur Hinweis; Fokusliste weiter aus Tasks berechnet. Button oft **„Verstanden“** |
| `calendar_conflict` | `calendar_conflict` | Nach **task_created**: Summe `estimatedMinutes` der **offenen** Aufgaben an diesem Tag **≥ 8 h** (nicht = Überlappung im Raster) | `/anpassungen`, ggf. Banner | Nur **Vorschlagstext**; **keine** zusätzliche Markierung im Wochenraster |
| `adaptive_task_creation` | `task_form_chips` | Viele neue Aufgaben mit Datum **und** Erinnerung (Schwelle) | `/anpassungen`, ggf. Banner | Vorschlag „Felder schneller…“; **kein** Pflichtfeld im Formular — Zustimmung dokumentiert |
| `adaptive_optional_fold` | `task_form_optional_fold` | Viele Aufgaben **ohne** Kategorie/Tags/Dauer/Erinnerung/Beschreibung; kein offener Chip-Vorschlag | `/anpassungen`, ggf. Banner | **Annehmen:** unter Einstellungen erscheint logisch „Zusatzfelder“ an; auf `/erstellen` und im Bearbeiten-Dialog **eingeklappte** Zusatzfelder bis „einblenden“ |

**Visuelle Unterscheidung** der Vorschläge in `/anpassungen`: jedes `ruleKey` hat eigenes **Icon**, **Randfarbe**, **Kategorie-Badge** (z. B. Überblick, Formular, Kompakt) und eine **Strapline** unter der Überschrift — damit „ähnlicher Text“ nicht wie derselbe Vorschlag wirkt.

---

## 5. Häufige Missverständnisse (für Moderation)

| Thema | Klarstellung |
| --- | --- |
| Konflikte im Kalender (orange / „überlappt“) | Nur **Überlappung** zweier Zeitfenster (`week-planner`); **gleich in Baseline und Adaptive**. Die Regel **`calendar_conflict`** ist **zusätzlich** (8 h Tageslast) und nur ein **Hinweis** unter Anpassungen — **kein** extra Pixel im Raster |
| Fokusliste | **Nicht** vom `daily_focus`-Payload gesteuert; Hinweis ist informational |
| Chip-Vorschlag vs. Einklappen | Schließen sich aus, solange ein **`task_form_chips`** noch **pending** ist |
| Baseline + eingeklappte Felder | Schalter **„Zusatzfelder“** in Einstellungen wirkt **ohne** Engine |

---

## 6. Verwandte Dateien im Repo

| Thema | Pfad |
| --- | --- |
| Mini-Monat (Punkte, Ausrichtung) | `src/components/planning/mini-month-calendar.tsx` |
| Heute-Banner | `src/components/planning/today-dashboard.tsx` |
| Vorschlags-Metadaten (Farben/Icons) | `src/components/adaptive/suggestion-visuals.ts` |
| Anpassungen-Detail | `src/components/adaptive/adaptations-tab.tsx` |
| Formular Erstellen | `src/components/tasks/progressive-task-form.tsx` |
| Dialog Bearbeiten | `src/components/tasks/task-form-dialog.tsx` |
| Engine & Regeln | `src/lib/adaptive/adaptiveEngine.ts`, `src/lib/adaptive/rules/*.ts` |

---

## 7. Versionhinweis

Stand: Beschreibung deckt u. a. **6 adaptive Regeln**, **paritätes Bearbeiten-Formular**, **optional eingeklappte Zusatzfelder**, **visuell differenzierte Vorschlagskarten** und **Mini-Kalender-Layout mit fester Ziffernhöhe** ab. Bei größeren UI-Änderungen dieses Dokument mitpflegen.
