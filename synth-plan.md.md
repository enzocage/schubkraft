# Plan: SIDForge — JavaScript SID-Synthesizer für AI-generierte Sounds & Musik

Ein Web-Audio-Synthesizer, der den MOS 6581/8580 (SID) emuliert und über eine deklarative JSON-Schnittstelle ansteuerbar ist — so dass eine KI (oder ein Generator) Soundeffekte und Musikstücke als Daten beschreiben kann, die zur Laufzeit in 2D-Retro-Spielen abgespielt werden. Ziel: eine einzelne, dependency-freie ES-Modul-Datei (`sidforge.js`), die per `<script type="module">` in jedes Single-File-HTML5-Spiel eingebunden werden kann.

---

## 1. Ziele & Nicht-Ziele

### Ziele
- Authentischer SID-Klangcharakter: 3 Stimmen, klassische Wellenformen, ADSR mit SID-typischen Eigenheiten, Multimode-Filter, Ringmodulation, Hard Sync.
- **Deklaratives Sound-Format (JSON)**: Effekte und Songs sind reine Daten — perfekt für LLM-Generierung, prozedurale Variation und Versionierung.
- **Zwei Abstraktionsebenen**: Low-Level (Register-nahe Kontrolle pro Frame, wie ein 50-Hz-Player auf dem C64) und High-Level (semantische Beschreibungen wie „laser", „pickup", „explosion", Pattern/Song-Struktur wie in einem Tracker).
- Latenzarm und performant genug für Spiele (AudioWorklet, kein Garbage im Audio-Thread).
- Single-File, Vanilla JS, kein Build-Schritt.

### Nicht-Ziele
- Keine zyklengenaue 6581-Emulation auf reSID-Niveau (kein Ziel, .sid-Dateien von echten C64-Tunes abzuspielen — dafür gibt es jsSID/WebSid).
- Kein 6510-CPU-Emulator. Player-Logik läuft nativ in JS.
- Keine Sample-Wiedergabe über Volume-Register-Tricks (kann später als Stretch Goal kommen).

---

## 2. Architekturübersicht

```
┌──────────────────────────────────────────────────────┐
│  Spiel (HTML5, Canvas, Game Loop)                    │
│    sid.playSfx("laser")   sid.playSong(songJson)     │
└───────────────┬──────────────────────────────────────┘
                │ Main Thread API (sidforge.js)
┌───────────────▼──────────────────────────────────────┐
│  SidForge Facade                                     │
│  - Asset-Verwaltung (Sfx-/Song-JSON)                 │
│  - Voice-Allocation & Prioritäten (SFX > Musik)      │
│  - Sequencer (Pattern-Player, läuft im Worklet)      │
└───────────────┬──────────────────────────────────────┘
                │ postMessage (Param-Events, Frame-Daten)
┌───────────────▼──────────────────────────────────────┐
│  AudioWorkletProcessor: SidCore                      │
│  - 3 Voices: Phasen-Akkumulator-Oszillatoren         │
│  - Wellenformen: Dreieck, Sägezahn, Puls (PW),       │
│    Rauschen (23-bit LFSR), Kombi-Wellenformen        │
│  - ADSR pro Voice (exponentielles Decay/Release)     │
│  - Ringmod (V1←V3 …), Hard Sync                      │
│  - Filter: State-Variable (LP/BP/HP, Resonanz),      │
│    Routing pro Voice, 6581-Nichtlinearität (opt.)    │
│  - Master Volume, optional leichtes Output-Drive     │
└──────────────────────────────────────────────────────┘
```

**Designentscheidung:** Der Sequencer (50-Hz-Tick, wie ein Raster-IRQ-Player) läuft *im Worklet*, nicht im Main Thread. So bleibt das Timing sample-genau und unabhängig von requestAnimationFrame-Jitter. Der Main Thread schickt nur komplette Song-/Sfx-Daten und Steuerkommandos (play/stop/volume).

---

## 3. Module / Meilensteine

### M1 — SidCore (AudioWorklet, DSP-Kern)
Datei-intern als String oder Blob-URL eingebettet, damit alles single-file bleibt.

- **Oszillator**: 24-bit Phasen-Akkumulator pro Voice, Frequenzregister wie beim SID (`freq = reg * clock / 16777216`, PAL-Clock 985248 Hz als Default für authentische Pitch-Tabellen).
- **Wellenformen**:
  - Dreieck (MSB-gespiegelt), Sägezahn, Puls mit 12-bit Pulsweite.
  - Rauschen über 23-bit LFSR (Taps 22/17), getaktet vom Akkumulator-Bit 19.
  - Kombinierte Wellenformen näherungsweise per AND-Verknüpfung (klanglich „dreckig genug", keine Lookup-Tabellen aus echten Chips nötig — Stretch Goal: 8580-Wavetables).
- **ADSR**: SID-Ratentabellen (2 ms–8 s Attack etc.), exponentielle Decay/Release-Kurve über die bekannten Schwellwert-Stufen. Gate-Bit-Verhalten inkl. Re-Trigger.
- **Ringmod & Sync**: Voice n moduliert von Voice (n+2)%3, wie im Original.
- **Filter**: State-Variable-Filter, Cutoff 30 Hz–~12 kHz nichtlinear gemappt (6581-Kurve), Resonanz 0–15, pro Voice zuschaltbares Routing, LP/BP/HP kombinierbar, Voice-3-Mute-Bit.
- **Output**: Mix → Filter → Master Volume → leichtes Soft-Clipping (tanh) als „6581-Charme".

*Definition of Done:* Testseite mit Reglern für alle Register, A/B-Hörvergleich gegen jsSID mit identischen Registerwerten.

### M2 — Frame-Engine (50-Hz-Treiber)
Das Herzstück für Authentizität: Alles (SFX und Musik) wird auf **Frames** (1/50 s) heruntergebrochen, genau wie ein C64-Player im Raster-Interrupt.

- Worklet-interner Tick-Zähler: alle `sampleRate/50` Samples ein Frame-Update.
- Pro Frame können pro Voice gesetzt werden: Frequenz, Wellenform, PW, ADSR, Gate, Filter-Params.
- **Instrumente als Mini-Programme** (wie in GoatTracker/SidWizard):
  - Wavetable: Sequenz aus (Wellenform, Transpose/Absolut-Note) mit Loop-Punkt — ermöglicht Arpeggios, Drum-Sounds (Rausch-Attack → Puls-Body).
  - Pulsetable: PW-Sweeps mit Geschwindigkeit und Grenzen.
  - Filtertable: Cutoff-Sweeps, Resonanz, Routing.
  - Vibrato: Tiefe/Geschwindigkeit/Delay.

### M3 — SFX-Format & SFX-Engine
Deklaratives JSON, das eine KI leicht erzeugen kann:

```json
{
  "name": "laser_small",
  "priority": 2,
  "voice": "any",
  "frames": { "len": 14 },
  "adsr": [0, 9, 0, 9],
  "wave": "pulse",
  "pw": { "start": 2048, "speed": -60 },
  "pitch": { "startNote": "C-6", "slide": -34, "curve": "exp" },
  "filter": { "mode": "lp", "cutoff": 0.7, "sweep": -0.03, "res": 10 }
}
```

- Alternativ ein **Low-Level-Format**: Array aus Frame-Objekten (Register-Deltas) — maximale Kontrolle für die KI, gut „diffbar".
- **Voice-Stealing-Politik**: SFX nehmen sich per Priorität die Stimme mit der unwichtigsten Musikrolle (typisch Voice 3 / Arpeggio-Stimme), Musik-Restore nach SFX-Ende — exakt wie in C64-Spielen üblich.
- Mitgelieferte **Preset-Bibliothek** (~20 Stück): laser, zap, pickup, coin, jump, explosion (Rausch+Filter-Sweep), hit, powerup, alarm, ui_blip, … Diese dienen gleichzeitig als Few-Shot-Beispiele für die KI.

### M4 — Musik-Format & Sequencer
Tracker-Modell (vertraut, kompakt, LLM-freundlich):

```json
{
  "title": "stage1",
  "speed": 6,
  "instruments": { "bass": {...}, "lead": {...}, "drums": {...} },
  "patterns": {
    "P0": [["C-2","bass",0], ["---"], ["C-2","bass",0], ...],
    "P1": [...]
  },
  "orderlist": {
    "v1": ["P0","P0","P2"],
    "v2": ["P4","P5"],
    "v3": ["P8"]
  },
  "loop": 0
}
```

- Effektspalte pro Zeile: Arpeggio (xy-Halbtonpaare!), Slide up/down, Portamento, Vibrato, PW-Set, Filter-Set, Volume — die klassischen Tracker-Commands.
- Pro Stimme eigene Orderlist mit Transpose-Befehlen (wie GoatTracker) → kompakte Songs mit viel Wiederverwendung, ideal für generative Variation.
- Songtransport: play/pause/stop, Sprung zu Orderlist-Position (für adaptive Spielmusik: ruhige Pattern ↔ Action-Pattern).

### M5 — AI-Integration
Zwei Wege, beide ohne Abhängigkeit vom Spiel-Code:

1. **Offline/Buildtime**: Prompt-Templates + Schema-Dokumentation (eigene `SIDFORGE-SPEC.md`, geschrieben *für* LLMs: Format-Definition, Constraints, 10 annotierte Beispiele). Die KI generiert JSON, das einfach ins Spiel kopiert wird. Das ist der Hauptpfad — robust, kein API-Key im Spiel.
2. **Runtime (optional, als separates Tool)**: Ein „Sound-Designer"-Artifact/HTML-Tool, das per Anthropic-API aus einer Textbeschreibung („kurzer, metallischer Treffer-Sound") JSON erzeugt, sofort abspielt und iterieren lässt (Regenerate/Mutate-Buttons).
- **Validator**: `SidForge.validate(json)` mit präzisen Fehlermeldungen — die KI bekommt bei ungültigem Output maschinenlesbares Feedback für einen Korrektur-Loop.
- **Mutations-API**: `SidForge.mutate(sfx, {pitch:±, length:±})` für prozedurale Varianten (10 Laser, die alle leicht anders klingen) ohne erneuten KI-Call.

### M6 — Tooling & Tests
- **Playground-HTML** (eine Datei): Register-Panel, SFX-Editor mit JSON-Textarea + Live-Preview, Mini-Tracker-Ansicht, Export/Import.
- **Headless-Tests** (Node, OfflineAudioContext-Ersatz: SidCore als reine Klasse, die Sample-Buffer rendert): LFSR-Sequenz gegen Referenz, ADSR-Hüllkurven-Stützpunkte, Frequenztabellen (A-4 = 440 Hz bei PAL), Determinismus (gleiches JSON → identische Samples).
- Performance-Budget: < 1 % CPU für 3 Voices + Filter auf Mittelklasse-Hardware.

---

## 4. Public API (Entwurf)

```js
import { SidForge } from "./sidforge.js";

const sid = await SidForge.create({ chip: "6581", clock: "PAL" });

sid.loadSfxBank(sfxJson);          // Objekt mit benannten Effekten
sid.playSfx("explosion", { detune: 0.05 });

sid.loadSong(songJson);
sid.playSong({ loop: true });
sid.jumpTo(orderPos);              // adaptive Musik
sid.duckMusic(0.4, 200);           // SFX-Ducking

sid.setVolume(0.8);
sid.stopAll();

// Direktzugriff für Experimente:
sid.poke(voice, "freq", 0x1cd6);   // registernaher Modus
```

---

## 5. Risiken & offene Fragen

- **Kombi-Wellenformen**: reine AND-Näherung klingt anders als echte 6581-Mischformen. Pragmatisch starten, später 8580-Tabellen (öffentlich dokumentiert) als Option.
- **Filter-Authentizität**: der 6581-Filter ist berüchtigt nichtlinear und exemplarstreuend. Plan: musikalisch brauchbare Annäherung statt Schaltungssimulation; ein `character: 0..1`-Parameter für Verzerrungsgrad.
- **Autoplay-Policy**: AudioContext erst nach User-Geste starten — `SidForge.create()` gibt ein Objekt zurück, das Events puffert, bis `resume()` durch ersten Klick/Tastendruck erfolgt.
- **Worklet + Single-File**: Worklet-Code als Blob-URL einbetten; Fallback auf ScriptProcessorNode für exotische Umgebungen prüfen (vermutlich verzichtbar).

---

## 6. Reihenfolge & Aufwand (grob)

| Schritt | Inhalt | Aufwand |
|---|---|---|
| 1 | M1 SidCore: Oszillatoren + ADSR, Testseite | 1–2 Sessions |
| 2 | M1 Filter + Ringmod/Sync | 1 Session |
| 3 | M2 Frame-Engine + Instrumenten-Tables | 1–2 Sessions |
| 4 | M3 SFX-Format, Voice-Stealing, Preset-Bank | 1–2 Sessions |
| 5 | M4 Sequencer + Tracker-Effekte | 2 Sessions |
| 6 | M5 LLM-Spec + Validator + Mutate | 1 Session |
| 7 | M6 Playground + Headless-Tests | 1–2 Sessions |

Erstes hörbares Ergebnis („Laser-Sound aus JSON im Browser") realistisch nach Schritt 1+3-Minimalversion — lohnt sich als früher vertikaler Durchstich: ein Oszillator, eine ADSR, ein SFX-JSON, ein Button.

---

## 7. Stretch Goals

- 8580-Modus (linearer Filter, saubere Kombi-Wellenformen) als umschaltbarer Chip-Charakter.
- Export als `.sid`-kompatible Registerdumps oder WAV-Render (OfflineAudioContext).
- 2×SID-Modus (6 Stimmen) für üppigere Musik.
- Sample-Kanal über 4-bit-Volume-Trick für Sprach-/Drum-Samples.
- MAP-Elites-artige Suche über den SFX-Parameterraum mit Audio-Feature-Deskriptoren (Helligkeit, Länge, Perkussivität) — passt zu deinem SRG-Ansatz, nur für Klang statt Level.
