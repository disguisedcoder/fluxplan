# FluxPlan – Aufgaben-Sheet · Rolle Eval-Runner
## Freundlicher Stresstest: Einmal leicht rütteln, bitte nichts zerlegen

Du testest heute FluxPlan etwas gezielter. Nicht, um die App kaputtzumachen, sondern um zu sehen, ob sie unter realistischen Aktionen verständlich bleibt.

Du bist also nicht perfekte Testperson, sondern eher: neugierig, aufmerksam, leicht kritisch. Eine gute Mischung.

## Vorab
- Bitte keine echten privaten Daten eingeben.
- Erfundenes Testchaos ist okay.
- Du testest zwei Phasen:
  - Phase 1: Baseline – normale Aufgaben- und Planungs-App ohne adaptive Vorschläge.
  - Phase 2: Adaptive – FluxPlan darf Vorschläge machen, aber du entscheidest.
- In **Baseline** gibt es keinen nutzbaren Bereich **Anpassungen** (der Menüpunkt springt zurück zu **Heute**). Ab **Adaptive** ist **Anpassungen** normal erreichbar.
- Die **Start-Aufgaben** sind vorbereitet (Demo/Seed/Setup); bitte nicht alles von Hand neu aufbauen.
- Beim Umstieg auf Adaptive denselben Pseudonym-Code verwenden.
- Nichts zurücksetzen.
- Am Ende nichts exportieren. Melde dich kurz, wenn du durch bist (wie vereinbart).

## Phase 0 – Start und vorbereitete Aufgaben
1. Öffne FluxPlan.
2. Gib deinen zugeteilten Code ein (z. B. `E01`).
3. Wähle die Variante wie angesagt (**Baseline** / **Adaptive**) und starte die Session.
4. Prüfe, dass die **Start-Aufgaben** für dich sichtbar sind (Setup vor dem Test). Wenn nicht, kurz melden — danach öffnest du **Heute**.

Kurzer Check: Du solltest Aufgaben mit Trigger-, Export-, Erinnerungs- oder Konflikt-Bezug sehen. Wenn nicht, kurz Bescheid sagen.

## Phase 1 – Baseline: Kontrolllauf
Ziel: Grundfunktionen bewusst einmal nutzen.

### Runde 1: Sichtprüfung
1. Öffne `Heute`.
2. Sieh dir die Fokusliste an.
3. Öffne `Aufgaben`.
4. Suche nach `Trigger`.
5. Suche nach `Export`.
6. Nutze Filter oder Sortierung.
7. Öffne `Kalender`.

### Runde 2: Bestehende Aufgaben bewegen
1. Markiere zwei Aufgaben als erledigt.
2. Öffne eine erledigte Aufgabe wieder.
3. Bearbeite eine Aufgabe und ändere die Priorität.
4. Bearbeite eine zweite Aufgabe und ändere Datum oder Kategorie.
5. Plane eine Aufgabe ohne Datum ein, falls möglich.
6. Prüfe im Kalender, ob sich etwas sichtbar verändert hat.

### Runde 3: Neue Aufgaben anlegen
Lege fünf neue Aufgaben an.

1. `Baseline-Test A heute prüfen`
   - mit Datum und Uhrzeit

2. `Baseline-Test B morgen anschauen`
   - mit Datum

3. `Baseline-Test C ohne Termin parken`
   - ohne Datum

4. `Baseline-Test D wichtig markieren`
   - hohe Priorität

5. `Export-Test löschen`
   - Wegwerf-Aufgabe

Danach:
1. Lösche `Export-Test löschen`.
2. Markiere eine deiner neuen Aufgaben als erledigt.
3. Öffne `Heute`.
4. Öffne `Kalender`.

### Runde 4: Kleiner Realitätsmoment
Arbeite 2 Minuten frei weiter:

- eine Aufgabe ändern
- eine Aufgabe abhaken
- zwischen Heute, Aufgaben und Kalender wechseln
- kurz prüfen, ob du dich noch zurechtfindest

Wenn etwas unklar ist: nicht lange suchen, einfach merken.

## Mini-Pause
Überlege kurz:
War die Baseline nachvollziehbar? Gab es einen Moment, der unnötig mühsam war?

## Phase 2 – Auf Adaptive umstellen
1. Öffne `Einstellungen`.
2. Gib denselben Pseudonym-Code ein wie vorher.
3. Wähle `Adaptive`.
4. Bestätige Adaptive.
5. Übernimm die vorgeschlagene Eingriffsstufe.
6. Starte/übernimm die neue Phase.
7. Setze den vorbereiteten Aufgaben-Stand nicht zurück, außer du wurdest ausdrücklich dazu angewiesen.
8. Öffne `Heute` und prüfe, ob deine bisherigen Aufgaben noch da sind.

