# Moderation & Runner – Study Sheets

**Nur für Studienleitung / Labor-Runner.** Nicht zusammen mit dem Probanden-Aufgabenblatt ausdrucken.

Die **Probanden-Sheets** (`familienplanner.md`, `taskplanner.md`, `evalrunner.md`) sollen fair bleiben und **keine** konkreten adaptiven UI-Details vorwegnehmen.

---

## Zentrale Referenz

| Dokument | Inhalt |
| --- | --- |
| [`../UI-FEATURES-KATALOG.md`](../UI-FEATURES-KATALOG.md) | Alle UI-Features, **Trigger**, **sichtbare Änderungen**, Baseline vs. Adaptive, Regel-für-Regel |
| [`../DOKUMENTATION.md`](../DOKUMENTATION.md) Teil 1 | Anleitung, Heuristiken-Tabelle §1.6, Baseline vs. Adaptive §1.7 |
| [`../ADAPTIVE_ENGINE_NOTES.md`](../ADAPTIVE_ENGINE_NOTES.md) | Technische Trigger (`evaluate`, `view_changed`, `task_created`) |

---

## Runner-Checkliste (nach Session-Start)

1. **Phase / Variante:** Passt die gewählte Session (Baseline vs. Adaptive) zur geplanten Bedingung?
2. **Startdaten:** **F01/T01/E01 …** — Karte **Demo-Setup** fehlt in der UI; Demo-Set per **`POST /api/data/demo`** (Rolle) **oder** ausreichend Seed-Aufgaben vor Session-Start sicherstellen; kein zweites Demo nach Umschalten ohne Absprache. **G01/G02 adaptiv** — Workshop (Aufgaben + 7 pending Vorschläge) liegt **automatisch** nach Start; Baseline-Gast: Demo-Setup-Karte nutzen. **G01/G02** nach Daten-Reset: Workshop wird bei adaptiv neu gesetzt (Eingriffsstufe bleibt).
3. **Baseline:** Route **`/anpassungen`** leitet auf **`/heute`** um — kein Anpassungen-UI; Probanden-Sheets erwähnen das.
4. **Bei Adaptive:** Nach Navigations- und Aufgaben-Phasen ggf. kurz prüfen (ohne Proband zu führen):
   - Oben auf **den meisten Hauptseiten** (nicht unter `/anpassungen`) kann ein **Vorschlags-Banner** erscheinen, sobald ein pending Vorschlag existiert — **normal**, kein Bug.
   - **`/anpassungen`** → Tab „Anpassungen“: pending Karten mit **farbigem Rand**; dort kein doppeltes Banner oben. **Mehrere** pending Karten gleichzeitig sind möglich.
   - **`POST …/respond` mit Undo:** Vorschlag wird wieder **pending** (Banner kann erneut erscheinen).
   - **Vertagt / abgelehnt:** **„Wieder öffnen“** (gleiche Respond-Logik) in Anpassungen bzw. an der Karte.
   - Tab **Personalisierung**: u. a. Karte **„Erinnerungs-Vorschläge vertagen“** (Tage bis zum nächsten Erinnerungs-Vorschlag nach „Nicht jetzt“).
5. **Startansicht (`view_preference`):** Study-Sheets Phase 2A zielt auf **häufiges** Ansteuern einer Kernroute (v. a. `Heute`); **Pseudonym mit Buchstabe** (nicht G01/G02): im Code Fenster **28** Kern-Navigationsereignisse, Schwellenbasis **7** (nach Eingriffsstufe ggf. höher, siehe `viewPreferenceRule.ts`). **Gast G01/G02:** Fenster **8**, Basis **3**.
6. **Technik:** Wenn gar nichts Adaptives sichtbar: Eingriffsstufe, Master-Toggle, ggf. „Heuristiken prüfen“ in Personalisierung (siehe Katalog §4).

---

## Zuordnung Sheet → typische UI-„Beobachtungspunkte“ (Adaptive)

| Sheet-Rolle | Phase mit viel Nutzung | Was in der UI *kann* (nicht muss) zusätzlich auffallen |
| --- | --- | --- |
| **Eval-Runner** | Phase 2A Navigation (dominante Kernroute), 2B viele Aufgaben mit Datum/Erinnerung | Banner; mehrere pending Karten; Chips / Einklappen / Ausklappen; Kalenderlast; `Anpassungen` + `Personalisierung` |
| **Taskplanner** | Filter, Erstellen, viele Tasks | Formular-Hinweise (u. a. Überlappung bei Datum/Uhrzeit); Kalender + Liste |
| **Familienplanner** | Kalender, Termine, Dauer | Konflikt-Hinweis-Vorschlag (Engine); Kalender-Markierungen ohnehin sichtbar |

Im Zweifel: **Katalog §4** öffnen — dort ist regelbasiert beschrieben, **wo** und **was** sichtbar wird.

---

## Druckempfehlung

- **Proband:** nur `familienplanner.md` / `taskplanner.md` / `evalrunner.md` (eine Rolle).
- **Runner-Tisch:** `MODERATION-UND-RUNNER.md` + `UI-FEATURES-KATALOG.md` digital oder zweiter Ausdruck **ohne** Probandenblick.
