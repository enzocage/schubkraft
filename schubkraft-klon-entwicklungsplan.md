# SCHUBKRAFT — C64-Klon in HTML5
## Entwicklungsplan (Single-File, Vanilla JS, Canvas 2D, Web Audio)

> Ziel: Ein vollständiger Schubkraft-Klon (inspiriert vom Klassiker von 1986) als **eine einzige HTML-Datei** — Vektor-Rendering im C64-Stil, generativer Sound ohne Samples, integrierter Level-Editor und unsichtbare Touch-Controls für Mobile. Referenz-Ästhetik gemäß den drei Screenshots: schraffierte Terrain-Flächen, dünne Outline-Vektoren, FUEL/LIVES/SCORE-Leiste.

---

## 0. Architektur-Überblick

```
index.html (Single File)
├── <canvas id="game">            Haupt-Render-Target
├── CSS                           Fullscreen, Letterbox 4:3, Pixel-Crisp
└── <script type="module">
    ├── CONST     Physik-Konstanten, Palette, Tuning-Tabelle
    ├── AUDIO     Generative SID-artige Synthese (Web Audio Graph)
    ├── INPUT     Keyboard + unsichtbare Touch-Zonen (Pointer Events)
    ├── PHYS      Schiff, Pendel (Tether), Kollision Segment↔Kreis
    ├── WORLD     Level-Daten, Entities, Türen, Trigger
    ├── RENDER    Vektor-Layer, Hatching, HUD, Screen-Shake, Flash
    ├── EDITOR    Polygon-Editor, Objekt-Platzierung, JSON-Export
    ├── GAME      State-Machine (TITLE → PLAY → EDITOR → GAMEOVER)
    └── LOOP      Fixed Timestep 60 Hz, Render interpoliert
```

**Designentscheidungen**
- **Fixed Timestep** (1/60 s, Akkumulator) — die Pendel-Physik ist steifigkeitsempfindlich; variable dt führt zu explodierenden Tether-Schwingungen.
- **Logische Auflösung 320×200** (C64), hochskaliert mit `image-rendering: pixelated`-Feeling, aber: Linien werden in voller Geräteauflösung gezeichnet (Vektor-Schärfe), nur das *Koordinatensystem* ist 320×200. Das gibt den „BBC/C64-Vektor"-Look ohne Treppen-Matsch.
- **Keine externen Libraries.** Canvas 2D reicht; Glow über `shadowBlur` sparsam oder doppeltes Zeichnen (breite transparente Linie + dünne Kernlinie).

---

## 1. Meilensteine

| # | Meilenstein | Inhalt | Definition of Done |
|---|---|---|---|
| M1 | Skeleton & Loop | Canvas, Letterbox, Fixed Timestep, Debug-Overlay | Schiff-Dreieck rotiert per Tastatur |
| M2 | Schiffsphysik | Schub (Thrust), Gravitation, Trägheit, Fuel-Verbrauch | Flugverhalten „fühlt sich nach Schubkraft an" (Tuning-Session) |
| M3 | Terrain & Kollision | Polygon-Terrain, Segment-Kollision, Tod & Respawn | Crash in Hang = Explosion, Respawn am Levelstart |
| M4 | Entities | Fuel-Zellen, Turrets (zielen + schießen), Reaktor, Pod | Turret-Kugeln treffen, Fuel per Traktorstrahl saugbar |
| M5 | Tether-Pendel | Pod ankoppeln, Stab-Constraint, gemeinsame Masse | Pod schwingt glaubwürdig, Pod-Crash = Lebensverlust |
| M6 | Reaktor & Escape | Reaktor beschießen → Countdown → Levelflucht nach oben | Kompletter Level-Loop spielbar |
| M7 | Generativer Sound | Alle Sounds prozedural (siehe §4) | Kein einziges Sample, alles Web-Audio-Graph |
| M8 | Touch-Controls | Unsichtbare Zonen, Multi-Touch, Haptik-Feedback | Auf Smartphone vollständig spielbar |
| M9 | Level-Editor | In-Game-Editor, JSON-Export/Import, LocalStorage* | Eigener Level in <5 min baubar & sofort testbar |
| M10 | Polish | Title-Screen, Attract-Mode, Highscore, Screenshake, Planetentypen (grün/rot wie Screenshots) | Release-Kandidat |