## Phase 2A – Adaptive warmfahren
Führe einen Navigationslauf aus. **Wichtig:** Zählen nur Wechsel zu den Kernseiten **`Heute`**, **`Aufgaben`**, **`Kalender`**, **`Erstellen`**. Damit später u. a. eine **Startansicht** vorgeschlagen werden kann, soll **`Heute`** in dieser Phase **deutlich am häufigsten** angesteuert werden — **Richtwert: mindestens siebenmal** `Heute` öffnen, während du die anderen drei Kernseiten jeweils **weniger oft** nutzt (z. B. im Wechsel: `Heute` → kurz `Kalender` → wieder `Heute` → kurz `Aufgaben` → …).

1. Öffne `Heute`.
2. Öffne `Aufgaben`.
3. Öffne `Kalender`.
4. Öffne `Erstellen`.
5. Öffne `Aufgaben`.
6. Öffne `Kalender`.
7. Öffne `Heute`.
8. Wiederhole und ergänze die Navigation, bis du **`Heute` oft genug** erreicht hast (siehe Richtwert oben).

Das ist absichtlich etwas wiederholt. FluxPlan soll sehen, welche Bereiche du am liebsten nutzt.

## Phase 2B – Muster und Belastung erzeugen
Lege sechs neue Aufgaben an.

1. `Adaptive-Test Erinnerung A morgen`
   - mit Datum
   - wenn möglich mit Erinnerung

2. `Adaptive-Test Erinnerung B morgen`
   - mit Datum
   - wenn möglich mit Erinnerung

3. `Adaptive-Test Erinnerung C morgen`
   - mit Datum
   - wenn möglich mit Erinnerung

4. `Adaptive-Test ohne Erinnerung morgen`
   - mit Datum
   - ohne Erinnerung, falls möglich

5. `Adaptive-Test ohne Datum parken`
   - ohne Datum

6. `Adaptive-Test langer Block heute`
   - mit Datum heute
   - wenn möglich mit Dauer, z. B. 180 Minuten

Optional, falls du noch Zeit hast:
- Lege noch einen zweiten langen Block am selben Tag an, z. B. 240 Minuten.
- Öffne danach `Kalender`.

## Phase 2C – Vorschläge und Erklärungen prüfen
Es können **mehrere** Vorschläge gleichzeitig **offen** sein. Du siehst sie als **Banner** oben auf vielen Hauptseiten und/oder als Karten unter **`Anpassungen`** (Tab gleicher Name).

Wenn mindestens ein Vorschlag sichtbar ist:

1. Lies einen Vorschlag komplett (Banner oder Karte in `Anpassungen`).
2. Klicke auf `Warum?`, falls sichtbar.
3. Nimm **einen** Vorschlag an.
4. Teste `Rückgängig` oder `Undo`, falls sichtbar — der Vorschlag kann danach wieder **offen** erscheinen.
5. Bearbeite **weitere** offene Vorschläge: lehne ab, wähle `Nicht jetzt`, oder vertage — so siehst du unterschiedliche Zustände.
6. Wenn etwas **vertagt** oder **abgelehnt** ist: suche nach **Wieder öffnen** (Banner, Karte oder unter `Anpassungen`), und teste es einmal.
7. Öffne den Tab **`Personalisierung`** (neben `Anpassungen`) und schau, ob etwas zu **Erinnerungs-Vorschlägen vertagen** passt — nur ansehen, nichts Pflicht.
8. Prüfe insgesamt, ob Status, Verlauf und Erklärung verständlich sind.

Wenn dir **kein** Banner auffällt:
1. Öffne **`Anpassungen`** — dort können trotzdem **Karten** mit farbigem Rand warten.
2. Wenn auch dort nichts Offenes ist: `Erstellen` öffnen, kurz eine Aufgabe mit Datum anlegen, `Heute` öffnen, Navigation aus Phase 2A kurz wiederholen.
3. Dann normal weiterarbeiten. Kein sichtbarer Vorschlag ist kein Fehler.

## Abschluss
Wenn du fertig bist: kurz **`Ich bin fertig.`** melden (wie vereinbart). Bitte löse selbst keinen Export aus.

## Kurzfragebogen
Skala: **1 = stimme gar nicht zu**, **5 = stimme voll zu**.

Bitte bewerte jede Aussage mit einer Zahl von 1 bis 5.

1. Ich konnte mich in FluxPlan schnell orientieren.
2. Die wichtigsten Funktionen waren ohne Erklärung auffindbar.
3. Die Oberfläche wirkte ruhig und nicht überladen.
4. Ich konnte nachvollziehen, warum FluxPlan einen Vorschlag angezeigt hat.
5. Ich hatte das Gefühl, die Kontrolle über meine Planung zu behalten.
6. Die Optionen Annehmen, Nicht jetzt, Ablehnen und Rückgängig waren verständlich.
7. Die Vorschläge wirkten hilfreich für meine Aufgabenplanung.
8. Die Vorschläge haben mich eher unterstützt als abgelenkt.
9. Der Bereich Anpassungen hat ausreichend transparent gemacht, was das System berücksichtigt.
10. Ich würde eine solche kontrollierte Vorschlagslogik eher nutzen als automatische Umplanung.
