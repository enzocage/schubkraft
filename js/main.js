import {
  state,
  STATE_TITLE,
  STATE_PLAYING,
  STATE_LEVEL_COMPLETE,
  STATE_GAME_OVER,
  STATE_EDITOR,
  STATE_HIGHSCORE,
  TITLE_MENU_ITEMS,
  CAMPAIGN,
  THEMES
} from './constants.js?v=2';

import {
  generateLevelSuggestions,
  DIFFICULTY_PRESETS
} from './levelgen.js?v=2';

import {
  initAudio,
  resumeAudioContext,
  updatePersistentSounds,
  updateDroneSound,
  updateTractorSound,
  updateSequencer,
  updateMusicVolume,
  playNextTrack,
  playSFX
} from './audio.js?v=2';

import {
  loadLevel,
  updatePhysics,
  buildCollisionGrid,
  bakeTerrain,
  showNotification
} from './physics.js?v=2';

import {
  bindInputEvents
} from './input.js?v=2';

import {
  renderGame,
  tickAnimation
} from './renderer.js?v=2';

import {
  toggleEditor,
  triggerEditorUndo,
  triggerEditorRedo,
  saveEditorUndoState,
  populateEntityProperties,
  handleEditorClick,
  startPlaytest
} from './editor.js?v=2';

// Get DOM elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================================
// 1. INITIALIZATION
// ==========================================

// Initialize pseudo-3D starfield: z = depth (0 far .. 1 near).
// Near stars are bigger glowing discs that parallax faster.
for (let i = 0; i < 180; i++) {
  const z = Math.pow(Math.random(), 1.6); // bias toward far stars
  state.stars.push({
    x: Math.random() * 320,
    y: Math.random() * 200,
    z: z,
    twinkle: Math.random() * Math.PI * 2
  });
}

// Load highscores from localstorage
const localHS = localStorage.getItem("schubkraft_highscores");
if (localHS) {
  try {
    state.highscores = JSON.parse(localHS);
  } catch (err) {}
}

// Bind canvas inputs and window key listeners
bindInputEvents(canvas);

// Dynamic Campaign Select population
function buildCampaignList() {
  const container = document.getElementById("campaign-list-container");
  if (!container) return;
  container.innerHTML = "";
  
  CAMPAIGN.forEach((level, idx) => {
    const btn = document.createElement("button");
    btn.className = "editor-btn";
    btn.style.textAlign = "left";
    btn.style.padding = "8px 12px";
    btn.innerText = `${idx + 1}. ${level.name} (${level.difficulty || level.theme.toUpperCase()})`;
    btn.addEventListener("click", () => {
      state.lives = 3;
      state.score = 0;
      state.activeCampaignIdx = idx;
      loadLevel(CAMPAIGN[idx]);
      state.gameState = STATE_PLAYING;
      document.getElementById("campaign-select-panel").style.display = "none";
    });
    container.appendChild(btn);
  });
}
buildCampaignList();

document.getElementById("btn-close-campaign-select").addEventListener("click", () => {
  document.getElementById("campaign-select-panel").style.display = "none";
});

// ==========================================
// 2. VIEWPORT / RESIZING COORDINATES
// ==========================================
function scaleViewport() {
  const container = document.getElementById("canvas-container");
  const w = container.clientWidth;
  const h = container.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
}

window.addEventListener("resize", scaleViewport);
scaleViewport();