\* Hinweis: In Claude-Artifacts kein `localStorage` — dort In-Memory + JSON-Copy/Paste-Export. In der finalen Standalone-Datei `localStorage` aktivieren.

---

## 2. Physik (Herzstück)

### 2.1 Schiff
```
state: { x, y, vx, vy, angle, fuel }
THRUST_ACC   = 0.09   px/frame²   (entlang angle)
GRAVITY      = 0.022  px/frame²
ROT_SPEED    = 0.075  rad/frame
DRAG         = 0      (Schub hat KEINEN Luftwiderstand — Trägheit ist das Spiel)
FUEL_BURN    = 1 / Frame Schub, Schießen kostet nichts, Traktorstrahl 1/Frame
```
- Rotation ist **digital** (links/rechts halten), kein Analog — originalgetreu.
- Schub nur vorwärts. Landen gibt es nicht (anders als Lunar Lander) — Bodenkontakt = Tod, außer Schild aktiv.
- **Schild/Traktorstrahl** ist eine Taste: nahe Fuel → saugen; nahe Pod-Sockel → ankoppeln; Kugeln prallen am Schild ab (kostet Fuel).

### 2.2 Tether (Pod am Stab)
Klassisches Schubkraft nutzt de facto einen **starren Stab**, kein Seil:
- Modellierung als **Distanz-Constraint** zwischen Schiff (Masse `mS=1`) und Pod (Masse `mP=1.0–1.6`, Tuning): pro Substep Positionen korrigieren (Position Based Dynamics, 2–4 Iterationen), Geschwindigkeiten implizit über Verlet **oder** explizit korrigieren.
- Gesamtschwerpunkt: Schub wirkt nur aufs Schiff → Drehmoment ums System entsteht automatisch → das berühmte Aufschaukeln/Pendeln.
- Pod kollidiert eigenständig mit Terrain → Pod-Zerstörung = Mission failed.
- Stablänge: ~28 px (logisch), Ankopplung nur wenn Distanz < 34 px und Strahl aktiv.

### 2.3 Kollision
- Terrain = Liste geschlossener Polygone → Kollision **Kreis (r=4 Schiff / r=5 Pod) gegen Segment**.
- Broadphase: Segmente in einem groben Grid (Zellgröße 64 px) gebucktet — Levels können groß sein (Scrolling-Welt, mehrere Bildschirme hoch).
- Geschosse: Punkt-gegen-Segment + Punkt-gegen-Kreis (Entities).

### 2.4 Kamera
- Folgt dem Schiff mit Lookahead in Geschwindigkeitsrichtung (~40 px), weiches Lerp (0.08/frame). Bei Tether: Mittelpunkt Schiff↔Pod als Anker, Zoom bleibt fix (kein Zoom im Original).

---

## 3. Rendering — Retro-Vektor

### 3.1 Palette (aus den Screenshots)
```
Planet A (C64-Look):  Terrain #8B4A52 (hatched), Objekte #7CFC00-grün, HUD grün/gelb
Planet B (invertiert): Fläche  #3CB043 grün gefüllt+hatched, Höhle schwarz
Planet C (BBC-Look):  Terrain #E03020 rot, Linien dünner, HUD gelb/grün/rot
→ pro Level wählbar: { terrainColor, hatchStyle, objectColor, bgColor }
```

### 3.2 Hatching (der Signature-Look)
Terrain wird **nicht gefüllt**, sondern schraffiert:
1. Polygon als Clip-Pfad setzen.
2. Horizontale Linien im Abstand 2–3 px (Screenshot 3: 2 px Scanlines; Screenshot 1: dichter) über die Bounding-Box zeichnen.
3. Polygon-Outline einmal kräftig nachziehen.
→ Performt problemlos, wenn das Hatching **einmal pro Level in ein Offscreen-Canvas gebacken** wird (Terrain is statisch); pro Frame nur `drawImage` mit Kamera-Offset.

