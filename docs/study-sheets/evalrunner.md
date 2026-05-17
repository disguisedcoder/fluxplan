# FluxPlan – Aufgaben-Sheet · Rolle Eval-Runner

## Freundlicher Stresstest: Einmal ordentlich prüfen

Stell dir vor: Du bist heute die Person, die FluxPlan vor einer Studie kontrolliert ausprobiert. Du willst nicht alles kaputtmachen, sondern prüfen, ob die App bei realistischen Aktionen verständlich bleibt.

FluxPlan ist heute dein Testplaner. Sei neugierig, aufmerksam und ruhig auch ein bisschen kritisch. Es geht darum, wichtige Wege bewusst zu nutzen und später nachvollziehen zu können, was passiert ist.

## Vorab

- Bitte keine echten privaten Daten eingeben.
- Erfundenes Testchaos ist okay.
- Du arbeitest nacheinander mit zwei Varianten:
  - **Phase 1: Baseline** – FluxPlan ist eine normale Aufgaben- und Planungs-App ohne Vorschläge.
  - **Phase 2: Adaptive** – FluxPlan darf dir Vorschläge anzeigen, aber du entscheidest immer selbst.
- In **Baseline** ist der Bereich **Anpassungen** nicht nutzbar. Wenn du ihn auswählst, springt FluxPlan zurück zu **Heute**. Das ist in dieser Phase normal.
- Ab **Adaptive** ist **Anpassungen** erreichbar. Dort findest du Vorschläge, Erklärungen und den Verlauf deiner Entscheidungen.
- Die **Start-Aufgaben** sind vorbereitet. Damit sind die Aufgaben gemeint, die nach dem Start bereits sichtbar sind. Bitte baue sie nicht von Hand neu auf.
- Beim Umstieg auf Adaptive verwendest du denselben Pseudonym-Code wie vorher.
- Bitte nichts zurücksetzen und am Ende nichts exportieren.
- Wenn du fertig bist, melde kurz: **Ich bin fertig.**

## Phase 0 – Start und vorbereitete Aufgaben

1. Öffne FluxPlan.
2. Gib deinen zugeteilten Code ein, z. B. `E01`.
3. Wähle die Variante wie angesagt: **Baseline** oder **Adaptive**.
4. Starte die Session.
5. Prüfe, ob vorbereitete Test-Aufgaben sichtbar sind.
6. Wenn keine Aufgaben sichtbar sind, melde dich kurz. Wenn alles passt, öffne **Heute**.

Kurzer Check: Du solltest Aufgaben mit Wörtern wie `Trigger`, `Erinnerung`, `Konflikt`, `Export` oder `Reset` sehen. Das sind hier nur Test-Suchwörter.

## Phase 1 – Baseline: Kontrolllauf ohne Vorschläge

### Runde 1: Was liegt im Testset?

Du willst zuerst verstehen, welche vorbereiteten Testaufgaben es gibt.

1. Öffne **Heute**.
2. Sieh dir die **To-Do-Liste** an. Das ist eine kurze Auswahl von Aufgaben, die gerade wichtig sein könnten.
3. Öffne **Aufgaben**.
4. Suche nach `Trigger`.
5. Suche danach nach `Export`.
6. Nutze einmal einen Filter oder eine Sortierung.
7. Öffne **Kalender**.

Achte kurz darauf, ob du verstehst, warum manche Aufgaben unter **Heute** auftauchen und andere eher unter **Aufgaben** oder **Kalender**.

### Runde 2: Eine erledigte Aufgabe wiederfinden

Ein Kontrollpunkt ist geschafft, aber du willst prüfen, ob erledigte Aufgaben nachvollziehbar bleiben.

1. Suche in **Aufgaben** nach `Export-Check`.
2. Markiere `Export-Check` als erledigt, falls du sie findest. Wenn nicht, nimm eine andere Eval- oder Check-Aufgabe.
3. Suche die erledigte Aufgabe danach wieder.
4. Öffne sie wieder, also setze sie zurück auf offen. Falls du sie nicht sofort findest, nutze in **Aufgaben** die Ansicht für alle oder erledigte Aufgaben.

### Runde 3: Testaufgaben bewusst verändern

Du willst prüfen, ob Änderungen an vorbereiteten Aufgaben sichtbar und wieder auffindbar sind.

