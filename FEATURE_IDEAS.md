# Feature: Khaos-Knubbel Spielmodus

## Konzept
Ein neuer Spielmodus, der über das klassische Würfeln hinausgeht. Spieler erhalten am Rundenende per Zufall Spezialwürfel, die Power-Ups freischalten. Diese Power-Ups können taktisch eingesetzt werden, um das eigene Spiel zu erleichtern oder gegnerische Spieler zu sabotieren.

## Implementierte Mechaniken

### Power-Up Zuweisung (Spezialwürfel)
- **Trigger**: Am Ende jedes Zugs besteht eine flache Chance von **35 %**, dass ein Spieler einen Spezialwürfel erhält (unabhängig vom erzielten Score oder der Spalte).
- **Aktivierung**: Der Spezialwürfel wird automatisch gewürfelt und fügt dem Inventar des Spielers direkt eines der 8 implementierten Power-Ups hinzu.

### Power-Up Kategorien & Details

#### Offensive Power-Ups (Sabotage)
- **2von3 Runde** (`two_rolls_only`): Begrenzt den Gegner in seiner nächsten Runde auf max. 2 statt 3 Würfe.
- **JetztNicht** (`no_yahtzee`): Verhindert 5 Runden lang, dass der Gegner einen Knubbel (Yahtzee) eintragen kann.
- **Nebel** (`blind_sheet`): Verdeckt dem Gegner für 1 Runde während des Würfelns die freien Felder auf seinem Spielzettel.
- **Schwere Last** (`no_hold`): Verhindert, dass der Gegner in seiner nächsten Runde Würfel halten darf.
- **Punkte-Spender** (`points_spender`): Stiehlt dem Gegner die Punkte seiner letzten Eintragung und schreibt sie dem eigenen Bonuskonto gut.

#### Defensive / Hilfs-Power-Ups
- **Reroll +1** (`reroll`): Gewährt sofort einen zusätzlichen 4. Wurf in der laufenden Runde.
- **Stabiler Stand** (`immune`): Macht den Spieler 3 Runden lang immun gegen alle feindlichen Sabotage-Angriffe.
- **Punkte-Booster** (`score_booster`): Verdoppelt die Punkte der nächsten Eintragung auf dem Zettel.

## Status der Entwicklung
- [x] Architektur für Spielmodus-Auswahl definieren (Lobby & Leaderboard-Integration).
- [x] Power-Up-Logik in `services/multiplayer.ts` implementieren.
- [x] State-Management für Power-Ups in `OnlineGame.tsx` erweitern.
- [x] UI-Elemente für Power-Ups (Inventar, Zielauswahl für Sabotage, Animationen bei Ausführung) erstellen.
- [x] Regeln anpassen (Integration von Spezialwürfeln und allen Power-Ups).
