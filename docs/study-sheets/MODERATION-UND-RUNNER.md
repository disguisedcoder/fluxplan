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
2. **Demo geladen:** Rolle stimmt (F01/T01/E01 …); Proband hat **kein** zweites Demo-Laden nach Umschalten (siehe Sheets).
3. **Bei Adaptive:** Nach Navigations- und Aufgaben-Phasen ggf. kurz prüfen (ohne Proband zu führen):
   - Oben auf **den meisten Hauptseiten** (nicht unter `/anpassungen`) kann ein **Vorschlags-Banner** erscheinen, sobald ein pending Vorschlag existiert — **normal**, kein Bug.
   - **`/anpassungen`** → Tab „Anpassungen“: pending Karten mit **farbigem Rand**; dort kein doppeltes Banner oben.
   - Tab **Personalisierung**: u. a. Karte **„Erinnerungs-Vorschläge vertagen“** (Tage bis zum nächsten Erinnerungs-Vorschlag nach „Nicht jetzt“).
4. **Technik:** Wenn gar nichts Adaptives sichtbar: Eingriffsstufe, Master-Toggle, ggf. „Heuristiken prüfen“ in Personalisierung (siehe Katalog §4).

---

## Zuordnung Sheet → typische UI-„Beobachtungspunkte“ (Adaptive)

| Sheet-Rolle | Phase mit viel Nutzung | Was in der UI *kann* (nicht muss) zusätzlich auffallen |
| --- | --- | --- |
| **Eval-Runner** | Phase 2A Navigation, 2B viele Aufgaben mit Datum/Erinnerung | Banner (mehrere Seiten); Vorschläge zu Chips / Einklappen / Ausklappen; `Anpassungen` füllt sich |
| **Taskplanner** | Filter, Erstellen, viele Tasks | Formular-Hinweise (u. a. Überlappung bei Datum/Uhrzeit); Kalender + Liste |
| **Familienplanner** | Kalender, Termine, Dauer | Konflikt-Hinweis-Vorschlag (Engine); Kalender-Markierungen ohnehin sichtbar |

Im Zweifel: **Katalog §4** öffnen — dort ist regelbasiert beschrieben, **wo** und **was** sichtbar wird.

---

## Druckempfehlung

- **Proband:** nur `familienplanner.md` / `taskplanner.md` / `evalrunner.md` (eine Rolle).
- **Runner-Tisch:** `MODERATION-UND-RUNNER.md` + `UI-FEATURES-KATALOG.md` digital oder zweiter Ausdruck **ohne** Probandenblick.