1. Suche unter **Aufgaben** nach `Konflikt`.
2. Öffne eine passende Aufgabe, zum Beispiel `Konflikt-Block 1`, `Konflikt-Block 2` oder `Überlast: noch ein Block (absichtlich)`.
3. Ändere die Priorität.
4. Ändere bei einer zweiten Aufgabe den Titel leicht oder passe Datum/Kategorie an.
5. Prüfe danach in der Aufgabenliste, ob du deine Änderungen wiederfindest.

### Runde 4: Eine Aufgabe ohne Datum einplanen

Im Testset liegen auch Aufgaben ohne Datum. Du willst eine davon konkret einplanen.

1. Suche nach `Trigger` oder `Backlog`.
2. Plane eine Aufgabe ohne Datum für morgen ein.
3. Öffne **Kalender**.
4. Prüfe, ob du die Aufgabe dort wiederfindest.

### Runde 5: Kalender und Konflikte ansehen

Jetzt prüfst du, ob der Kalender bei vielen Testaufgaben noch verständlich bleibt.

1. Öffne **Kalender**.
2. Wechsle einmal zwischen Monat und Woche.
3. Suche Aufgaben rund um `Konflikt`, `Überlast` oder `Erinnerung`.
4. Schau, ob dir auffällt, warum manche Einträge anders aussehen als andere.

Du musst nichts optimieren. Es reicht, wenn du dir einen Überblick verschaffst.

### Runde 6: Neue Testaufgaben anlegen

Für den Kontrolllauf kommen neue Testfälle dazu. Lege fünf neue Aufgaben an:

1. Aufgabe mit Datum und Uhrzeit: `Baseline-Test A heute prüfen`
2. Aufgabe mit Datum: `Baseline-Test B morgen anschauen`
3. Aufgabe ohne Datum: `Baseline-Test C ohne Termin parken`
4. Aufgabe mit hoher Priorität: `Baseline-Test D wichtig markieren`
5. Test-Aufgabe zum Löschen: `Export-Test löschen`

Danach:

1. Lösche die Aufgabe `Export-Test löschen`.
2. Öffne wieder **Heute**.
3. Markiere eine deiner neuen Aufgaben als erledigt.
4. Öffne **Kalender** und prüfe, ob deine neuen Aufgaben auftauchen.

## Mini-Pause

Überlege kurz:
War die normale Version nachvollziehbar? Gab es einen Moment, der unnötig mühsam war?

Du musst dazu nichts aufschreiben, außer du wirst ausdrücklich darum gebeten.

## Phase 2 – Auf Adaptive umstellen

Jetzt darf FluxPlan Vorschläge machen. Wichtig: FluxPlan soll nichts heimlich umplanen. Änderungen passieren nur, wenn du einen Vorschlag annimmst.

1. Öffne **Einstellungen**.
2. Gib denselben Pseudonym-Code ein wie vorher.
3. Wähle **Adaptive**.
4. Bestätige die adaptive Variante.
5. Übernimm die vorgeschlagene **Eingriffsstufe**. Damit ist nur gemeint, wie zurückhaltend oder häufig FluxPlan Vorschläge machen soll.
6. Starte oder übernimm die neue Phase.
7. Setze den vorbereiteten Aufgaben-Stand nicht zurück, außer du wurdest ausdrücklich dazu angewiesen.
8. Öffne **Heute** und prüfe, ob deine bisherigen Aufgaben noch da sind.

Falls direkt schon ein Vorschlag als Banner erscheint, lasse ihn ruhig kurz stehen. Du schaust dir Vorschläge später bewusst an.

## Phase 2A – Erst normal weiterarbeiten

Bevor du neue Testaufgaben einträgst, nutze FluxPlan erst wieder wie eben.

1. Öffne **Heute**.
2. Öffne **Aufgaben**.
3. Suche nach `Erinnerung`.
4. Öffne **Kalender**.
5. Öffne wieder **Heute**.
6. Öffne **Erstellen**, schau dir das Formular kurz an und gehe wieder zurück, ohne etwas speichern zu müssen.

## Phase 2B – Kontrollierte Testfälle anlegen

Jetzt legst du mehrere ähnliche Testaufgaben an. Dadurch kann FluxPlan später Vorschläge zeigen, ohne dass du sofort am Anfang etwas erzwingst.

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
- Öffne danach **Kalender**.

## Phase 2C – Vorschläge bewusst ansehen

Vorschläge können oben als Banner auf vielen Hauptseiten erscheinen oder als Karten im Bereich **Anpassungen**.

1. Öffne **Heute**.
2. Öffne **Aufgaben**.
3. Öffne **Kalender**.
4. Öffne **Anpassungen**.

