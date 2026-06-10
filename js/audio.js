import { state, STATE_PLAYING, STATE_TITLE, STATE_HIGHSCORE } from './constants.js';

let audioCtx = null;
let masterGain = null;
let masterLimiter = null;
let noiseBuffer = null;

let thrustNoiseSource = null;
let thrustOscSource = null;
let thrustGainNode = null;
let thrustFilter = null;

let tractorGainNode = null;
let tractorOsc1 = null;
let tractorOsc2 = null;

let droneGainNode = null;
let droneOsc = null;

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  masterLimiter = audioCtx.createDynamicsCompressor();
  masterLimiter.threshold.setValueAtTime(-1, audioCtx.currentTime);
  masterLimiter.knee.setValueAtTime(0, audioCtx.currentTime);
  masterLimiter.ratio.setValueAtTime(20, audioCtx.currentTime);
  masterLimiter.attack.setValueAtTime(0.005, audioCtx.currentTime);
  masterLimiter.release.setValueAtTime(0.05, audioCtx.currentTime);

  masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.7, audioCtx.currentTime);

  masterGain.connect(masterLimiter);
  masterLimiter.connect(audioCtx.destination);

  const bufferSize = audioCtx.sampleRate * 2;
  noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  setupPersistentSounds();
  setupTractorSound();
  setupDroneSound();
}

export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function setupPersistentSounds() {
  thrustGainNode = audioCtx.createGain();
  thrustGainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  thrustGainNode.connect(masterGain);

  thrustNoiseSource = audioCtx.createBufferSource();
  thrustNoiseSource.buffer = noiseBuffer;
  thrustNoiseSource.loop = true;

  thrustFilter = audioCtx.createBiquadFilter();
  thrustFilter.type = 'bandpass';
  thrustFilter.frequency.setValueAtTime(450, audioCtx.currentTime);
  thrustFilter.Q.setValueAtTime(2.2, audioCtx.currentTime);

  thrustOscSource = audioCtx.createOscillator();
  thrustOscSource.type = 'sawtooth';
  thrustOscSource.frequency.setValueAtTime(50, audioCtx.currentTime);

  const oscGain = audioCtx.createGain();
  oscGain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  thrustOscSource.connect(oscGain);
  oscGain.connect(thrustGainNode);

  const lfo = audioCtx.createOscillator();
  lfo.frequency.setValueAtTime(8, audioCtx.currentTime);

  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(140, audioCtx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(thrustFilter.frequency);

  thrustNoiseSource.connect(thrustFilter);
  thrustFilter.connect(thrustGainNode);

  lfo.start();
  thrustNoiseSource.start();
  thrustOscSource.start();
}

function setupTractorSound() {
  tractorGainNode = audioCtx.createGain();
  tractorGainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  tractorGainNode.connect(masterGain);

  tractorOsc1 = audioCtx.createOscillator();
  tractorOsc1.type = 'triangle';
  tractorOsc1.frequency.setValueAtTime(220, audioCtx.currentTime);

  tractorOsc2 = audioCtx.createOscillator();
  tractorOsc2.type = 'triangle';
  tractorOsc2.frequency.setValueAtTime(224, audioCtx.currentTime);

  tractorOsc1.connect(tractorGainNode);
  tractorOsc2.connect(tractorGainNode);

  tractorOsc1.start();
  tractorOsc2.start();
}

function setupDroneSound() {
  droneGainNode = audioCtx.createGain();
  droneGainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  droneGainNode.connect(masterGain);

  droneOsc = audioCtx.createOscillator();
  droneOsc.type = 'sine';
  droneOsc.frequency.setValueAtTime(65, audioCtx.currentTime);
  droneOsc.connect(droneGainNode);
  droneOsc.start();
}

export function updatePersistentSounds(thrustActive, fuelLeft, shipAlive) {
  if (!thrustGainNode) return;
  const targetGain = (state.sfxEnabled && thrustActive && fuelLeft > 0 && shipAlive && state.gameState === STATE_PLAYING) ? 0.20 : 0.0001;
  thrustGainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.04);
}

export function updateTractorSound(isActive, isSucking, shipAlive) {
  if (!tractorGainNode) return;
  const targetGain = (state.sfxEnabled && isActive && shipAlive && state.gameState === STATE_PLAYING) ? 0.24 : 0.0001;
  tractorGainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.03);

  const targetFreq = isSucking ? 330 : 220;
  tractorOsc1.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.08);
  tractorOsc2.frequency.setTargetAtTime(targetFreq + 4, audioCtx.currentTime, 0.08);
}

export function updateDroneSound(vx, vy, shipAlive) {
  if (!droneGainNode) return;
  const speed = Math.sqrt(vx*vx + vy*vy);
  const targetGain = (state.sfxEnabled && shipAlive && state.gameState === STATE_PLAYING) ? 0.05 : 0.0001;
  droneGainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
  
  const targetFreq = 65 + Math.min(60, speed * 25);
  droneOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.08);
}