### 3.3 Objekte (alles Linien, keine Fills)
- **Schiff:** Pfeil-Dreieck mit eingezogener Kerbe (wie Screenshot 2/3), Triebwerksflamme = 2–3 flackernde Liniensegmente (random Länge/Frame).
- **Pod:** Kreis auf Sockel-Dreieck (Screenshot 1/3 unten rechts).
- **Turret:** Kuppel-Bogen, Rohr rotiert Richtung Spieler.
- **Fuel:** Rechteck mit „FUEL"-Beschriftung in Bitmap-Mini-Font (5×5-Pixelfont selbst definieren, als Linienraster gezeichnet).
- **Reaktor:** Quadrat mit pulsierendem Kern (Liniendicke oszilliert).
- **HUD:** Doppellinien-Rahmen oben, drei Spalten FUEL/LIVES/SCORE, eigener 8×8-Font als Pfad-Daten (kein `fillText` mit Systemfont — bricht den Look).

### 3.4 Effekte
- Explosion: 16–24 Linien-Partikel radial, mit Gravitation, 0.5–1 s.
- Reaktor-Countdown: ganzer Screen-Flash invertiert im Takt, Frequenz steigend.
- Screen-Shake bei Treffern (±2 px, decay).
- Optional CRT: sehr subtile Scanline-Overlay-Textur + leichte Vignette, abschaltbar.

---

## 4. Generativer Sound (Web Audio, SID-inspiriert)

