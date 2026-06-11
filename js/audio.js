import { state, STATE_PLAYING, STATE_TITLE, STATE_HIGHSCORE, MP3_PLAYLIST } from './constants.js?v=2';
import { SidForge } from './sidforge.js?v=2';

// ============================================================================
// State
// ============================================================================
let sid = null;
let musicPlaying = false;
let currentThrustActive = false;
let currentTractorActive = false;
let currentDroneActive = false;
let currentThrustVariant = 0;
let currentTractorVariant = 0;
let currentDroneVariant = 0;

// Built at initAudio time
let SFX_BANK = {};
let TRACKER_SONG = null;
let mp3Elem = null;
let playlistIndex = 14; // Start with enzo_cage_in_der_nacht.mp3 (index 14)

// ============================================================================
// Base SFX Templates — Optimized C64 SID Sound Design
// ============================================================================
const SFX_TEMPLATES = {
  // ===== FIRE WEAPON — Vicious SID zapper =====
  // Hard-synced sawtooth+pulse with fast PWM and a screaming exponential dive
  pew: {
    priority: 3, wave: "sawtooth+pulse", pw: { start: 700, speed: 260 },
    adsr: [0, 5, 0, 3], pitch: { startNote: "C-7", slide: -44, curve: "exp" },
    sync: true, filter: { mode: "hp", cutoff: 0.30, sweep: -0.03, res: 5 },
    frames: { len: 12 }
  },
  // ===== TURRET FIRE — Heavy plasma thud =====
  // Band-passed saw burst that drops an octave: reads as "incoming danger"
  turretShoot: {
    priority: 2, wave: "sawtooth+noise",
    adsr: [0, 6, 0, 4], pitch: { startNote: "C-4", slide: -22, curve: "exp" },
    filter: { mode: "bp", cutoff: 0.45, sweep: -0.035, res: 6 }, frames: { len: 16 }
  },
  // ===== EXPLOSION (generic) — Big rolling boom =====
  explosion: {
    priority: 4, wave: "noise", adsr: [0, 11, 2, 11],
    pitch: { startFreq: 190, slide: -4, curve: "exp" },
    filter: { mode: "lp", cutoff: 0.95, sweep: -0.016, res: 7 }, frames: { len: 60 }
  },
  // ===== SHIP DEATH — Long subterranean collapse =====
  // Deep noise body with slow filter closure; reads as catastrophic
  shipDeath: {
    priority: 5, wave: "noise", adsr: [0, 9, 3, 13],
    pitch: { startFreq: 130, slide: -4.5, curve: "exp" },
    filter: { mode: "lp", cutoff: 0.9, sweep: -0.012, res: 9 }, frames: { len: 75 }
  },
  // ===== REACTOR MELTDOWN — Apocalyptic =====
  reactorMeltdown: {
    priority: 5, wave: "noise+pulse", pw: { start: 2048, speed: -40 },
    adsr: [2, 13, 4, 15], pitch: { startFreq: 320, slide: -5, curve: "exp" },
    filter: { mode: "lp", cutoff: 1.0, sweep: -0.010, res: 11 }, frames: { len: 95 }
  },
  // ===== TURRET DESTROYED — Ring-modded metal shriek into crunch =====
  turretDestroyed: {
    priority: 4, wave: "noise+pulse", pw: { start: 3400, speed: -160 },
    adsr: [0, 7, 0, 9], pitch: { startFreq: 520, slide: -10, curve: "exp" },
    ringMod: true, filter: { mode: "lp", cutoff: 0.75, sweep: -0.025, res: 8 },
    frames: { len: 38 }
  },
  // ===== FUEL COLLECTED — Sparkling major arp chime =====
  fuelCollected: {
    priority: 2, wave: "pulse", pw: { start: 2000, speed: 90 },
    adsr: [0, 5, 6, 5], pitch: { startNote: "E-5", slide: 2, curve: "linear" },
    arp: { offsets: [0, 4, 7, 12, 16], speed: 1 },
    filter: { mode: "hp", cutoff: 0.12, sweep: 0.01, res: 2 }, frames: { len: 18 }
  },
  // ===== LEVEL COMPLETE — Full victory fanfare =====
  // Long rising arpeggio sweep with opening filter: pure 80s triumph
  levelComplete: {
    priority: 4, wave: "pulse", pw: { start: 1500, speed: 80 },
    adsr: [1, 5, 9, 7], pitch: { startNote: "C-4", slide: 30, curve: "linear" },
    arp: { offsets: [0, 4, 7, 12, 16, 19], speed: 1 },
    filter: { mode: "lp", cutoff: 0.45, sweep: 0.012, res: 3 },
    frames: { len: 55 }
  },
  // ===== GAME OVER — Doomy ring-modded descent =====
  gameOver: {
    priority: 4, wave: "triangle",
    adsr: [2, 7, 5, 10], pitch: { startNote: "E-4", slide: -14, curve: "exp" },
    ringMod: true, arp: { offsets: [0, -5, -12], speed: 5 },
    vibrato: { speed: 0.08, depth: 3 }, frames: { len: 48 }
  },
  // ===== RESPAWN — Teleport shimmer =====
  respawn: {
    priority: 3, wave: "triangle",
    adsr: [0, 5, 2, 4], pitch: { startNote: "C-3", slide: 30, curve: "exp" },
    arp: { offsets: [0, 7, 12], speed: 1 },
    vibrato: { speed: 0.3, depth: 8 }, frames: { len: 16 }
  },
  // ===== POD ATTACH — Magnetic clamp: metallic clunk + confirm chirp =====
  podAttach: {
    priority: 2, wave: "triangle+pulse", pw: { start: 1200, speed: 150 },
    adsr: [0, 4, 2, 4], pitch: { startNote: "G-2", slide: 14, curve: "exp" },
    ringMod: true, arp: { offsets: [0, 12], speed: 3 }, frames: { len: 12 }
  },
  // ===== SHIELD ACTIVATE — Rising energy whoosh =====
  shieldActivate: {
    priority: 2, wave: "pulse+noise", pw: { start: 400, speed: 300 },
    adsr: [1, 4, 3, 4], pitch: { startNote: "G-4", slide: 26, curve: "exp" },
    filter: { mode: "hp", cutoff: 0.18, sweep: 0.07, res: 4 }, frames: { len: 13 }
  },
  // ===== SHIELD HIT PING — Glassy synced ring =====
  shieldPing: {
    priority: 2, wave: "pulse", pw: { start: 600, speed: 180 },
    adsr: [0, 3, 0, 4], pitch: { startNote: "E-7", slide: -38, curve: "exp" },
    sync: true, ringMod: true,
    filter: { mode: "hp", cutoff: 0.4, sweep: -0.02, res: 7 }, frames: { len: 9 }
  },
  // ===== PROJECTILE HIT TERRAIN — Gritty ricochet snap =====
  projectileHit: {
    priority: 1, wave: "noise",
    adsr: [0, 3, 0, 2], pitch: { startFreq: 1400, slide: -22, curve: "exp" },
    filter: { mode: "bp", cutoff: 0.55, sweep: -0.04, res: 4 }, frames: { len: 6 }
  },
  // ===== DOOR HISS — Pneumatic pressure release =====
  doorHiss: {
    priority: 1, wave: "noise", adsr: [3, 8, 2, 7],
    pitch: { startFreq: 900, slide: 4, curve: "linear" },
    filter: { mode: "hp", cutoff: 0.25, sweep: 0.035, res: 6 }, frames: { len: 28 }
  },
  // ===== LOW FUEL WARNING — Klaxon two-tone =====
  lowFuel: {
    priority: 2, wave: "pulse", pw: { start: 2048, speed: 0 },
    adsr: [0, 4, 4, 3], pitch: { startNote: "A-5", slide: 0 },
    arp: { offsets: [0, -5], speed: 4 },
    filter: { mode: "bp", cutoff: 0.5, sweep: 0, res: 5 }, frames: { len: 10 }
  },
  // ===== MENU SELECT — Crisp blip with sparkle =====
  select: {
    priority: 2, wave: "pulse", pw: { start: 800, speed: 200 },
    adsr: [0, 3, 0, 2], pitch: { startNote: "E-5", slide: 8, curve: "linear" },
    arp: { offsets: [0, 12], speed: 2 }, frames: { len: 6 }
  },
  // ===== ENGINE THRUST — Deep throbbing rocket rumble =====
  // Noise+pulse with slow PWM throb; frequency is modulated live per frame
  engineThrust: {
    priority: 1, wave: "noise+pulse", pw: { start: 800, speed: 55 },
    adsr: [3, 0, 13, 5], pitch: { startFreq: 32, slide: 0 },
    filter: { mode: "lp", cutoff: 0.13, sweep: 0, res: 5 }, frames: { len: 99999 }
  },
  // ===== TRACTOR BEAM — Sci-fi force hum =====
  tractorBeam: {
    priority: 1, wave: "triangle+pulse", pw: { start: 1400, speed: 70 },
    adsr: [2, 0, 14, 3], pitch: { startFreq: 140, slide: 0 },
    ringMod: true, vibrato: { speed: 0.18, depth: 11 }, frames: { len: 99999 }
  },
  // ===== AMBIENT DRONE — Cavern hum, speed-modulated =====
  drone: {
    priority: 0, wave: "triangle", adsr: [4, 0, 13, 3],
    pitch: { startFreq: 50, slide: 0 },
    vibrato: { speed: 0.06, depth: 5 }, frames: { len: 99999 }
  }
};