// ==========================================
// 3. VISUAL EFFECTS ANIMATOR LOOP
// ==========================================
function updateVisualEffects(dt) {
  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt * 26);
  }
  if (state.flashTimer > 0) {
    state.flashTimer = Math.max(0, state.flashTimer - dt);
  }
  if (state.textPromptTimer > 0) {
    state.textPromptTimer = Math.max(0, state.textPromptTimer - dt);
  }
  if (state.musicTitleTimer > 0) {
    state.musicTitleTimer = Math.max(0, state.musicTitleTimer - dt);
  }
  if (state.transitionTimer > 0) {
    state.transitionTimer = Math.max(0, state.transitionTimer - dt);
  }

  // Parallax moon rotation drift
  state.rotateMoon += dt * 0.04;

  // 3D starfield fly-through: stars slowly drift toward the camera
  // (z grows -> bigger, faster, brighter), then recycle to the far plane
  for (const star of state.stars) {
    star.z += dt * 0.018;
    if (star.z > 1) {
      star.z = 0.02 + Math.random() * 0.08;
      star.x = Math.random() * 320;
      star.y = Math.random() * 200;
    }
  }

  // Update particle physics (with gravity + slight drag on explosion debris)
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    if (p.grav) {
      p.vy += dt * 1.6;
      p.vx *= 0.985;
      p.vy *= 0.985;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  // Update spinning wireframe debris shards
  for (let i = state.debris.length - 1; i >= 0; i--) {
    const d = state.debris[i];
    d.vy += dt * 1.4;
    d.vx *= 0.99;
    d.vy *= 0.99;
    d.x += d.vx;
    d.y += d.vy;
    d.rot += d.vr;
    d.life -= dt;
    if (d.life <= 0) {
      state.debris.splice(i, 1);
    }
  }

  // Update expanding shockwaves
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const sw = state.shockwaves[i];
    sw.life -= dt;
    sw.radius += dt * 80;
    if (sw.life <= 0) {
      state.shockwaves.splice(i, 1);
    }
  }

  // Reactor overload: continuous embers + smoke pouring off the core
  if (state.reactorTimer > 0 && state.gameState === STATE_PLAYING) {
    const reactor = state.entities.find(e => e.type === "reactor");
    if (reactor && Math.random() < 0.7) {
      const a = Math.random() * Math.PI * 2;
      const emberLife = Math.random() * 0.7 + 0.3;
      state.particles.push({
        x: reactor.x + Math.cos(a) * 10,
        y: reactor.y + Math.sin(a) * 10,
        vx: Math.cos(a) * (0.4 + Math.random() * 0.8),
        vy: Math.sin(a) * (0.4 + Math.random() * 0.8) - 0.6,
        color: Math.random() < 0.5 ? "#ff5500" : "#ffaa00",
        life: emberLife, maxLife: emberLife,
        size: Math.random() * 1.2 + 0.5
      });
    }
  }

  // Spawning spectacular orange/yellow thruster rocket sparks
  if (state.keys.thrust && state.ship.fuel > 0 && state.ship.alive && state.gameState === STATE_PLAYING) {
    if (Math.random() < 0.65) {
      // Drifting larger gray/purple exhaust smoke puffs
      const smokeLife = Math.random() * 1.0 + 0.5;
      state.particles.push({
        x: state.ship.x - Math.cos(state.ship.angle) * 6,
        y: state.ship.y - Math.sin(state.ship.angle) * 6,
        vx: -Math.cos(state.ship.angle) * 0.45 + (Math.random() - 0.5) * 0.3,
        vy: -Math.sin(state.ship.angle) * 0.45 + (Math.random() - 0.5) * 0.3 - 0.1,
        color: Math.random() < 0.4 ? "rgba(160,160,175,0.4)" : "rgba(110,90,130,0.25)",
        life: smokeLife, maxLife: smokeLife, size: Math.random() * 3.5 + 1.5
      });
    }
    // Generate multiple sparks per frame for full exhaust cone
    const sparkCount = Math.random() < 0.5 ? 2 : 3;
    for (let sp = 0; sp < sparkCount; sp++) {
      const nozzleX = state.ship.x - Math.cos(state.ship.angle) * 4;
      const nozzleY = state.ship.y - Math.sin(state.ship.angle) * 4;
      const angleSpread = state.ship.angle + Math.PI + (Math.random() - 0.5) * 0.45;
      const spd = Math.random() * 2.2 + 0.8;
      const sparkLife = Math.random() * 0.42 + 0.15;
      state.particles.push({
        x: nozzleX,
        y: nozzleY,
        vx: Math.cos(angleSpread) * spd + state.ship.vx * 0.35,
        vy: Math.sin(angleSpread) * spd + state.ship.vy * 0.35,
        color: Math.random() < 0.2 ? "#ffffff" : (Math.random() < 0.5 ? "#ffcc33" : "#ff4500"),
        life: sparkLife,
        maxLife: sparkLife,
        size: Math.random() * 2.0 + 0.5
      });
    }
  }

  // Dynamic warning siren speed
  if (state.reactorTimer > 0) {
    const speed = 1.0 + (10.0 - state.reactorTimer) * 1.5;
    const currentTime = Date.now() / 1000;
    if (Math.floor(currentTime * speed) % 2 === 0) {
      state.flashTimer = 0.02;
    }
  }

  // Low fuel blink alarm sounds
  if (state.gameState === STATE_PLAYING && state.ship.alive && state.ship.fuel < 250) {
    const rate = state.ship.fuel < 100 ? 0.35 : 0.75;
    const currentTime = Date.now() / 1000;
    if (Math.floor(currentTime / rate) % 2 === 0) {
      if (Math.random() < 0.06) playSFX("lowFuel");
    }
  }
}

// ==========================================
// 4. CORE GAME LOOP ACCUMULATOR
// ==========================================
const FPS_CAP = 60;
const FRAME_DT = 1 / FPS_CAP;
let gameLoopAccumulator = 0;
let gameLoopLastTime = 0;