Kein Sample. Ein zentraler `AudioContext`, Master-Gain → leichter `WaveShaper` (weiche Sättigung, „SID-Schmutz") → `DynamicsCompressor`.

| Sound | Synthese-Rezept |
|---|---|
| **Schub (Engine)** | Weißes Rauschen (Loop-Buffer) → Bandpass 300–900 Hz, Cutoff moduliert mit LFO 8 Hz + Zufall; Gain mit 30 ms Attack/Release an Taste gekoppelt. Dazu leiser Puls-Oszillator ~55 Hz für Körper. |
| **Schuss** | Sägezahn, Pitch-Sweep 1800→200 Hz in 90 ms, Gain-Decay exponentiell. Klassischer SID-„pew". |
| **Turret-Schuss** | Wie Schuss, aber Rechteck-Welle, tiefer (1200→150 Hz), 120 ms. |
| **Traktorstrahl** | Zwei Dreieck-Oszillatoren, leicht verstimmt (z. B. 220/223 Hz) → Schwebung; Pitch steigt beim Ansaugen eines Objekts um eine Quinte. |
| **Fuel aufgenommen** | Arpeggio aus 3 Pulswellen-Noten (Grundton, +4, +7 Halbtöne), je 50 ms — SID-Arpeggio-Klischee. |
| **Explosion** | Rauschen → Tiefpass-Sweep 4000→80 Hz über 700 ms + Sub-Sinus 50 Hz mit schnellem Decay. Distortion drauf. |
| **Pod angekoppelt** | Tiefer „Clonk": Sinus 90 Hz, 60 ms, plus kurzer Noise-Click. |
| **Low Fuel** | Alarmpiep: Rechteck 880 Hz, 80 ms, alle 700 ms — Intervall verkürzt sich unter 200 Fuel. |
| **Reaktor-Countdown** | Tiefer Puls 65 Hz „Herzschlag", Tempo steigt von 1 Hz auf 6 Hz; in den letzten 3 s zusätzlich aufsteigender Sirenen-Sweep. |
| **Titelmusik** | Kleiner Step-Sequencer (Array aus Noten), 3 Stimmen: Puls-Lead, Dreieck-Bass, Noise-Hats — Hubbard-artige Moll-Linie, 8 Takte Loop. Datengröße: ~30 Zeilen. |

**Implementierung:** Eine `sfx(name, params)`-Factory, die pro Aufruf einen kurzlebigen Node-Graph erzeugt (Oszillator/Noise → Filter → Gain → Master) und sich selbst per `onended` aufräumt. Dauerklänge (Schub, Strahl, Alarm) als persistente Graphen mit Gain-Steuerung. AudioContext erst nach erster User-Geste resumen (iOS-Pflicht).

---

## 5. Unsichtbare Mobile-Touch-Controls

**Prinzip:** Kein sichtbares Gamepad-Overlay — der ganze Screen ist Eingabefläche, Zonen + Gesten, Multi-Touch über Pointer Events (`pointerId`-Tracking in einer Map).

### Layout (Landscape erzwungen / empfohlen)
```
┌──────────────────────┬──────────────────────┐
│  LINKE HÄLFTE        │  RECHTE HÄLFTE       │
│  Rotation:           │  unten: SCHUB        │
│  horizontales        │  (Finger liegt auf = │
│  Drag relativ zum    │   Schubkraft an)     │
│  Touch-Start         │  kurzer Tap oben:    │
│  (virtueller         │   FEUER              │
│  „Lenk-Slider")      │  zweiter Finger      │
│                      │  rechts gleichzeitig:│
│                      │   SCHILD/STRAHL      │
└──────────────────────┴──────────────────────┘
```

**Detail-Regeln**
- **Rotation links:** Beim `pointerdown` Ankerpunkt merken. `dx` zum Anker steuert Drehrichtung; Totzone ±8 px; jenseits ±8 px volle (digitale) Rotation — Schubsteuerung ist digital, also kein Analog-Mapping nötig. Finger nachziehen rebasiert den Anker langsam (Drift-Korrektur), damit man nie am Displayrand „ansteht".
- **Schub rechts unten:** Halten = Schub. Kein Tap-Toggle — die direkte Kopplung Finger↔Triebwerk ist essenziell fürs Pendel-Feintuning.
- **Feuer:** Tap (<150 ms, <10 px Bewegung) irgendwo rechts oben, ODER: dritter Finger irgendwo. Autofire bei Halten (alle 150 ms), originalgetreues Schussratenlimit (max. 4 Kugeln gleichzeitig).
- **Schild/Traktorstrahl:** Zweiter Finger in der rechten Hälfte während Schub-Finger liegt → Schild. Alternativ konfigurierbar: Long-Press links.
- **Feedback statt Grafik:** `navigator.vibrate(8)` bei Zonen-Aktivierung (Android), Sound-Cues, plus beim allerersten Spielstart ein **einmaliges, ausblendendes Ghost-Overlay** (3 s), das die Zonen zeigt — danach nie wieder sichtbar.
- **Pause:** 3-Finger-Tap.
- `touch-action: none` auf dem Canvas, `preventDefault` auf allen Pointer-Events, kein Pinch-Zoom, `user-select: none`.

**Desktop parallel:** ←/→ rotieren, ↑ oder A = Schub (Thrust), Space = Feuer, Shift = Schild, P = Pause, E = Editor.

---

## 6. Level-Editor (In-Game)

### 6.1 Datenformat (JSON)
```json
{
  "name": "Zyklon-Mine 1",
  "theme": { "terrain": "#E03020", "hatch": 2, "objects": "#7CFC00", "inverted": false },
  "gravity": 0.022,
  "polygons": [ [[0,400],[120,330],[260,360], "..."] ],
  "entities": [
    { "type": "pod",     "x": 480, "y": 612 },
    { "type": "fuel",    "x": 210, "y": 588 },
    { "type": "turret",  "x": 350, "y": 540, "dir": -1 },
    { "type": "reactor", "x": 700, "y": 660 },
    { "type": "door",    "x": 520, "y": 300, "w": 8, "h": 90, "trigger": "switch1" },
    { "type": "switch",  "x": 460, "y": 350, "id": "switch1" }
  ],
  "spawn": { "x": 160, "y": 80 },
  "exitY": -40
}
```

### 6.2 Editor-Modi (Umschaltung per Toolbar oben — der Editor DARF sichtbare UI haben)
1. **Polygon-Modus:** Klick/Tap setzt Vertices, Doppelklick/✓ schließt Polygon. Vertices verschiebbar (Drag), löschbar (Rechtsklick/Long-Press). Snap-to-Grid 8 px, abschaltbar.
2. **Objekt-Modus:** Palette (Pod, Fuel, Turret, Reaktor, Tür, Schalter, Spawn), platzieren per Tap, verschieben per Drag, Eigenschaften-Mini-Panel (Tür↔Schalter-Verknüpfung).
3. **Theme-Modus:** Farb-Presets der drei Screenshot-Looks + Gravitation/Fuel-Startwert-Slider. „Inverted"-Flag für den Grün-Planeten-Look (Fläche gefüllt, Höhlen ausgespart).
4. **Test-Modus:** Ein Tap → sofort spielen ab Spawn, Esc/Tap zurück in den Editor mit unverändertem Levelzustand (Hot-Loop: Build→Test in <1 s).

### 6.3 Persistenz & Validierung
- Export: JSON in Textarea + „Copy"-Button; Import per Paste. Standalone-Version zusätzlich `localStorage`-Slots + Datei-Download (`Blob` + `a.download`).
- Validierung vor Test: genau 1 Spawn, genau 1 Pod ODER explizit „kein Pod"-Level, Reaktor optional; Warnung bei offenen Polygonen.
- Kamera im Editor: Zwei-Finger-Pan / Mausrad-Pan, Zoom-Stufen 0.5×/1×/2× (nur Editor).

---

## 7. Gameplay-Loop & Scoring (originalnah)

1. Einflug von oben, Schwerkraft zieht sofort.
2. Fuel sammeln (Strahl), Turrets ausschalten (+750), Fuel zerschießen gibt Punkte, aber vernichtet Tankoption (Risiko-Abwägung wie im Original).
3. Pod per Strahl ankoppeln, vorsichtig durch die Höhle nach oben pendeln.
4. Optional/Pflicht je Level: Reaktor anschießen → 10-s-Countdown → Bonus bei Flucht; Reaktor-Overload (zu viele Treffer) → Planet explodiert, Leben weg.
5. Levelende: mit (oder je nach Level ohne) Pod über `exitY` hinaus → Bonus = Restfuel × 1 + Pod-Bonus 2000.
6. Nach Level 6: Zyklus wiederholt mit **invertierter Gravitation** und unsichtbarem Terrain-Blinken (klassische Schubkraft-Steigerung) — beides nur Flags im Theme.

---

## 8. Risiken & Tuning-Notizen
- **Pendel-Stabilität:** Substeps (4× pro Frame) für den Constraint, sonst Energie-Aufschaukeln. Früh in M5 mit Worst-Case testen (Vollschub quer zur Stabachse).
- **Touch ohne Sichtbarkeit = Lernkurve:** Das Ghost-Tutorial (einmalig) ist nicht optional, sondern Pflicht-Feature. A/B: Rotation per Drag vs. linke Hälfte in zwei Tap-Zonen geteilt — beides implementieren, in Settings wählbar.
- **Hatching-Performance auf Mobile:** zwingend Offscreen-Bake; bei sehr großen Levels Terrain in Kachel-Chunks (512 px) backen und nur sichtbare Chunks blitten.
- **iOS-Audio:** Context-Resume an ersten Touch binden; Schub-Loop-Gain nie auf exakt 0 (sondern 0.0001), verhindert Click-Artefakte.
- **Scope-Falle Editor:** Keine Undo-History in V1 — nur „Vertex löschen" + „Letztes Polygon entfernen". Undo erst in V1.1.

---

## 9. Reihenfolge der nächsten Session
1. M1+M2 in einem Rutsch.
2. Direkt danach M5-Spike: Tether-Prototyp isoliert testen, **bevor** Entities gebaut werden — das Pendel entscheidet, ob sich der Klon richtig anfühlt.
3. Dann M3/M4, Sound parallel als eigenes Modul (ist unabhängig testbar mit einer Debug-Soundboard-Seite).