// ============================================================================
// Helper: Simple hash for deterministic variant generation
// ============================================================================
function hash31(seed) {
  let h = 0xDEADBEEF ^ (seed * 0x9E3779B9);
  h = Math.imul(h ^ (h >>> 16), 0x85EBCA6B);
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
  return (h ^ (h >>> 16)) / 0xFFFFFFFF;
}

// ============================================================================
// Helper: Shift note string by semitones
// ============================================================================
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function shiftNote(noteStr, semitones) {
  if (!noteStr || noteStr === "---") return noteStr;
  // Accepts "C-4", "C#4", "C#-4", "Db4", "Db-4"
  const m = /^([A-Ga-g])([#b]?)-?(\d)$/.exec(noteStr);
  if (!m) return noteStr;
  let idx = NOTES.indexOf(m[1].toUpperCase() + (m[2] === "#" ? "#" : ""));
  if (idx === -1) return noteStr;
  if (m[2] === "b") idx = (idx + 11) % 12;
  const octave = parseInt(m[3]);
  let absMidi = 12 + octave * 12 + idx + semitones;
  if (absMidi < 0) absMidi = 0;
  if (absMidi > 127) absMidi = 127;
  const newOctave = Math.floor(absMidi / 12) - 1;
  const newIdx = absMidi % 12;
  return NOTES[newIdx] + "-" + newOctave;
}

// ============================================================================
// SFX Variant Generator — Creates 10 organic variants per sound
// ============================================================================
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const copy = {};
  for (const k of Object.keys(obj)) copy[k] = deepClone(obj[k]);
  return copy;
}

function generateVariant(template, vIdx, totalVariants, name = "") {
  const effectiveVIdx = name === "engineThrust" ? 0 : vIdx;
  const v = deepClone(template);
  // Use hash for deterministic but pseudo-random variation
  const h = (i) => hash31(effectiveVIdx * 37 + i * 73 + totalVariants * 131);
  const r = (i, min, max) => min + h(i) * (max - min);

  // Pitch variation — subtle detune, max ±2 semitones
  if (v.pitch) {
    if (v.pitch.startNote) {
      const shift = Math.round(r(1, -2, 2));
      v.pitch.startNote = shiftNote(v.pitch.startNote, shift);
    }
    if (v.pitch.startFreq) {
      v.pitch.startFreq *= r(2, 0.92, 1.08);
      v.pitch.startFreq = clamp(v.pitch.startFreq, 10, 20000);
    }
    if (v.pitch.slide) {
      v.pitch.slide *= r(3, 0.88, 1.12);
    }
  }

  // ADSR tweaks — slightly different envelope per variant
  if (v.adsr) {
    v.adsr[1] = clamp(Math.round(v.adsr[1] + r(5, -1, 1)), 0, 15);
    v.adsr[3] = clamp(Math.round(v.adsr[3] + r(7, -1, 1)), 0, 15);
  }

  // Frame length variation — organic timing feel
  if (v.frames) {
    v.frames.len = clamp(Math.round(v.frames.len * r(8, 0.9, 1.12)), 2, 99999);
  }

  // Filter variation
  if (v.filter) {
    v.filter.cutoff = clamp(v.filter.cutoff * r(9, 0.94, 1.06), 0.01, 0.99);
    if (v.filter.sweep) {
      v.filter.sweep *= r(10, 0.9, 1.1);
    }
    v.filter.res = clamp(Math.round(v.filter.res + r(11, -1, 1)), 1, 12);
  }

  // Pulse width variation
  if (v.pw) {
    v.pw.start = clamp(Math.round(v.pw.start + r(12, -150, 150)), 0, 4095);
    if (v.pw.speed) {
      v.pw.speed *= r(13, 0.9, 1.1);
    }
  }

  // Vibrato depth/speed variation
  if (v.vibrato) {
    v.vibrato.depth = clamp(v.vibrato.depth * r(14, 0.85, 1.15), 1, 30);
    v.vibrato.speed = clamp(v.vibrato.speed * r(15, 0.92, 1.08), 0.02, 0.5);
  }

  // Arp speed variation
  if (v.arp && v.arp.speed) {
    v.arp.speed = clamp(Math.round(v.arp.speed + r(16, -1, 1)), 1, 12);
  }

  return v;
}

function buildSfxBank(templates, numVariants) {
  const bank = {};
  for (const [name, tmpl] of Object.entries(templates)) {
    // Also store the base template as _v5 (middle variant)
    for (let vi = 0; vi < numVariants; vi++) {
      bank[`${name}_v${vi}`] = generateVariant(tmpl, vi, numVariants, name);
    }
  }
  return bank;
}

// ============================================================================
// MIDI Parser — reads binary MIDI, returns structured note data
// ============================================================================
function parseMidi(bytes) {
  // Read big-endian helpers
  const readBE16 = (off) => (bytes[off] << 8) | bytes[off + 1];
  const readBE32 = (off) => (bytes[off] << 24) | (bytes[off + 1] << 16) | (bytes[off + 2] << 8) | bytes[off + 3];

  // Header
  const division = readBE16(12);
  const numTracks = readBE16(10);

  const allNotes = []; // { tick, note, velocity }
  let pos = 14;

  for (let t = 0; t < numTracks; t++) {
    const trackLen = readBE32(pos + 4);
    const trackStart = pos + 8;
    const trackEnd = trackStart + trackLen;
    pos = trackStart;

    let absTick = 0;
    let lastStatus = 0;

    while (pos < trackEnd) {
      // Read variable-length delta time
      let delta = 0;
      let b;
      do { b = bytes[pos++]; delta = (delta << 7) | (b & 0x7F); } while (b & 0x80);
      absTick += delta;

      let status = bytes[pos];
      if (status < 0x80) {
        status = lastStatus; // running status
      } else {
        lastStatus = bytes[pos++];
        status = lastStatus;
      }

      const cmd = status & 0xF0;

      if (cmd === 0x90 || cmd === 0x80) {
        const note = bytes[pos++];
        const vel = bytes[pos++];
        if (cmd === 0x90 && vel > 0) {
          allNotes.push({ tick: absTick, note, vel });
        }
      } else if (cmd === 0xA0) { pos += 2;
      } else if (cmd === 0xB0) { pos += 2;
      } else if (cmd === 0xC0) { pos += 1;
      } else if (cmd === 0xD0) { pos += 1;
      } else if (cmd === 0xE0) { pos += 2;
      } else if (status === 0xFF) {
        const type = bytes[pos++];
        let metaLen = 0, mb;
        do { mb = bytes[pos++]; metaLen = (metaLen << 7) | (mb & 0x7F); } while (mb & 0x80);
        pos += metaLen;
      } else if (status === 0xF0 || status === 0xF7) {
        let sysLen = 0, sb;
        do { sb = bytes[pos++]; sysLen = (sysLen << 7) | (sb & 0x7F); } while (sb & 0x80);
        pos += sysLen;
      } else {
        break; // unknown, skip to next track
      }
    }
  }

  return { notes: allNotes, division };
}

// ============================================================================
// MIDI → C64 Tracker Converter
// ============================================================================
function midiNoteToTracker(midiNote) {
  if (midiNote < 0 || midiNote > 127) return "---";
  const octave = Math.floor(midiNote / 12) - 1;
  const idx = midiNote % 12;
  if (octave < 0 || octave > 7) return "---";
  return NOTES[idx] + "-" + octave;
}

function midiToTrackerSong(midiData) {
  const { notes, division } = midiData;
  if (notes.length === 0) return null;

  // Sort by tick
  notes.sort((a, b) => a.tick - b.tick);

  // Quantize to grid: gridStep = division / 4 (16th notes)
  const gridStep = Math.max(1, Math.floor(division / 4));
  const maxTick = notes[notes.length - 1].tick;
  // Take first ~45 seconds worth (about 180 beats at 75bpm = 720 16ths, cap at ~600 grid steps)
  const maxGrid = Math.min(Math.ceil(maxTick / gridStep), 600);

  // Build 3-voice grid
  const grid = []; // grid[step] = [v1Note, v2Note, v3Note]
  for (let i = 0; i < maxGrid; i++) {
    grid.push([null, null, null]);
  }

  // Place notes into grid by pitch splitting
  for (const n of notes) {
    const step = Math.floor(n.tick / gridStep);
    if (step >= maxGrid) continue;

    // Assign to voice based on pitch range
    const midi = n.note;
    // Voice 1: bass (MIDI 21-55), Voice 2: melody (MIDI 65-108), Voice 3: harmony (MIDI 56-64)
    // But if a range already has a louder note, don't replace
    if (midi <= 55) {
      if (!grid[step][0] || n.vel > 64) grid[step][0] = midi;
    } else if (midi >= 65) {
      if (!grid[step][1] || n.vel > 64) grid[step][1] = midi;
    } else {
      if (!grid[step][2] || n.vel > 64) grid[step][2] = midi;
    }
  }

  // Build patterns (32 rows each)
  const PATTERN_ROWS = 32;
  const patterns = {};
  const orderV1 = [];
  const orderV2 = [];
  const orderV3 = [];

  const numPatterns = Math.ceil(maxGrid / PATTERN_ROWS);

  for (let p = 0; p < numPatterns; p++) {
    const pName = `c${p}`;
    const rows = [];
    for (let r = 0; r < PATTERN_ROWS; r++) {
      const step = p * PATTERN_ROWS + r;
      if (step < maxGrid) {
        const [bass, lead, harm] = grid[step];
        const v1Note = bass !== null ? midiNoteToTracker(bass) : "---";
        const v2Note = lead !== null ? midiNoteToTracker(lead) : "---";
        const v3Note = harm !== null ? midiNoteToTracker(harm) : "---";
        rows.push([v1Note, v2Note, v3Note]);
      } else {
        rows.push(["---", "---", "---"]);
      }
    }
    patterns[pName] = rows;
    orderV1.push(pName);
    orderV2.push(pName);
    orderV3.push(pName);
  }

  // Voice 1 = bass (sawtooth+pulse, LP filter)
  // Voice 2 = melody (soft pulse, vibrato)
  // Split combined patterns into per-voice patterns with unique names
  // Voice 1 = bass (sawtooth+pulse, LP filter)
  // Voice 2 = melody (soft pulse, vibrato)
  // Voice 3 = harmony (triangle, gentle)
  const bassPatterns = {};
  const leadPatterns = {};
  const harmPatterns = {};
  const bassOrder = [];
  const leadOrder = [];
  const harmOrder = [];

  for (const [pName, rows] of Object.entries(patterns)) {
    const idx = pName.substring(1); // numeric index after 'c'
    const bName = `b${idx}`;
    const lName = `l${idx}`;
    const hName = `h${idx}`;

    bassPatterns[bName] = rows.map(r => [r[0], "clair_bass"]);
    leadPatterns[lName] = rows.map(r => [r[1], "clair_lead"]);
    harmPatterns[hName] = rows.map(r => [r[2], "clair_harp"]);

    bassOrder.push(bName);
    leadOrder.push(lName);
    harmOrder.push(hName);
  }

  return {
    title: "CLAIR DE LUNE — C64 SID",
    speed: 8,
    instruments: {
      clair_bass: {
        wave: "sawtooth+pulse",
        adsr: [0, 6, 10, 5],
        pw: { start: 1800, speed: 20, min: 1400, max: 2600 },
        filter: { mode: "lp", cutoff: 0.28, res: 2 }
      },
      clair_lead: {
        wave: "pulse",
        adsr: [3, 8, 12, 6],
        pw: { start: 1600, speed: 15, min: 1200, max: 2000 },
        vibrato: { speed: 0.10, depth: 4 }
      },
      clair_harp: {
        wave: "triangle",
        adsr: [0, 5, 2, 4]
      }
    },
    patterns: {
      ...bassPatterns,
      ...leadPatterns,
      ...harmPatterns
    },
    orderlist: {
      v1: bassOrder,
      v2: leadOrder,
      v3: harmOrder
    },
    loop: 0
  };
}

// ============================================================================
// Title theme
// ============================================================================
const FALLBACK_SONG = {
  title: "SCHUBKRAFT — SID METAL THEME",
  speed: 5,
  instruments: {
    bass: { wave: "sawtooth", adsr: [0, 4, 7, 3], filter: { mode: "lp", cutoff: 0.35, res: 2 } },
    lead: { wave: "pulse", adsr: [1, 5, 8, 3], pw: { start: 1400, speed: 30, min: 900, max: 3200 }, vibrato: { speed: 0.14, depth: 6 } },
    noise_drum: { wave: "noise", adsr: [0, 3, 0, 1], filter: { mode: "lp", cutoff: 0.3, res: 3 } },
    arp_lead: { wave: "pulse", adsr: [0, 4, 10, 3], pw: { start: 2000, speed: 40, min: 1200, max: 3500 } }
  },
  patterns: {
    bass0: [
      ["A-2","bass","arp",0x37],["---"],["A-2","bass"],["---"],["A-2","bass","arp",0x37],["---"],["A-2","bass"],["---"],
      ["D-2","bass","arp",0x37],["---"],["D-2","bass"],["---"],["D-2","bass","arp",0x37],["---"],["D-2","bass"],["---"],
      ["F-2","bass","arp",0x37],["---"],["F-2","bass"],["---"],["G-2","bass","arp",0x37],["---"],["G-2","bass"],["---"],
      ["A-2","bass","arp",0x37],["---"],["A-2","bass"],["---"],["E-2","bass","arp",0x37],["---"],["E-2","bass"],["---"]
    ],
    bass1: [
      ["F-2","bass","arp",0x37],["---"],["F-2","bass"],["---"],["F-2","bass","arp",0x37],["---"],["F-2","bass"],["---"],
      ["G-2","bass","arp",0x37],["---"],["G-2","bass"],["---"],["G-2","bass","arp",0x37],["---"],["G-2","bass"],["---"],
      ["A-2","bass","arp",0x37],["---"],["A-2","bass"],["---"],["A-2","bass","arp",0x37],["---"],["A-2","bass"],["---"],
      ["E-2","bass","arp",0x47],["---"],["E-2","bass"],["---"],["E-2","bass","arp",0x47],["---"],["E-2","bass"],["---"]
    ],
    lead0: [
      ["A-4","arp_lead","arp",0x47],["---"],["B-4","lead"],["---"],["C-5","arp_lead","arp",0x37],["---"],["E-5","lead"],["---"],
      ["D-5","lead","slide",2],["---"],["C-5","lead"],["---"],["B-4","lead"],["---"],["G-4","arp_lead","arp",0x37],["---"],
      ["A-4","lead"],["---"],["B-4","arp_lead","arp",0x37],["---"],["C-5","lead"],["---"],["A-4","arp_lead","arp",0x47],["---"],
      ["E-5","lead","slide",2],["---"],["D-5","lead"],["---"],["E-5","lead"],["---"],["G-5","arp_lead","arp",0x47],["---"]
    ],
    lead1: [
      ["A-5","arp_lead","arp",0x47],["---"],["G-5","lead"],["---"],["F-5","arp_lead","arp",0x37],["---"],["E-5","lead"],["---"],
      ["D-5","lead","slide",2],["---"],["C-5","lead"],["---"],["B-4","arp_lead","arp",0x37],["---"],["E-5","lead"],["---"],
      ["C-5","lead"],["---"],["B-4","arp_lead","arp",0x37],["---"],["A-4","lead"],["---"],["G#4","arp_lead","arp",0x37],["---"],
      ["A-4","lead","slide",2],["---"],["B-4","lead"],["---"],["C-5","arp_lead","arp",0x47],["---"],["E-5","lead"],["---"]
    ],
    drum0: [
      ["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],
      ["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],
      ["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],["---"],["---"],["---"],["---"],
      ["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"],["C-4","noise_drum"],["---"]
    ]
  },
  orderlist: {
    v1: ["bass0","bass0","bass1","bass1"],
    v2: ["lead0","lead1","lead0","lead1"],
    v3: ["drum0","drum0","drum0","drum0"]
  },
  loop: 0
};

// ============================================================================
// Init Audio — Build variants, fetch MIDI, create tracker song
// ============================================================================
let initPromise = null;

export function initAudio() {
  if (initPromise) return initPromise;
  initPromise = doInitAudio();
  return initPromise;
}

async function doInitAudio() {
  // 1. Build SFX variant bank
  SFX_BANK = buildSfxBank(SFX_TEMPLATES, 10);

  // 2. Initialize SIDForge first — the AudioContext must be created
  // synchronously inside the user gesture, before any awaits
  let forge = null;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    forge = await SidForge.create({ audioCtx });
    forge.loadSfxBank(SFX_BANK);

    const musicVol = state.musicEnabled ? state.musicVolume : 0.0;
    const sfxVol = state.sfxEnabled ? 0.8 : 0.0;
    forge.setVolume(musicVol, sfxVol);
  } catch (err) {
    console.error("Failed to initialize SIDForge Synthesizer:", err);
    return;
  }

  // 3. Title music: try playing the first MP3 in playlist, fall back to metal theme
  try {
    const track = MP3_PLAYLIST[playlistIndex];
    mp3Elem = new Audio("https://enzocage.de/mp3/enzo_cage_atom/" + track);
    mp3Elem.volume = state.musicEnabled ? state.musicVolume : 0.0;
    mp3Elem.addEventListener("ended", playNextTrack);
    await mp3Elem.play();
    console.log("MP3 playing: " + track);
  } catch (e) {
    mp3Elem = null;
    console.warn("MP3 play failed, using fallback:", e.message);
  }
  if (!mp3Elem) {
    TRACKER_SONG = FALLBACK_SONG;
    forge.loadSong(TRACKER_SONG);
  }
  sid = forge; // publish only when fully ready
  const musicLabel = mp3Elem ? MP3_PLAYLIST[playlistIndex] : (TRACKER_SONG ? TRACKER_SONG.title : "none");
  console.log(`SIDForge ready — ${Object.keys(SFX_BANK).length} SFX variants, Music: "${musicLabel}"`);
}

export async function playNextTrack() {
  if (mp3Elem) {
    mp3Elem.pause();
    mp3Elem.removeEventListener("ended", playNextTrack);
  }
  playlistIndex = (playlistIndex + 1) % MP3_PLAYLIST.length;
  const track = MP3_PLAYLIST[playlistIndex];
  try {
    mp3Elem = new Audio("https://enzocage.de/mp3/enzo_cage_atom/" + track);
    mp3Elem.volume = state.musicEnabled ? state.musicVolume : 0.0;
    mp3Elem.addEventListener("ended", playNextTrack);
    if (state.musicEnabled) {
      await mp3Elem.play();
    }
    console.log("Playing next track: " + track);
    
    // Set 0.5s screen overlay prompt with track title
    const cleanedTitle = track
      .replace(/\.mp3$/, "")
      .replace(/^enzo_cage_/, "")
      .replace(/_/g, " ")
      .toUpperCase();
    state.musicTitleTimer = 0.5;
    state.musicTitleMessage = cleanedTitle;
  } catch (err) {
    console.error("Failed to play next track: " + track, err);
  }
}

export function updateMusicVolume() {
  if (mp3Elem) {
    mp3Elem.volume = state.musicEnabled ? state.musicVolume : 0.0;
    if (state.musicEnabled) {
      if (mp3Elem.paused) {
        mp3Elem.play().catch(err => console.log(err));
      }
    } else {
      mp3Elem.pause();
    }
  }
}

// ============================================================================
// Public API
// ============================================================================
export function getSid() { return sid; } // debug/testing handle

export function resumeAudioContext() {
  if (sid && sid.ctx && sid.ctx.state === 'suspended') {
    sid.ctx.resume();
  }
}

export function playSFX(type) {
  if (!sid || !state.sfxEnabled) return;
  const variant = Math.floor(Math.random() * 10);
  // No fixed voice: let the allocator pick a free voice so one-shot SFX
  // don't constantly cut the engine/drone loops living on voice 2
  sid.playSfx(`${type}_v${variant}`);
}

export function updatePersistentSounds(thrustActive, fuelLeft, shipAlive) {
  if (!sid || !state.sfxEnabled) {
    if (currentThrustActive) {
      sid?.poke(2, "gate", false);
      currentThrustActive = false;
    }
    return;
  }

  const shouldPlay = thrustActive && fuelLeft > 0 && shipAlive && state.gameState === STATE_PLAYING && !state.paused;

  if (shouldPlay) {
    if (!currentThrustActive) {
      currentThrustVariant = Math.floor(Math.random() * 10);
      sid.playSfx(`engineThrust_v${currentThrustVariant}`, { voice: 2 });
      currentThrustActive = true;
    }
    const randPitch = 38 + Math.random() * 24;
    sid.poke(2, "freq", randPitch);
  } else {
    if (currentThrustActive) {
      sid.poke(2, "gate", false);
      currentThrustActive = false;
    }
  }
}

export function updateTractorSound(isActive, isSucking, shipAlive) {
  if (!sid || !state.sfxEnabled) {
    if (currentTractorActive) {
      sid?.poke(2, "gate", false);
      currentTractorActive = false;
    }
    return;
  }

  const shouldPlay = isActive && shipAlive && state.gameState === STATE_PLAYING && !state.paused;

  if (shouldPlay) {
    if (!currentTractorActive) {
      currentTractorVariant = Math.floor(Math.random() * 10);
      sid.playSfx(`tractorBeam_v${currentTractorVariant}`, { voice: 2 });
      currentTractorActive = true;
    }
    const targetFreq = isSucking
      ? 220 + Math.sin(Date.now() / 40) * 40
      : 150 + Math.sin(Date.now() / 80) * 10;
    sid.poke(2, "freq", targetFreq);
  } else {
    if (currentTractorActive) {
      sid.poke(2, "gate", false);
      currentTractorActive = false;
    }
  }
}

export function updateDroneSound(vx, vy, shipAlive) {
  if (!sid || !state.sfxEnabled) {
    if (currentDroneActive) {
      sid?.poke(2, "gate", false);
      currentDroneActive = false;
    }
    return;
  }

  const shouldPlay = shipAlive && state.gameState === STATE_PLAYING && !state.paused && !currentThrustActive && !currentTractorActive;

  if (shouldPlay) {
    if (!currentDroneActive) {
      currentDroneVariant = Math.floor(Math.random() * 10);
      sid.playSfx(`drone_v${currentDroneVariant}`, { voice: 2 });
      currentDroneActive = true;
    }
    const speed = Math.sqrt(vx * vx + vy * vy);
    const targetFreq = 55 + Math.min(45, speed * 15);
    sid.poke(2, "freq", targetFreq);
  } else {
    if (currentDroneActive) {
      sid.poke(2, "gate", false);
      currentDroneActive = false;
    }
  }
}

export function updateSequencer() {
  if (!sid) return;

  const sfxVol = state.sfxEnabled ? 0.8 : 0.0;
  if (mp3Elem) {
    sid.setVolume(0.0, sfxVol);
    return; // MP3 handles music, skip SID sequencer
  }

  const musicVol = state.musicEnabled ? state.musicVolume : 0.0;
  sid.setVolume(musicVol, sfxVol);

  if (state.gameState === STATE_TITLE || state.gameState === STATE_HIGHSCORE) {
    if (!musicPlaying) {
      sid.playSong({ loop: true });
      musicPlaying = true;
    }
  } else {
    if (musicPlaying) {
      sid.stopSong();
      musicPlaying = false;
    }
  }
}