function coreGameLoop(time) {
  if (!gameLoopLastTime) gameLoopLastTime = time;
  let frameTime = (time - gameLoopLastTime) / 1000;
  if (frameTime > 0.25) frameTime = 0.25;
  gameLoopLastTime = time;

  updateSequencer();

  if (state.gameState === STATE_PLAYING && !state.paused) {
    gameLoopAccumulator += frameTime;
    while (gameLoopAccumulator >= FRAME_DT) {
      updatePhysics(FRAME_DT);
      gameLoopAccumulator -= FRAME_DT;
    }
  }

  updateVisualEffects(frameTime);
  updatePersistentSounds(state.keys.thrust, state.ship.fuel, state.ship.alive);
  updateDroneSound(state.ship.vx, state.ship.vy, state.ship.alive);

  if (state.gameState === STATE_PLAYING && !state.ship.alive) {
    state.ship.respawnTimer -= frameTime;
    if (state.ship.respawnTimer <= 0) {
      if (state.lives > 0) {
        playSFX("respawn");
        loadLevel(state.activeLevel);
      } else {
        const minScore = state.highscores.length >= 5 ? state.highscores[4].score : 0;
        if (state.score > minScore) {
          state.gameState = STATE_HIGHSCORE;
          state.hsNewName = "AAA";
          state.hsNameIndex = 0;
          showNotification("BESTENLISTE ERREICHT! NAME EINGEBEN");
        } else {
          state.gameState = STATE_GAME_OVER;
          playSFX("gameOver");
        }
        updateTractorSound(false, false, false);
      }
    }
  }

  // Show the music toggle only while actually playing
  const musicBtnShouldShow = state.gameState === STATE_PLAYING;
  if (musicBtnShouldShow !== musicPlayBtnShown) {
    musicPlayBtnShown = musicBtnShouldShow;
    if (musicPlayBtn) musicPlayBtn.style.display = musicBtnShouldShow ? "flex" : "none";
  }

  renderGame(canvas, ctx);
  requestAnimationFrame(coreGameLoop);
}

// ==========================================
// 5. EXTERNAL CONTROLS & TOGGLERS BINDINGS
// ==========================================

// CRT Scanlines toggler
const chkCrt = document.getElementById("chk-crt");
if (chkCrt) {
  chkCrt.addEventListener("change", (e) => {
    const overlay = document.getElementById("crt-overlay");
    const vignette = document.getElementById("crt-vignette");
    const cab = document.getElementById("cabinet-bezel");
    if (overlay && vignette && cab) {
      if (e.target.checked) {
        overlay.classList.remove("disabled");
        vignette.style.boxShadow = "inset 0 0 100px rgba(0,0,0,0.95)";
        cab.style.borderRadius = "20px";
      } else {
        overlay.classList.add("disabled");
        vignette.style.boxShadow = "none";
        cab.style.borderRadius = "0";
      }
    }
  });
}

// Vector Bloom / Glow toggler
const chkBloom = document.getElementById("chk-bloom");
if (chkBloom) {
  chkBloom.addEventListener("change", (e) => {
    state.useBloom = e.target.checked;
  });
}

// Music / sound toggle checkboxes
const chkMusic = document.getElementById("chk-music");
if (chkMusic) {
  chkMusic.addEventListener("change", (e) => {
    state.musicEnabled = e.target.checked;
    updateMusicVolume();
    refreshMusicPlayBtn();
  });
}

// In-game music toggle (bottom right, play mode only — shown/hidden by the game loop)
const musicPlayBtn = document.getElementById("btn-music-play-toggle");
let musicPlayBtnShown = false;

function refreshMusicPlayBtn() {
  if (!musicPlayBtn) return;
  if (state.musicEnabled) {
    musicPlayBtn.style.color = "var(--primary)";
    musicPlayBtn.style.borderColor = "rgba(124, 252, 0, 0.4)";
    musicPlayBtn.style.textDecoration = "none";
    musicPlayBtn.style.opacity = "1";
  } else {
    musicPlayBtn.style.color = "#ff5555";
    musicPlayBtn.style.borderColor = "rgba(255, 85, 85, 0.4)";
    musicPlayBtn.style.textDecoration = "line-through";
    musicPlayBtn.style.opacity = "0.75";
  }
}

if (musicPlayBtn) {
  musicPlayBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    state.musicEnabled = !state.musicEnabled;
    updateMusicVolume();
    if (chkMusic) chkMusic.checked = state.musicEnabled;
    refreshMusicPlayBtn();
    playSFX("select");
  });
}

const volMusic = document.getElementById("vol-music");
if (volMusic) {
  volMusic.addEventListener("input", (e) => {
    state.musicVolume = parseInt(e.target.value) / 100;
    updateMusicVolume();
  });
}

const chkSfx = document.getElementById("chk-sfx");
if (chkSfx) {
  chkSfx.addEventListener("change", (e) => {
    state.sfxEnabled = e.target.checked;
  });
}

// Next track button
const btnNextMusic = document.getElementById("btn-next-music");
if (btnNextMusic) {
  btnNextMusic.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    playNextTrack();
  });
}

// Toggle HUD settings overlay
let hudUserOpened = false;
const hudPanel = document.getElementById("external-controls");

console.log("[DIAGNOSTIC] main.js: setting up toggleHUD, hudPanel exists:", !!hudPanel);

