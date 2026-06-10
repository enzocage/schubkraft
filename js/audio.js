import { state, STATE_PLAYING, STATE_TITLE, STATE_HIGHSCORE } from './constants.js';
import { SidForge } from './sidforge.js';

let sid = null;
let musicPlaying = false;
let currentThrustActive = false;
let currentTractorActive = false;
let currentDroneActive = false;

// SFX Bank JSON
const SFX_BANK = {
  pew: {
    priority: 3,
    wave: "sawtooth",
    adsr: [0, 4, 0, 3],
    pitch: { startNote: "C-6", slide: -35, curve: "linear" },
    frames: { len: 10 }
  },
  turretShoot: {
    priority: 2,
    wave: "pulse",
    pw: { start: 1024, speed: 0 },
    adsr: [0, 5, 0, 2],
    pitch: { startNote: "G-4", slide: -22, curve: "linear" },
    frames: { len: 12 }
  },
  explosion: {
    priority: 4,
    wave: "noise",
    adsr: [2, 12, 0, 8],
    pitch: { startNote: "C-2", slide: -1.5, curve: "linear" },
    filter: { mode: "lp", cutoff: 0.7, sweep: -0.02, res: 5 },
    frames: { len: 35 }
  },
  fuelCollected: {
    priority: 2,
    wave: "triangle",
    adsr: [1, 6, 4, 3],
    pitch: { startNote: "C-5", slide: 12, curve: "linear" },
    frames: { len: 15 }
  },
  podAttach: {
    priority: 2,
    wave: "triangle",
    adsr: [0, 4, 0, 2],
    pitch: { startNote: "C-3", slide: 0 },
    frames: { len: 8 }
  },
  shieldPing: {
    priority: 2,
    wave: "pulse",
    pw: { start: 2048, speed: 0 },
    adsr: [0, 3, 0, 2],
    pitch: { startNote: "C-7", slide: -45 },
    frames: { len: 6 }
  },
  doorHiss: {
    priority: 1,
    wave: "noise",
    adsr: [1, 8, 0, 6],
    filter: { mode: "hp", cutoff: 0.6, sweep: 0.01, res: 3 },
    frames: { len: 18 }
  },
  lowFuel: {
    priority: 2,
    wave: "triangle",
    adsr: [0, 4, 0, 2],
    pitch: { startNote: "G-5", slide: 0 },
    frames: { len: 6 }
  },
  select: {
    priority: 2,
    wave: "triangle",
    adsr: [0, 3, 0, 2],
    pitch: { startNote: "C-5", slide: 0 },
    frames: { len: 5 }
  },
  engineThrust: {
    priority: 1,
    wave: "noise",
    adsr: [1, 0, 15, 2],
    pitch: { startFreq: 45, slide: 0 },
    frames: { len: 99999 }
  },
  tractorBeam: {
    priority: 1,
    wave: "triangle",
    adsr: [1, 0, 15, 2],
    pitch: { startFreq: 150, slide: 0 },
    frames: { len: 99999 }
  },
  drone: {
    priority: 0,
    wave: "triangle",
    adsr: [2, 0, 15, 2],
    pitch: { startFreq: 55, slide: 0 },
    frames: { len: 99999 }
  }
};

