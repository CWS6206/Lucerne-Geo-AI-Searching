# Lucerne Geo-AI Searching Tool

Copyright by Dr. René Bäder (PhDs)

Lucerne Geo-AI Searching Tool ist eine Web-Applikation fuer Standort- und Grundstuecksanalysen im Kanton Luzern. Die Anwendung kombiniert offizielle Geodaten wie WFS-Layer und OEREB-Auszug mit KI-gestuetzten Auswertungen.

## Kernfunktionen

1. Interaktive Kartenoberflaeche fuer die Auswahl von Standorten im Kanton Luzern.
2. Asynchrone Abfrage kantonaler Geodaten-Layer.
3. Automatische Ermittlung von EGRID und OEREB-Daten fuer Einzelstandorte.
4. KI-gestuetzte Standortberichte fuer Privatpersonen oder Geschaeftskunden.
5. Einzelanalyse oder direkter 1-vs-1-Vergleich zweier Standorte.
6. Konfigurierbarer Suchradius und frei waehlbare Geodaten-Layer.

## Lizenz

Dieses Projekt steht unter der GNU General Public License v3.0 or later (GPL-3.0-or-later). Details stehen in der Datei `LICENSE`.

## Installation & Setup

### Voraussetzungen

- Docker Desktop oder Docker mit Docker Compose
- Optional fuer lokale Frontend-Entwicklung: Node.js
- Ein API-Key fuer Google Gemini oder OpenAI

### Starten mit Docker

```bash
cd Lucerne-Geo-AI-Searching-Tool
docker-compose up --build -d
```

Danach ist die Anwendung erreichbar unter:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Nutzung

1. App im Browser unter http://localhost:3000 oeffnen.
2. Links unten die Einstellungen aufklappen.
3. Gemini- oder OpenAI-Key eintragen.
4. Einen Punkt auf der Karte setzen.
5. Auf "Standort analysieren" klicken.