const toggleHUD = (e) => {
  console.log("[DIAGNOSTIC] toggleHUD called, event:", e ? e.type : "none");
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  hudUserOpened = !hudUserOpened;
  if (hudPanel) {
    if (hudUserOpened) {
      hudPanel.classList.add("active");
      console.log("[DIAGNOSTIC] added active class to hudPanel");
    } else {
      hudPanel.classList.remove("active");
      console.log("[DIAGNOSTIC] removed active class from hudPanel");
    }
  } else {
    console.log("[DIAGNOSTIC] hudPanel is null inside toggleHUD!");
  }
};

const btnToggleHUD = document.getElementById("btn-toggle-hud");
console.log("[DIAGNOSTIC] btnToggleHUD exists:", !!btnToggleHUD);
if (btnToggleHUD) {
  btnToggleHUD.addEventListener("click", toggleHUD);
  console.log("[DIAGNOSTIC] registered click listener on btnToggleHUD");
}

// Toggle Help overlay window
let helpOpened = false;
const helpPanel = document.getElementById("help-panel");

const toggleHelp = (e) => {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  helpOpened = !helpOpened;
  if (helpPanel) {
    if (helpOpened) {
      helpPanel.style.display = "block";
      if (state.gameState === STATE_PLAYING) {
        state.paused = true;
      }
      playSFX("select");
    } else {
      helpPanel.style.display = "none";
    }
  }
};

const btnCloseHelp = document.getElementById("btn-close-help");
if (btnCloseHelp) {
  btnCloseHelp.addEventListener("click", toggleHelp);
}

