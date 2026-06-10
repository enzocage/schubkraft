# THRUST — Retro C64 Clone in HTML5

Ein hochentwickelter Retro-Klon des Spieleklassikers *Thrust* (1986) in modernem HTML5, optimiert für Performance (60 FPS), mit vektorbasierten Visuals, dynamischem Vektorglow (Bloom), CRT-Effekten, generativer Audio-Engine (Web Audio API) und einem umfangreichen In-Game-Level-Editor.

## Features

- **Physik & Simulation**: PBD-basierte Seilphysik (Verlet-Tether) zwischen Raumschiff und Pendel (Pod), subgesteppter Symplektischer Euler-Integrator für präzise Kollisionsauflösung und Massen-Dämpfung.
- **Retro-Ausrüstung**:
  - CRT-Scanlines und Krümmungs-Vignette (an-/ausschaltbar).
  - Vektor-Bloom (Glow) für flüssiges Leuchten von Triebwerken, Schilden und Schüssen.
  - Generative Chiptune-Musik & synthetisierte Soundeffekte via Web Audio API.
- **Umfangreiche Kampagne**: 8 einzigartige Levels mit ansteigender Schwerkraft, Kraftfeldern, automatischen Abwehrtürmen, Reaktorüberlastung und einer Level-Looping-Mechanik mit invertierter Schwerkraft.
- **Massiver Level-Editor**:
  - Komfortables Zeichnen von Terrain-Polygonen.
  - Objektplatzierung (Treibstoff, Abwehrtürme, Schalter, Kraftfeldtüren, Reaktor) via Direkt-Auswahlliste.
  - Editierbare Objekteigenschaften (Tür-Maße, Schalter-IDs, Turret-Winkel) direkt im Editor-Properties-Panel.
  - Undo-System (Rückgängig-Funktion via Z/Schaltfläche).
  - Kamera-Pan (Mittelklick-Ziehen oder Space+Linksklick-Ziehen) und Zoom (+ / -).
  - Raster-Snapping (Free, 4px, 8px, 16px, 32px).
  - Vorgefertigte Terrain-Muster (Pfeiler, Reaktortiegel, Lande-Pedestal, Plattformen).
  - Direkt-Test-Modus (T) und JSON Export/Import zum Teilen von Levels.

## Steuerung (Controls)

### Gameplay

- **W** / **Pfeiltaste Oben**: Triebwerk (Thrust) aktivieren.
  - *Spezial-Feature*: W-Taste lange gedrückt halten (> 250ms) schaltet das Triebwerk ab und aktiviert das Schild / den Traktorstrahl (genau wie die Shift-Taste).
- **A** / **Pfeiltaste Links**: Nach links drehen.
- **D** / **Pfeiltaste Rechts**: Nach rechts drehen.
- **S** / **Shift**: Schild & Traktorstrahl (Tractor Beam) aktivieren. Zieht das Pendel oder saugt Treibstoff an.
- **Leertaste (Space)**: Laser schießen.
- **P**: Spiel pausieren (Resume/Restart/Mute-Menü).
- **E**: Level-Editor öffnen.

### Level Editor

- **Mausklick**: Polygon-Punkte setzen oder Objekte platzieren (je nach Modus).
- **Mittelklick-Ziehen / Space + Linksklick-Ziehen**: Kamera bewegen (Pan).
- **Zoom + / Zoom -**: Ansicht vergrößern / verkleinern.
- **Z** / **Undo**: Letzten Schritt rückgängig machen.
- **T** / **Testen**: Aktuelles Level direkt spielen/testen (1 Leben).
- **Entfernen (Löschen-Modus)**: Klick auf Vertex oder Objekt entfernt dieses.

## Installation / Starten

Das Spiel benötigt keine externe Compilation oder Webserver-Setup. Zum Starten kann einfach die `index.html` im Browser geöffnet werden. 

Für das Laden von lokalen Spielständen oder vollen Audio-Aktivierungen empfiehlt sich das Starten über einen lokalen Webserver:

```bash
npx http-server -p 8000
```

Danach im Browser `http://localhost:8000` aufrufen.
