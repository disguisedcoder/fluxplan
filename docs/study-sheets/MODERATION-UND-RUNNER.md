# Moderation & technischer Ablauf – Study Sheets

**Nur für das Team** (Moderation, technische Unterstützung). Nicht zusammen mit dem Aufgabenblatt für Testpersonen ausdrucken.

Die **Aufgaben-Sheets** (`familienplanner.md`, `taskplanner.md`, `evalrunner.md`) sollen fair bleiben und **keine** konkreten adaptiven UI-Details vorwegnehmen.

---

## Zentrale Referenz

| Dokument | Inhalt |
| --- | --- |
| [`../UI-FEATURES-KATALOG.md`](../UI-FEATURES-KATALOG.md) | Alle UI-Features, **Trigger**, **sichtbare Änderungen**, Baseline vs. Adaptive, Regel-für-Regel |
| [`../DOKUMENTATION.md`](../DOKUMENTATION.md) Teil 1 | Anleitung, Heuristiken-Tabelle §1.6, Baseline vs. Adaptive §1.7 |
| [`../ADAPTIVE_ENGINE_NOTES.md`](../ADAPTIVE_ENGINE_NOTES.md) | Technische Trigger (`evaluate`, `view_changed`, `task_created`) |

---

## Checkliste (nach Session-Start)

1. **Phase / Variante:** Passt die gewählte Session (Baseline vs. Adaptive) zur geplanten Bedingung?
2. **Startdaten:** **F01/T01/E01 …** — Karte **Demo-Setup** fehlt in der UI; Demo-Set per **`POST /api/data/demo`** (Rolle) **oder** ausreichend Seed-Aufgaben vor Session-Start sicherstellen; kein zweites Demo nach Umschalten ohne Absprache. **G01/G02** — Workshop (Aufgaben + Timeline) **automatisch** nach Start; **adaptiv** zusätzlich 7 pending Demo-Vorschläge; **Baseline** ohne Vorschläge. **Reset (Gast):** Workshop + Werk-Defaults, adaptive: alle Demo-Vorschläge wieder pending.
3. **Baseline:** Route **`/anpassungen`** leitet auf **`/heute`** um — kein Anpassungen-UI; Aufgaben-Sheets erwähnen das.
4. **Bei Adaptive:** Nach Navigations- und Aufgaben-Phasen ggf. kurz prüfen (Testperson nicht lenken, nur beobachten):
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

**Kalender (Moderation):** Unter `/kalender` gibt es **Monat** / **Woche**. Beim Umschalten auf **Woche** zeigt die App die **Kalenderwoche um den heutigen Tag** (Mo–So), nicht die Woche des Monatsersten — falls die Testperson kurz eine andere Woche erwartet, auf dieses Verhalten verweisen (Details **UI-FEATURES-KATALOG** §3.4).

Im Zweifel: **Katalog §4** öffnen — dort ist regelbasiert beschrieben, **wo** und **was** sichtbar wird.

---

## Exportdaten einordnen

Keine große quantitative Exportdaten-Auswertung versprechen. Der Export ist trotzdem sinnvoll, weil er zeigt, dass FluxPlan technisch auf Evaluation vorbereitet ist und einfache Nutzungsdaten ergänzend erfassen kann.

Brauchbare Kennzahlen:

- Anzahl erstellter Aufgaben
- Anzahl erledigter Aufgaben
- Navigationswechsel
- angezeigte Vorschläge
- angenommene, abgelehnte und vertagte Vorschläge
- `why_clicked`
- Export-Summary

Diese Daten eignen sich als **ergänzende technische Nutzungsdaten**, aber nicht als alleinige UX-Bewertung. Für die UX-Einordnung den Kurzfragebogen auf den Aufgaben-Sheets und Beobachtungsnotizen heranziehen.

---

## Druckempfehlung

- **Testperson:** nur `familienplanner.md` / `taskplanner.md` / `evalrunner.md` (eine Rolle).
- **Team / Moderation:** `MODERATION-UND-RUNNER.md` + `UI-FEATURES-KATALOG.md` digital oder zweiter Ausdruck **ohne** Einblick der Testperson.