// Stop help panel clicks from triggering game inputs
if (helpPanel) {
  helpPanel.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// Stop settings panel clicks from triggering game inputs
if (hudPanel) {
  hudPanel.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// Bezel top bar MENU button
const bezelMenuBtn = document.getElementById("btn-bezel-menu");
if (bezelMenuBtn) {
  const handleMenuClick = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    playSFX("select");
    
    // Deactivate editor HUD sidebar and status overlays completely
    const edToolbar = document.getElementById("editor-toolbar");
    if (edToolbar) edToolbar.style.display = "none";
    const edStatus = document.getElementById("editor-status-bar");
    if (edStatus) edStatus.style.display = "none";
    const themeSettings = document.getElementById("theme-settings-panel");
    if (themeSettings) themeSettings.style.display = "none";
    const entityProp = document.getElementById("entity-properties-panel");
    if (entityProp) entityProp.style.display = "none";
    
    // Close help overlay
    if (helpPanel) {
      helpPanel.style.display = "none";
    }
    helpOpened = false;
    
    // Return to main menu title screen
    state.gameState = STATE_TITLE;
    
    // Close any other open modals
    document.querySelectorAll(".dialog-panel").forEach(panel => {
      panel.style.display = "none";
    });
  };
  bezelMenuBtn.addEventListener("click", handleMenuClick);
}

// C64 Color Cycling for INSERT COIN
const C64_COLORS = [
  "#FF7777", // Light Red
  "#88FF88", // Light Green
  "#8888FF", // Light Blue
  "#EEEE77", // Yellow
  "#CC44CC", // Purple
  "#AAFFEE", // Cyan
  "#DD8855", // Orange
  "#FFFFFF"  // White
];

const insertCoinEl = document.getElementById("insert-coin-text");
if (insertCoinEl) {
  const text = insertCoinEl.innerText;
  insertCoinEl.innerHTML = text.split("").map(char => {
    if (char === " ") return " ";
    return `<span class="coin-char" style="transition: color 0.1s; font-family: inherit; display: inline-block;">${char}</span>`;
  }).join("");
}

let colorCycleFrame = 0;
let currentPattern = 0;
const coinChars = document.querySelectorAll(".coin-char");

setInterval(() => {
  if (coinChars.length === 0) return;
  colorCycleFrame++;
  
  // Change pattern every 60 frames (approx 6 seconds)
  if (colorCycleFrame % 60 === 0) {
    currentPattern = (currentPattern + 1) % 4;
  }
  
  coinChars.forEach((charEl, idx) => {
    let colorIdx = 0;
    if (currentPattern === 0) {
      // Rainbow wave
      colorIdx = (colorCycleFrame + idx) % C64_COLORS.length;
    } else if (currentPattern === 1) {
      // Color wash / synchronous blink
      colorIdx = Math.floor(colorCycleFrame / 2) % C64_COLORS.length;
    } else if (currentPattern === 2) {
      // Alternating odd/even letters
      const isOdd = idx % 2 === 0;
      colorIdx = (Math.floor(colorCycleFrame / 3) + (isOdd ? 0 : 4)) % C64_COLORS.length;
    } else if (currentPattern === 3) {
      // Center-out wave radiating from center
      const center = (coinChars.length - 1) / 2;
      const dist = Math.abs(idx - center);
      colorIdx = (colorCycleFrame - Math.round(dist)) % C64_COLORS.length;
      if (colorIdx < 0) colorIdx += C64_COLORS.length;
    }
    
    charEl.style.color = C64_COLORS[colorIdx];
    charEl.style.textShadow = `0 0 6px ${C64_COLORS[colorIdx]}`;
  });
}, 100);

// Blink reminder every 200 seconds
setInterval(() => {
  if (!hudUserOpened) {
    hudPanel.classList.add("active");
    setTimeout(() => {
      if (!hudUserOpened) {
        hudPanel.classList.remove("active");
      }
    }, 1200); // Fades in and stays visible for about 1 second, then fades out
  }
}, 200000);

// ==========================================
// 6. EDITOR TOOLBAR ACTION BINDINGS
// ==========================================

function updateStatusModeHUD() {
  const modeSpan = document.getElementById("status-mode");
  if (modeSpan) {
    let text = `MODUS: ${state.editorMode.toUpperCase()}`;
    if (state.editorMode === "entity") text += ` (${state.selectedEntityPreset.toUpperCase()})`;
    modeSpan.innerText = text;
  }
}

document.getElementById("btn-mode-poly").addEventListener("click", () => {
  state.editorMode = "poly";
  setBtnActive("btn-mode-poly");
  updateStatusModeHUD();
});

const entSelect = document.getElementById("entity-select");
const selectTriggerHandler = () => {
  state.editorMode = "entity";
  state.selectedEntityPreset = entSelect.value;
  setBtnActive("entity-select");
  updateStatusModeHUD();
};
entSelect.addEventListener("change", selectTriggerHandler);
entSelect.addEventListener("focus", selectTriggerHandler);
entSelect.addEventListener("click", selectTriggerHandler);

document.getElementById("btn-mode-delete").addEventListener("click", () => {
  state.editorMode = "delete";
  setBtnActive("btn-mode-delete");
  showNotification("LOESCHEN-MODUS AKTIVIERT");
  updateStatusModeHUD();
});

document.getElementById("prop-angle-range").addEventListener("input", (e) => {
  document.getElementById("prop-angle-val").innerText = e.target.value + "°";
});

document.getElementById("btn-close-properties").addEventListener("click", () => {
  document.getElementById("entity-properties-panel").style.display = "none";
  state.editorSelectedEntity = null;
});

document.getElementById("btn-delete-prop-entity").addEventListener("click", () => {
  if (state.editorSelectedEntity) {
    saveEditorUndoState();
    const idx = state.activeLevel.entities.indexOf(state.editorSelectedEntity);
    if (idx !== -1) {
      state.activeLevel.entities.splice(idx, 1);
      showNotification("OBJEKT GELOESCHT");
    }
    document.getElementById("entity-properties-panel").style.display = "none";
    state.editorSelectedEntity = null;
    loadLevel(state.activeLevel);
  }
});

document.getElementById("btn-save-properties").addEventListener("click", () => {
  if (state.editorSelectedEntity) {
    saveEditorUndoState();
    const ent = state.editorSelectedEntity;
    if (ent.type === "turret") {
      const deg = parseFloat(document.getElementById("prop-angle-range").value);
      ent.angle = deg * Math.PI / 180;
    }
    else if (ent.type === "door") {
      ent.trigger = document.getElementById("prop-trigger-input").value;
      ent.w = parseInt(document.getElementById("prop-door-w").value) || 8;
      ent.h = parseInt(document.getElementById("prop-door-h").value) || 60;
    }
    else if (ent.type === "switch") {
      ent.target = document.getElementById("prop-target-input").value;
    }
    document.getElementById("entity-properties-panel").style.display = "none";
    state.editorSelectedEntity = null;
    showNotification("EIGENSCHAFTEN GESPEICHERT");
    loadLevel(state.activeLevel);
  }
});

document.getElementById("btn-zoom-in").addEventListener("click", () => {
  state.editorScale = Math.min(2.0, state.editorScale + 0.25);
  showNotification(`ZOOM: ${Math.round(state.editorScale * 100)}%`);
  const zoomSpan = document.getElementById("status-zoom");
  if (zoomSpan) zoomSpan.innerText = `ZOOM: ${Math.round(state.editorScale * 100)}%`;
});

document.getElementById("btn-zoom-out").addEventListener("click", () => {
  state.editorScale = Math.max(0.5, state.editorScale - 0.25);
  showNotification(`ZOOM: ${Math.round(state.editorScale * 100)}%`);
  const zoomSpan = document.getElementById("status-zoom");
  if (zoomSpan) zoomSpan.innerText = `ZOOM: ${Math.round(state.editorScale * 100)}%`;
});

document.getElementById("shape-templates-select").addEventListener("change", (e) => {
  const val = e.target.value;
  if (!val) return;
  
  saveEditorUndoState();
  const cx = state.editorCam.x;
  const cy = state.editorCam.y;
  
  let poly = [];
  if (val === "pillar") {
    poly = [[cx - 20, cy - 30], [cx + 20, cy - 30], [cx + 15, cy + 30], [cx - 15, cy + 30]];
  } else if (val === "basin") {
    poly = [[cx - 40, cy - 20], [cx - 30, cy + 20], [cx + 30, cy + 20], [cx + 40, cy - 20], [cx + 20, cy - 20], [cx + 15, cy + 10], [cx - 15, cy + 10], [cx - 20, cy - 20]];
  } else if (val === "pad") {
    poly = [[cx - 25, cy + 10], [cx + 25, cy + 10], [cx + 15, cy + 20], [cx - 15, cy + 20]];
  } else if (val === "bridge") {
    poly = [[cx - 50, cy - 5], [cx + 50, cy - 5], [cx + 50, cy + 5], [cx - 50, cy + 5]];
  }
  
  state.activeLevel.polygons.push(poly);
  buildCollisionGrid();
  bakeTerrain();
  showNotification("VORLAGE EINGEFUEGT");
  e.target.value = "";
});

document.getElementById("btn-editor-undo").addEventListener("click", () => {
  triggerEditorUndo();
});

document.getElementById("btn-editor-redo").addEventListener("click", () => {
  triggerEditorRedo();
});

document.getElementById("chk-grid-dots").addEventListener("change", (e) => {
  state.editorShowGridDots = e.target.checked;
});

document.getElementById("btn-close-editor").addEventListener("click", () => {
  toggleEditor(false);
});

document.getElementById("btn-open-settings").addEventListener("click", () => {
  document.getElementById("level-name-input").value = state.activeLevel.name || "";
  document.getElementById("theme-select").value = state.activeLevel.theme || "c64";
  document.getElementById("gravity-range").value = state.activeLevel.gravity || 0.022;
  document.getElementById("gravity-val").innerText = state.activeLevel.gravity || 0.022;
  document.getElementById("fuel-range").value = state.activeLevel.fuel || 2000;
  document.getElementById("fuel-val").innerText = state.activeLevel.fuel || 2000;
  document.getElementById("inverted-gravity-chk").checked = !!state.activeLevel.invertedGravity;
  document.getElementById("exit-y-range").value = state.activeLevel.exitY || 50;
  document.getElementById("exit-y-val").innerText = state.activeLevel.exitY || 50;
  document.getElementById("theme-settings-panel").style.display = "block";
});

document.getElementById("btn-save-settings").addEventListener("click", () => {
  saveEditorUndoState();
  state.activeLevel.name = document.getElementById("level-name-input").value;
  state.activeLevel.theme = document.getElementById("theme-select").value;
  state.activeLevel.gravity = parseFloat(document.getElementById("gravity-range").value);
  state.activeLevel.fuel = parseInt(document.getElementById("fuel-range").value);
  state.activeLevel.invertedGravity = document.getElementById("inverted-gravity-chk").checked;
  state.activeLevel.exitY = parseInt(document.getElementById("exit-y-range").value);
  
  const gridVal = parseInt(document.getElementById("grid-snap-select").value);
  if (gridVal === 0) {
    state.snapToGrid = false;
  } else {
    state.snapToGrid = true;
    state.editorGridSize = gridVal;
  }

  const snapSpan = document.getElementById("status-snap");
  if (snapSpan) {
    snapSpan.innerText = state.snapToGrid ? `SNAP: ${state.editorGridSize}px` : "SNAP: FREI";
  }

  document.getElementById("theme-settings-panel").style.display = "none";
  loadLevel(state.activeLevel);
});

document.getElementById("gravity-range").addEventListener("input", (e) => {
  document.getElementById("gravity-val").innerText = e.target.value;
});

document.getElementById("fuel-range").addEventListener("input", (e) => {
  document.getElementById("fuel-val").innerText = e.target.value;
});

document.getElementById("exit-y-range").addEventListener("input", (e) => {
  document.getElementById("exit-y-val").innerText = e.target.value;
});

document.getElementById("btn-test-level").addEventListener("click", () => {
  startPlaytest();
});

document.getElementById("btn-export").addEventListener("click", () => {
  document.getElementById("modal-title").innerText = "Level JSON Export";
  document.getElementById("json-textarea").value = JSON.stringify(state.activeLevel, null, 2);
  document.getElementById("btn-import-json").style.display = "none";
  document.getElementById("btn-upload-json").style.display = "none";
  document.getElementById("json-modal").style.display = "block";
});

document.getElementById("btn-import").addEventListener("click", () => {
  document.getElementById("modal-title").innerText = "Level JSON Import";
  document.getElementById("json-textarea").value = "";
  document.getElementById("json-textarea").readOnly = false;
  document.getElementById("btn-import-json").style.display = "block";
  document.getElementById("btn-upload-json").style.display = "block";
  document.getElementById("json-modal").style.display = "block";
});

document.getElementById("btn-import-json").addEventListener("click", () => {
  try {
    const loaded = JSON.parse(document.getElementById("json-textarea").value);
    if (loaded.polygons && loaded.entities && loaded.spawn) {
      state.activeLevel = loaded;
      loadLevel(state.activeLevel);
      document.getElementById("json-modal").style.display = "none";
      showNotification("LEVEL IMPORTIERT!");
    } else {
      alert("Fehlerhaftes Format!");
    }
  } catch (err) {
    alert("JSON Parse Fehler!");
  }
});

document.getElementById("btn-copy-json").addEventListener("click", () => {
  const el = document.getElementById("json-textarea");
  el.select();
  document.execCommand("copy");
  showNotification("KOPIERT!");
});

document.getElementById("btn-download-json").addEventListener("click", () => {
  try {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.activeLevel, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${state.activeLevel.name || 'custom_level'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification("DATEI GESPEICHERT!");
  } catch (err) {
    alert("Fehler beim Erstellen der Datei!");
  }
});

document.getElementById("btn-upload-json").addEventListener("click", () => {
  document.getElementById("file-import-input").click();
});

document.getElementById("file-import-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById("json-textarea").value = event.target.result;
    showNotification("DATEI GELADEN! KLICKE IMPORTIEREN");
  };
  reader.readAsText(file);
});