export function playSFX(type) {
  if (!audioCtx || audioCtx.state === 'suspended' || !state.sfxEnabled) return;
  const now = audioCtx.currentTime;

  if (type === "pew") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1700, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.09);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  } 
  else if (type === "turretShoot") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.16);
    
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  } 
  else if (type === "explosion") {
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(50, now + 1.0);
    
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    
    const subOsc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, now);
    subOsc.frequency.linearRampToValueAtTime(20, now + 0.8);
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    
    noise.start(now);
    noise.stop(now + 1.0);
    subOsc.start(now);
    subOsc.stop(now + 0.8);
  } 
  else if (type === "fuelCollected") {
    const notes = [440, 554, 659];
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      
      gain.gain.setValueAtTime(0.12, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.08);
      
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.09);
    });
  } 
  else if (type === "podAttach") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  } 
  else if (type === "shieldPing") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.05);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }
  else if (type === "doorHiss") {
    // Hydraulic mechanical sweep + noise door sound
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4000, now);
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.3);

    const sweep = audioCtx.createOscillator();
    const sweepGain = audioCtx.createGain();
    sweep.type = 'triangle';
    sweep.frequency.setValueAtTime(120, now);
    sweep.frequency.exponentialRampToValueAtTime(45, now + 0.3);
    sweepGain.gain.setValueAtTime(0.2, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    sweep.connect(sweepGain);
    sweepGain.connect(masterGain);
    sweep.start(now);
    sweep.stop(now + 0.31);
  }
  else if (type === "lowFuel") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }
  else if (type === "select") {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(523.25, now); // C5
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

// Chiptune Sequencer parameters
let seqBeat = 0;
let nextBeatTime = 0;
const seqTempo = 138;
const seqStepLength = 60 / seqTempo / 2; // 8th notes

const BASS_SEQ = [
  'A2','','A2','','E2','','E2','',
  'G2','','G2','','D2','','D2','',
  'F2','','F2','','C2','','C2','',
  'E2','','E2','','E2','','G2',''
];

const LEAD_SEQ = [
  'A3','C4','E4','A4','G4','E4','C4','G3',
  'A3','C4','E4','A4','B4','G4','E4','B3',
  'C4','E4','G4','C5','A4','F4','D4','A3',
  'B3','D4','F4','B4','E4','B3','G3','E3'
];

const FREQ_MAP = {
  'C2':65.41,'D2':73.42,'E2':82.41,'F2':87.31,'G2':98.00,'A2':110.00,'B2':123.47,
  'C3':130.81,'D3':146.83,'E3':164.81,'F3':174.61,'G3':196.00,'A3':220.00,'B3':246.94,
  'C4':261.63,'D4':293.66,'E4':329.63,'F4':349.23,'G4':392.00,'A4':440.00,'B4':493.88,
  'C5':523.25
};

function playSequencerNote(freq, type, duration, vol, time) {
  if (!audioCtx || audioCtx.state === 'suspended' || !state.musicEnabled) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  
  gainNode.gain.setValueAtTime(vol, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  
  osc.connect(gainNode);
  gainNode.connect(masterGain);
  osc.start(time);
  osc.stop(time + duration);

  // detuned voice chorus
  if (type === 'square') {
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.006, time);
    gain2.gain.setValueAtTime(vol * 0.45, time);
    gain2.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(time);
    osc2.stop(time + duration);
  }
}

function playSequencerNoiseHat(time) {
  if (!audioCtx || audioCtx.state === 'suspended' || !state.musicEnabled) return;
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(9500, time);
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.015, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  source.start(time);
  source.stop(time + 0.05);
}

function playSequencerNoiseSnare(time) {
  if (!audioCtx || audioCtx.state === 'suspended' || !state.musicEnabled) return;
  const source = audioCtx.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200, time);
  filter.Q.setValueAtTime(1.8, time);
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.05, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(masterGain);
  source.start(time);
  source.stop(time + 0.1);
}

export function updateSequencer() {
  if (state.gameState !== STATE_TITLE && state.gameState !== STATE_HIGHSCORE) return;
  if (!audioCtx) return;
  
  const now = audioCtx.currentTime;
  if (nextBeatTime === 0) nextBeatTime = now + 0.1;

  while (nextBeatTime < now + 0.15) {
    const bassNote = BASS_SEQ[seqBeat];
    if (bassNote && FREQ_MAP[bassNote]) {
      playSequencerNote(FREQ_MAP[bassNote], 'triangle', seqStepLength * 1.7, 0.32, nextBeatTime);
    }

    const leadNote = LEAD_SEQ[seqBeat];
    if (leadNote && FREQ_MAP[leadNote]) {
      playSequencerNote(FREQ_MAP[leadNote], 'square', seqStepLength * 0.88, 0.08, nextBeatTime);
    }

    if (seqBeat % 8 === 4) {
      playSequencerNoiseSnare(nextBeatTime);
    } else if (seqBeat % 2 === 0) {
      playSequencerNoiseHat(nextBeatTime);
    }

    nextBeatTime += seqStepLength;
    seqBeat = (seqBeat + 1) % 32;
  }
}