// Song Tracker JSON (Catchy Hubbard Style)
const TRACKER_SONG = {
  title: "THRUST MAIN THEME",
  speed: 6,
  instruments: {
    bass: {
      wave: "sawtooth",
      adsr: [0, 5, 8, 4]
    },
    lead: {
      wave: "pulse",
      adsr: [1, 6, 9, 3],
      pw: { start: 1600, speed: 25, min: 1000, max: 3000 }
    },
    noise_drum: {
      wave: "noise",
      adsr: [0, 3, 0, 2]
    }
  },
  patterns: {
    bass0: [
      ["A-2", "bass"], ["---"], ["A-2", "bass"], ["---"],
      ["A-2", "bass"], ["---"], ["A-2", "bass"], ["---"],
      ["D-2", "bass"], ["---"], ["D-2", "bass"], ["---"],
      ["D-2", "bass"], ["---"], ["D-2", "bass"], ["---"],
      ["F-2", "bass"], ["---"], ["F-2", "bass"], ["---"],
      ["G-2", "bass"], ["---"], ["G-2", "bass"], ["---"],
      ["A-2", "bass"], ["---"], ["A-2", "bass"], ["---"],
      ["E-2", "bass"], ["---"], ["E-2", "bass"], ["---"]
    ],
    bass1: [
      ["F-2", "bass"], ["---"], ["F-2", "bass"], ["---"],
      ["F-2", "bass"], ["---"], ["F-2", "bass"], ["---"],
      ["G-2", "bass"], ["---"], ["G-2", "bass"], ["---"],
      ["G-2", "bass"], ["---"], ["G-2", "bass"], ["---"],
      ["A-2", "bass"], ["---"], ["A-2", "bass"], ["---"],
      ["A-2", "bass"], ["---"], ["A-2", "bass"], ["---"],
      ["E-2", "bass"], ["---"], ["E-2", "bass"], ["---"],
      ["E-2", "bass"], ["---"], ["E-2", "bass"], ["---"]
    ],
    lead0: [
      ["A-4", "lead"], ["---"], ["B-4", "lead"], ["---"],
      ["C-5", "lead"], ["---"], ["E-5", "lead"], ["---"],
      ["D-5", "lead"], ["---"], ["C-5", "lead"], ["---"],
      ["B-4", "lead"], ["---"], ["G-4", "lead"], ["---"],
      ["A-4", "lead"], ["---"], ["B-4", "lead"], ["---"],
      ["C-5", "lead"], ["---"], ["A-4", "lead"], ["---"],
      ["E-5", "lead"], ["---"], ["D-5", "lead"], ["---"],
      ["E-5", "lead"], ["---"], ["G-5", "lead"], ["---"]
    ],
    lead1: [
      ["A-5", "lead"], ["---"], ["G-5", "lead"], ["---"],
      ["F-5", "lead"], ["---"], ["E-5", "lead"], ["---"],
      ["D-5", "lead"], ["---"], ["C-5", "lead"], ["---"],
      ["B-4", "lead"], ["---"], ["E-5", "lead"], ["---"],
      ["C-5", "lead"], ["---"], ["B-4", "lead"], ["---"],
      ["A-4", "lead"], ["---"], ["G#4", "lead"], ["---"],
      ["A-4", "lead"], ["---"], ["B-4", "lead"], ["---"],
      ["C-5", "lead"], ["---"], ["E-5", "lead"], ["---"]
    ],
    drum0: [
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"],
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"],
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"],
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"],
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"],
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"],
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"],
      ["C-4", "noise_drum"], ["---"], ["---"], ["---"]
    ]
  },
  orderlist: {
    v1: ["bass0", "bass0", "bass1", "bass1"],
    v2: ["lead0", "lead1", "lead0", "lead1"],
    v3: ["drum0", "drum0", "drum0", "drum0"]
  },
  loop: 0
};

export async function initAudio() {
  if (sid) return;
  
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sid = await SidForge.create({ audioCtx });
    sid.loadSfxBank(SFX_BANK);
    sid.loadSong(TRACKER_SONG);
    
    // Set initial volumes
    const musicVol = state.musicEnabled ? 0.7 : 0.0;
    const sfxVol = state.sfxEnabled ? 0.8 : 0.0;
    sid.setVolume(musicVol, sfxVol);
  } catch (err) {
    console.error("Failed to initialize SIDForge Synthesizer:", err);
  }
}

export function resumeAudioContext() {
  if (sid && sid.ctx && sid.ctx.state === 'suspended') {
    sid.ctx.resume();
  }
}

export function updatePersistentSounds(thrustActive, fuelLeft, shipAlive) {
  if (!sid || !state.sfxEnabled) {
    if (currentThrustActive) {
      sid?.poke(2, "gate", false);
      currentThrustActive = false;
    }
    return;
  }
  
  const shouldPlay = thrustActive && fuelLeft > 0 && shipAlive && state.gameState === STATE_PLAYING;
  
  if (shouldPlay) {
    if (!currentThrustActive) {
      sid.playSfx("engineThrust", { voice: 2 });
      currentThrustActive = true;
    }
    // Modulate pitch slightly for dynamic rocket engine rumble
    const randPitch = 40 + Math.random() * 20;
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
  
  const shouldPlay = isActive && shipAlive && state.gameState === STATE_PLAYING;
  
  if (shouldPlay) {
    if (!currentTractorActive) {
      sid.playSfx("tractorBeam", { voice: 2 });
      currentTractorActive = true;
    }
    // Siphoning fuel generates high-speed siren oscillations
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
  
  // Drone only plays when not thrusting or tractoring to avoid voice-2 conflicts
  const shouldPlay = shipAlive && state.gameState === STATE_PLAYING && !currentThrustActive && !currentTractorActive;
  
  if (shouldPlay) {
    if (!currentDroneActive) {
      sid.playSfx("drone", { voice: 2 });
      currentDroneActive = true;
    }
    const speed = Math.sqrt(vx*vx + vy*vy);
    const targetFreq = 55 + Math.min(45, speed * 15);
    sid.poke(2, "freq", targetFreq);
  } else {
    if (currentDroneActive) {
      sid.poke(2, "gate", false);
      currentDroneActive = false;
    }
  }
}

export function playSFX(type) {
  if (!sid || !state.sfxEnabled) return;
  // Route all game triggers to Voice 2
  sid.playSfx(type, { voice: 2 });
}

export function updateSequencer() {
  if (!sid) return;
  
  // Set volumes according to checkboxes dynamically
  const musicVol = state.musicEnabled ? 0.7 : 0.0;
  const sfxVol = state.sfxEnabled ? 0.8 : 0.0;
  sid.setVolume(musicVol, sfxVol);
  
  // Handle start/stop music transitions
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