document.getElementById("btn-close-modal").addEventListener("click", () => {
  document.getElementById("json-modal").style.display = "none";
  document.getElementById("json-textarea").readOnly = true;
});

document.getElementById("btn-clear-level").addEventListener("click", () => {
  if (confirm("Ganzen Level leeren?")) {
    state.activeLevel.polygons = [];
    state.activeLevel.entities = [];
    state.activePolygon = [];
    loadLevel(state.activeLevel);
  }
});

// ==========================================
// 6.5 AI LEVEL GENERATOR (KI-GENERATOR)
// ==========================================

let aiSuggestions = [];
let aiIndex = 0;
let aiDifficulty = "medium";

const aiDiffPanel = document.getElementById("ai-difficulty-panel");
const aiPreviewPanel = document.getElementById("ai-preview-panel");

function drawAIPreview() {
  const sug = aiSuggestions[aiIndex];
  if (!sug) return;
  const lvl = sug.level;
  const meta = sug.meta;
  const theme = THEMES[lvl.theme] || THEMES.c64;

  const cv = document.getElementById("ai-preview-canvas");
  const c = cv.getContext("2d");
  c.clearRect(0, 0, cv.width, cv.height);
  c.fillStyle = "#020208";
  c.fillRect(0, 0, cv.width, cv.height);

  const worldH = meta.depth + 60;
  const pad = 14;
  const scale = Math.min((cv.width - pad * 2) / meta.worldW, (cv.height - pad * 2) / worldH);
  const ox = (cv.width - meta.worldW * scale) / 2;
  const oy = (cv.height - worldH * scale) / 2;
  const X = (x) => ox + x * scale;
  const Y = (y) => oy + y * scale;

  // Terrain silhouette — the actual maze / world shape
  for (const poly of lvl.polygons) {
    if (poly.length < 3) continue;
    c.beginPath();
    c.moveTo(X(poly[0][0]), Y(poly[0][1]));
    for (let i = 1; i < poly.length; i++) c.lineTo(X(poly[i][0]), Y(poly[i][1]));
    c.closePath();
    c.globalAlpha = 0.38;
    c.fillStyle = theme.terrain;
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = theme.edge || theme.terrain;
    c.lineWidth = 1;
    c.stroke();
  }

  // Exit altitude line
  c.setLineDash([4, 3]);
  c.strokeStyle = "rgba(0,255,255,0.5)";
  c.beginPath();
  c.moveTo(X(0), Y(lvl.exitY));
  c.lineTo(X(meta.worldW), Y(lvl.exitY));
  c.stroke();
  c.setLineDash([]);

  const dot = (x, y, color, r) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(X(x), Y(y), r, 0, Math.PI * 2);
    c.fill();
  };

  for (const ent of lvl.entities) {
    if (ent.type === "door") {
      c.strokeStyle = "#2288ff";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(X(ent.x), Y(ent.y));
      c.lineTo(X(ent.x + ent.w), Y(ent.y));
      c.stroke();
      c.lineWidth = 1;
    }
    else if (ent.type === "switch") dot(ent.x, ent.y, "#00ffff", 2.5);
    else if (ent.type === "turret") dot(ent.x, ent.y, "#ff4444", 3);
    else if (ent.type === "reactor") dot(ent.x, ent.y, "#ff22ff", 3.5);
    else if (ent.type === "pod") {
      dot(ent.x, ent.y, "#ffaa00", 3);
      c.strokeStyle = "#ffaa00";
      c.beginPath();
      c.arc(X(ent.x), Y(ent.y), 5.5, 0, Math.PI * 2);
      c.stroke();
    }
    else if (ent.type === "fuel") {
      c.fillStyle = "#ffff00";
      c.fillRect(X(ent.x) - 2.5, Y(ent.y) - 2.5, 5, 5);
    }
  }

  // Spawn marker (ship triangle)
  c.fillStyle = "#7CFC00";
  c.beginPath();
  c.moveTo(X(lvl.spawn.x), Y(lvl.spawn.y) - 5);
  c.lineTo(X(lvl.spawn.x) - 4, Y(lvl.spawn.y) + 4);
  c.lineTo(X(lvl.spawn.x) + 4, Y(lvl.spawn.y) + 4);
  c.closePath();
  c.fill();

  document.getElementById("ai-preview-title").innerText =
    `VORSCHLAG ${aiIndex + 1} / ${aiSuggestions.length}`;
  document.getElementById("ai-preview-info").innerHTML =
    `<b style="color: var(--primary); font-size: 13px;">${lvl.name}</b>` +
    ` &nbsp;·&nbsp; ${meta.archetype} &nbsp;·&nbsp; ${meta.difficultyLabel}<br>` +
    `TIEFE ${meta.depth}px · BREITE ${meta.worldW}px · GESCHÜTZE ${meta.turrets} · ` +
    `FUEL-PODS ${meta.fuels} · TÜREN ${meta.doors}<br>` +
    `GRAVITATION ${lvl.gravity} · SPRIT ${lvl.fuel} · THEME ${lvl.theme.toUpperCase()}`;
}

