# Feature: Khaos-Knubbel Spielmodus

## Konzept
Ein neuer Spielmodus, der über das klassische Würfeln hinausgeht. Spieler können durch das Erzielen starker Kombinationen (z.B. Yahtzee, Straights) "Bonus-Würfe" generieren, um PowerUps zu aktivieren. Diese PowerUps beeinflussen das eigene Spiel oder das eines Gegners.

## Geplante Mechaniken

### Bonus-System
- Trigger: Erreichen bestimmter Kombinationen oder zufällig.
- Aktivierung: Ein zusätzlicher "Bonus-Wurf" bestimmt das erhaltene PowerUp.

### PowerUp-Kategorien
#### Offensive (gegen Gegner)
- **2von3** Der Gegner hat eine Runde keinen dritten Wurf.
- **JetztNicht** Der Gegner kann für 5 Runden keinen Knubbel (5 gleiche) eintragen
- **Nebel** Der Gegner kann eine Runde während des Würfelns nicht sehen, welche Felder auf dem Spielplan noch frei sind.
- **Punkte-Spender** Der Gegner muss dir die Punkte seiner letzten Runde schenken.
- ...

#### Defensive (für sich selbst)
- **Reroll:** Erlaubt einmal einen zusätzlichen 4. Wurf
- **Stabiler Stand:** Immunität gegen gegnerische Effekte.
- **Punkte-Booster:** Multiplikator für den nächsten Zug.
- ...

## To-Do
- [ ] Noch ein paar Ideen für PowerUps erstellen
- [ ] Architektur für Spielmodus-Auswahl definieren.
- [ ] PowerUp-Logik in `services/` implementieren.
- [ ] State-Management für PowerUps in `OnlineGame.tsx` erweitern.
- [ ] UI-Elemente für PowerUps (Anzeige/Interaktion) erstellen. Hübsche Effekte bei der Ausführung wären cool.
