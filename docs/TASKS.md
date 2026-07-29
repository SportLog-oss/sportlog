\# SportLog – Product Redesign \& Feature Roadmap



\## Ziel



SportLog soll zu einer modernen Premium-Plattform für Leistungssportler weiterentwickelt werden. Die App soll Training, Gesundheit, mentale Gesundheit und KI-Unterstützung intelligent miteinander verbinden und dabei eine moderne, schnelle und intuitive Benutzererfahrung bieten.



\---



\# Arbeitsweise



Bevor Änderungen vorgenommen werden:



\* Analysiere die gesamte Codebasis.

\* Lies `docs/VISION.md` und `docs/DEVELOPMENT\_RULES.md`.

\* Analysiere \*\*alle Bilder im Ordner `docs/screenshots/`\*\*.

\* Nutze die Screenshots ausschließlich als Inspiration für Funktionen, Benutzerführung und Design.

\* Kopiere keine Designs 1:1, sondern entwickle eine eigenständige Premium-Oberfläche.



Zusätzliche Inspiration für den Bereich Mentale Gesundheit:



https://youtu.be/E6Ij5msWaTM?si=a8OBBaEFFXxW68b



\---



\# Aufgaben



\## 1. Branding



\* Den Namen \*\*Sportlog\*\* überall in \*\*SportLog\*\* ändern.

\* Alle Titel, Header und Texte entsprechend anpassen.



\---



\## 2. Navigation



\* Den Reiter \*\*KI Coach\*\* ganz nach rechts verschieben.

\* Navigation vereinheitlichen und verbessern.



\---



\## 3. KI Coach



Der KI Coach soll der zentrale Bestandteil der App werden.



\### MCP-Integration



Der KI Coach soll direkten Zugriff auf den MCP-Server erhalten und sämtliche verfügbaren Daten intelligent nutzen, unter anderem:



\* Trainings

\* Gesundheitsdaten

\* Krankheiten

\* Verletzungen

\* Schlaf

\* Körperdaten

\* Leistungsentwicklung

\* Trainingshistorie

\* Bildanalysen

\* zukünftige Datenquellen



\### Chat-System



Implementiere:



\* mehrere Chatverläufe

\* neue Chats

\* Chats speichern

\* Chats umbenennen

\* Chats löschen

\* Suchfunktion



\### Leistungssport



Die KI muss berücksichtigen, dass die App für Leistungssportler entwickelt wird.



Antworten sollen Trainingsbelastung, Regeneration, Wettkämpfe, Trainingslager, Krankheiten und langfristige Leistungsentwicklung berücksichtigen. Vermeide pauschale Empfehlungen, das Training einfach zu reduzieren.



\### Performance



Optimiere:



\* Antwortgeschwindigkeit

\* Datenabfragen

\* Rendering

\* Streaming



\---



\## 4. Bildanalyse



Die Bildanalyse funktioniert derzeit nicht zuverlässig.



Bitte:



\* Fehler analysieren

\* Fehler beheben

\* Werte korrekt erkennen

\* Werte korrekt speichern



Nach erfolgreicher Analyse soll eindeutig angezeigt werden:



\* welche Werte erkannt wurden

\* welche Werte gespeichert wurden

\* welchem Training die Werte zugeordnet wurden



\---



\## 5. Trainingsnavigation



Während eines Trainings soll jederzeit möglich sein:



\* über einen Zurück-Button zurückzukehren

\* per Zurück-Geste zurückzugehen (falls unterstützt)

\* Training sauber zu verlassen



\---



\## 6. Trainingsanalyse



Die Trainingsanalyse soll modernisiert und funktional an Garmin Connect orientiert werden.



\### Übersicht



\* wichtigste Kennzahlen

\* KI-Zusammenfassung der Einheit

\* Belastung

\* Erholung

\* Verbesserungsvorschläge



\### Trainingsprotokoll



Nach jeder Einheit sollen dokumentiert werden können:



\* Schmerzen

\* Verletzungen

\* Muskelkater

\* subjektives Belastungsempfinden

\* Notizen



Diese Informationen sollen dem KI Coach später zur Verfügung stehen.



\### Analysebereiche



Unter anderem:



\* Übersicht

\* Herzfrequenz

\* Pace

\* Geschwindigkeit

\* Leistung

\* Splits

\* Höhenmeter

\* Belastung

\* Erholung



\### Diagramme



Diagramme zunächst kompakt darstellen.



Beim Antippen:



\* Vollbild

\* Zoom

\* Scrollen

\* detaillierte Analyse



\---



\## 7. Gesundheitsbereich



Erweitere den Gesundheitsbereich um ein vollständiges Krankheitsprotokoll.



Dokumentierbar:



\* Beginn

\* Ende

\* Dauer

\* Symptome

\* Medikamente

\* Arztbesuche

\* Trainingspause

\* Rückkehr ins Training

\* Notizen



\---



\## 8. Mentale Gesundheit



Erstelle einen eigenen Bereich für mentale Gesundheit.



Inspiration:



\* Apple Health

\* Apple Mindfulness

\* Video-Link

\* Screenshots



Funktionen:



\* tägliche Stimmung

\* Motivation

\* Stress

\* mentale Energie

\* Schlafqualität

\* täglicher Check-in

\* moderne Animationen

\* hochwertige Visualisierungen



\---



\## 9. Erinnerungen



Implementiere intelligente Erinnerungen für:



\* Training dokumentieren

\* Schmerzen erfassen

\* Krankheiten aktualisieren

\* mentale Gesundheit dokumentieren

\* Tagescheck durchführen



\---



\# Qualitätsanforderungen



\* Clean Code

\* Hohe Performance

\* Moderne Architektur

\* Wiederverwendbare Komponenten

\* Konsistentes Premium-Design

\* Flüssige Animationen

\* Gute Accessibility

\* Skalierbare Struktur



\---



\# Abschluss



Nach Abschluss der Umsetzung:



\* Änderungen dokumentieren

\* Geänderte Dateien auflisten

\* Migrationen dokumentieren

\* Offene Punkte benennen

\* Weitere sinnvolle Verbesserungen eigenständig vorschlagen und – wenn passend – direkt umsetzen, sofern sie zur Vision von SportLog als Premium-App für Leistungssportler beitragen.