function startAIGeneration(diff) {
  aiDifficulty = diff;
  aiSuggestions = generateLevelSuggestions(diff, 20);
  aiIndex = 0;
  aiDiffPanel.style.display = "none";
  aiPreviewPanel.style.display = "block";
  drawAIPreview();
  showNotification(`20 KI-VORSCHLAEGE (${DIFFICULTY_PRESETS[diff].label})`);
  playSFX("select");
}

function stepAISuggestion(dir) {
  if (aiSuggestions.length === 0) return;
  aiIndex = (aiIndex + dir + aiSuggestions.length) % aiSuggestions.length;
  drawAIPreview();
  playSFX("select");
}

document.getElementById("btn-ai-generate").addEventListener("click", () => {
  aiPreviewPanel.style.display = "none";
  aiDiffPanel.style.display = "block";
  playSFX("select");
});

document.getElementById("btn-ai-diff-easy").addEventListener("click", () => startAIGeneration("easy"));
document.getElementById("btn-ai-diff-medium").addEventListener("click", () => startAIGeneration("medium"));
document.getElementById("btn-ai-diff-hard").addEventListener("click", () => startAIGeneration("hard"));

document.getElementById("btn-ai-diff-cancel").addEventListener("click", () => {
  aiDiffPanel.style.display = "none";
});