Wenn ein Vorschlag sichtbar ist:

1. Lies einen Vorschlag vollständig.
2. Schau dir **Warum sehe ich das?** an, falls es sichtbar ist.
3. Schau dir **Was passiert beim Annehmen?** an, falls es sichtbar ist.
4. Entscheide dich bei mehreren Vorschlägen nacheinander bewusst.
5. Teste **Rückgängig** oder **Undo**, falls sichtbar. Danach kann derselbe Vorschlag wieder offen erscheinen.
6. Probiere bei weiteren Vorschlägen unterschiedliche Antworten aus:
   - **Annehmen** heißt: FluxPlan setzt den Vorschlag um.
   - **Nicht jetzt** oder **Später erinnern** heißt: Du möchtest später entscheiden.
   - **Ablehnen** heißt: Du möchtest diesen Vorschlag nicht übernehmen.
7. Wenn etwas verschoben oder abgelehnt ist, suche nach **Wieder öffnen** und teste es einmal, falls es angeboten wird.
8. Öffne im Bereich **Anpassungen** auch den Tab **Personalisierung**. Schau kurz, ob dort eine Einstellung zu Erinnerungs-Vorschlägen angezeigt wird. Du musst dort nichts ändern.

Wenn dir kein Banner auffällt:

1. Öffne **Anpassungen**. Dort können trotzdem Vorschlagskarten warten.
2. Wenn auch dort nichts offen ist: Öffne den Tab **Personalisierung**.
3. Klicke einmal auf **Jetzt prüfen**.
4. Öffne danach wieder den Tab **Anpassungen**.
5. Wenn weiterhin nichts offen ist, einfach weitermachen. Kein sichtbarer Vorschlag ist kein Fehler.

## Phase 2D – Wirkung prüfen

Wenn du einen Vorschlag angenommen hast, prüfe kurz, was sich verändert hat:

- Bei einem Hinweis zur To-Do-Liste: Öffne **Heute**.
- Bei einem Hinweis zu Erinnerungen: Öffne die betroffene Aufgabe.
- Bei einem Hinweis zum Kalender: Öffne **Kalender**.
- Bei einem Hinweis zum Formular: Öffne **Erstellen**.
- Bei einem Hinweis zur Startansicht: Nutze **Start** in der Navigation.

Achte darauf, ob klar ist, was FluxPlan verändert hat und was gleich geblieben ist.

## Abschluss

Wenn du fertig bist: kurz **Ich bin fertig.** melden. Bitte löse selbst keinen Export aus.

## Kurzfragebogen

Skala: **1 = stimme gar nicht zu**, **5 = stimme voll zu**.

Bitte bewerte jede Aussage mit einer Zahl von 1 bis 5. Wenn du eine Aussage wirklich nicht beurteilen kannst, schreibe **nicht beurteilt** daneben, statt zu raten.

1. Ich konnte mich in FluxPlan schnell zurechtfinden.
2. Ich habe die wichtigsten Funktionen ohne längere Erklärung gefunden.
3. Die Oberfläche wirkte ruhig und nicht überladen.
4. Wenn FluxPlan einen Vorschlag angezeigt hat, konnte ich verstehen, warum er erschienen ist.
5. Ich hatte das Gefühl, die Kontrolle über meine Planung zu behalten.
6. Die Buttons **Annehmen**, **Nicht jetzt**, **Ablehnen** und **Rückgängig** waren verständlich.
7. Die Vorschläge wirkten für meine Aufgabenplanung hilfreich.
8. Die Vorschläge haben mich eher unterstützt als abgelenkt.
9. Der Bereich **Anpassungen** zeigte verständlich, welche Informationen FluxPlan für Vorschläge berücksichtigt.
10. Ich würde eine App, die nur Vorschläge macht und mich entscheiden lässt, eher nutzen als eine App, die meine Planung automatisch verändert.

## Offene Kurzfragen

Bitte antworte jeweils kurz in 1 bis 2 Sätzen.

1. Konntest du nachvollziehen, warum FluxPlan dir etwas vorgeschlagen hat? Woran hast du das gemerkt?
2. Hat sich die adaptive Variante für dich eher wie Hilfe, Ablenkung oder neutral angefühlt? Bitte kurz begründen.
3. Hat die adaptive Variante dir Arbeit abgenommen oder eher zusätzliche Entscheidungen erzeugt? Bitte kurz begründen.
