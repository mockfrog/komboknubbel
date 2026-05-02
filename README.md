# Kombo-Knubbel (Local & Docker Edition)

Dieses Projekt ist eine lokal gehostete Version von Kombo-Knubbel, die ursprünglich aus Google AI Studio exportiert und auf eine lokale Architektur umgestellt wurde. Es benötigt keine Cloud-Anbindung an Firebase mehr.

## Features

- **Lokal & Privat:** Alle Daten bleiben auf deinem Rechner oder Server.
- **SQLite Datenbank:** Highscores und Spielzustände werden in einer lokalen `data.db` gespeichert.
- **Echtzeit-Multiplayer:** Läuft über WebSockets (Socket.io) statt Firebase.
- **Dockerized:** Einfache Bereitstellung mit einem einzigen Befehl.

## Voraussetzungen

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Schnellstart

1. **Projekt klonen oder herunterladen.**
2. **Container starten:**
   ```bash
   docker-compose up --build
   ```
3. **App öffnen:**
   Gehe in deinem Browser auf [http://localhost:3001](http://localhost:3001)

## Architektur

Das Projekt nutzt einen Multi-Stage Docker-Build:
- **Frontend:** React + Vite (TypeScript).
- **Backend:** Node.js + Express.
- **Echtzeit:** Socket.io für die Spiel-Synchronisation.
- **Datenbank:** SQLite (`better-sqlite3`) für persistente Speicherung.

## Daten-Persistenz

Die Datenbank befindet sich im Container unter `/app/data/data.db`. Durch das Docker-Volume wird diese Datei lokal in den Ordner `./data` auf deinem Host-System gespiegelt. So bleiben deine Highscores auch erhalten, wenn du den Container stoppst oder löschst.

---

### Entwicklung (Lokal ohne Docker)

Falls du ohne Docker entwickeln möchtest:

1. **Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
2. **Frontend:**
   ```bash
   npm install
   npm run dev
   ```
   *Hinweis: Du musst die Umgebungsvariablen für die API-URLs ggf. in einer `.env` anpassen.*