document.getElementById("btn-ai-prev").addEventListener("click", () => stepAISuggestion(-1));
document.getElementById("btn-ai-next").addEventListener("click", () => stepAISuggestion(1));

document.getElementById("btn-ai-reroll").addEventListener("click", () => {
  aiSuggestions = generateLevelSuggestions(aiDifficulty, 20);
  aiIndex = 0;
  drawAIPreview();
  showNotification("NEUE VORSCHLAEGE GENERIERT");
  playSFX("select");
});

document.getElementById("btn-ai-cancel").addEventListener("click", () => {
  aiPreviewPanel.style.display = "none";
});

document.getElementById("btn-ai-accept").addEventListener("click", () => {
  const chosen = aiSuggestions[aiIndex];
  if (!chosen) return;
  saveEditorUndoState();
  state.activePolygon = [];
  state.editorSelectedEntity = null;
  loadLevel(chosen.level);
  state.editorCam.x = chosen.level.spawn.x;
  state.editorCam.y = chosen.level.spawn.y;
  aiPreviewPanel.style.display = "none";
  showNotification("KI-LEVEL GELADEN: " + chosen.level.name);
  playSFX("fuelCollected");
});

// Keyboard stepping while the preview is open (capture phase so the
// editor camera pan in input.js never sees these keys)
window.addEventListener("keydown", (e) => {
  if (aiPreviewPanel.style.display === "block") {
    if (e.key === "ArrowLeft") stepAISuggestion(-1);
    else if (e.key === "ArrowRight") stepAISuggestion(1);
    else if (e.key === "Enter") document.getElementById("btn-ai-accept").click();
    else if (e.key === "Escape") aiPreviewPanel.style.display = "none";
    else return;
    e.preventDefault();
    e.stopImmediatePropagation();
  }
  else if (aiDiffPanel.style.display === "block" && e.key === "Escape") {
    aiDiffPanel.style.display = "none";
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, true);

function setBtnActive(id) {
  document.getElementById("btn-mode-poly").classList.remove("active");
  const selEnt = document.getElementById("entity-select");
  if (selEnt) selEnt.classList.remove("active");
  const btnDel = document.getElementById("btn-mode-delete");
  if (btnDel) btnDel.classList.remove("active");
  
  const activeEl = document.getElementById(id);
  if (activeEl) activeEl.classList.add("active");
}

// Fade out mobile instructions overlay
if ('ontouchstart' in window) {
  const tut = document.getElementById("touch-tutorial");
  tut.style.display = "block";
  setTimeout(() => {
    tut.style.transition = "opacity 0.8s";
    tut.style.opacity = 0;
    setTimeout(() => tut.style.display = "none", 1000);
  }, 4500);
}

// Load Campaign 0 level on initialization
loadLevel(CAMPAIGN[0]);
console.log("[DIAGNOSTIC] main.js execution reached the end!");
// Start requestAnimationFrame loop sequence
requestAnimationFrame(coreGameLoop);
