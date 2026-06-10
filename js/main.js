import {
  state,
  STATE_TITLE,
  STATE_PLAYING,
  STATE_LEVEL_COMPLETE,
  STATE_GAME_OVER,
  STATE_EDITOR,
  STATE_HIGHSCORE,
  TITLE_MENU_ITEMS,
  CAMPAIGN
} from './constants.js';

import {
  initAudio,
  resumeAudioContext,
  updatePersistentSounds,
  updateDroneSound,
  updateTractorSound,
  updateSequencer,
  playSFX
} from './audio.js';

import {
  loadLevel,
  updatePhysics,
  buildCollisionGrid,
  bakeTerrain,
  showNotification
} from './physics.js';

import {
  bindInputEvents
} from './input.js';

import {
  renderGame
} from './renderer.js';

import {
  toggleEditor,
  triggerEditorUndo,
  saveEditorUndoState,
  populateEntityProperties,
  handleEditorClick
} from './editor.js';

// Get DOM elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ==========================================
// 1. INITIALIZATION
// ==========================================

// Initialize stars background layers
for (let i = 0; i < 48; i++) {
  state.stars.push({
    x: Math.random() * 320,
    y: Math.random() * 200,
    speed: Math.random() * 0.12 + 0.03,
    size: Math.random() * 0.6 + 0.2
  });
}

// Load highscores from localstorage
const localHS = localStorage.getItem("thrust_highscores");
if (localHS) {
  try {
    state.highscores = JSON.parse(localHS);
  } catch (err) {}
}

// Bind canvas inputs and window key listeners
bindInputEvents(canvas);

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

  // Parallax moon rotation drift
  state.rotateMoon += dt * 0.04;

  // Update particle physics
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
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

  // Spawning continuous orange thruster rocket sparks
  if (state.keys.thrust && state.ship.fuel > 0 && state.ship.alive && state.gameState === STATE_PLAYING) {
    if (Math.random() < 0.6) {
      const nozzleX = state.ship.x - Math.cos(state.ship.angle) * 4;
      const nozzleY = state.ship.y - Math.sin(state.ship.angle) * 4;
      const angleSpread = state.ship.angle + Math.PI + (Math.random() - 0.5) * 0.5;
      const spd = Math.random() * 1.6 + 0.6;
      state.particles.push({
        x: nozzleX,
        y: nozzleY,
        vx: Math.cos(angleSpread) * spd + state.ship.vx * 0.2,
        vy: Math.sin(angleSpread) * spd + state.ship.vy * 0.2,
        color: "#ff6600",
        life: Math.random() * 0.35 + 0.12,
        size: 1.0
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

  if (state.gameState === STATE_PLAYING) {
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
        loadLevel(state.activeLevel);
      } else {
        if (state.score > state.highscores[4].score) {
          state.gameState = STATE_HIGHSCORE;
          state.hsNewName = "AAA";
          state.hsNameIndex = 0;
          showNotification("BESTENLISTE ERREICHT! NAME EINGEBEN");
        } else {
          state.gameState = STATE_GAME_OVER;
        }
        updateTractorSound(false, false, false);
      }
    }
  }

  renderGame(canvas, ctx);
  requestAnimationFrame(coreGameLoop);
}

// ==========================================
// 5. EXTERNAL CONTROLS & TOGGLERS BINDINGS
// ==========================================

// CRT Scanlines toggler
document.getElementById("chk-crt").addEventListener("change", (e) => {
  const overlay = document.getElementById("crt-overlay");
  const vignette = document.getElementById("crt-vignette");
  const cab = document.getElementById("cabinet-bezel");
  if (e.target.checked) {
    overlay.classList.remove("disabled");
    vignette.style.boxShadow = "inset 0 0 100px rgba(0,0,0,0.95)";
    cab.style.borderRadius = "20px";
  } else {
    overlay.classList.add("disabled");
    vignette.style.boxShadow = "none";
    cab.style.borderRadius = "0";
  }
});

// Vector Bloom / Glow toggler
document.getElementById("chk-bloom").addEventListener("change", (e) => {
  state.useBloom = e.target.checked;
});

// Music / sound toggle checkboxes
document.getElementById("chk-music").addEventListener("change", (e) => {
  state.musicEnabled = e.target.checked;
});

document.getElementById("chk-sfx").addEventListener("change", (e) => {
  state.sfxEnabled = e.target.checked;
});

// ==========================================
// 6. EDITOR TOOLBAR ACTION BINDINGS
// ==========================================

document.getElementById("btn-mode-poly").addEventListener("click", () => {
  state.editorMode = "poly";
  setBtnActive("btn-mode-poly");
});

const entSelect = document.getElementById("entity-select");
const selectTriggerHandler = () => {
  state.editorMode = "entity";
  state.selectedEntityPreset = entSelect.value;
  setBtnActive("entity-select");
};
entSelect.addEventListener("change", selectTriggerHandler);
entSelect.addEventListener("focus", selectTriggerHandler);
entSelect.addEventListener("click", selectTriggerHandler);

document.getElementById("btn-mode-delete").addEventListener("click", () => {
  state.editorMode = "delete";
  setBtnActive("btn-mode-delete");
  showNotification("LOESCHEN-MODUS AKTIVIERT");
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
});

document.getElementById("btn-zoom-out").addEventListener("click", () => {
  state.editorScale = Math.max(0.5, state.editorScale - 0.25);
  showNotification(`ZOOM: ${Math.round(state.editorScale * 100)}%`);
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

document.getElementById("btn-open-settings").addEventListener("click", () => {
  document.getElementById("level-name-input").value = state.activeLevel.name || "";
  document.getElementById("theme-select").value = state.activeLevel.theme || "c64";
  document.getElementById("gravity-range").value = state.activeLevel.gravity || 0.022;
  document.getElementById("gravity-val").innerText = state.activeLevel.gravity || 0.022;
  document.getElementById("fuel-range").value = state.activeLevel.fuel || 2000;
  document.getElementById("fuel-val").innerText = state.activeLevel.fuel || 2000;
  document.getElementById("theme-settings-panel").style.display = "block";
});

document.getElementById("btn-save-settings").addEventListener("click", () => {
  state.activeLevel.name = document.getElementById("level-name-input").value;
  state.activeLevel.theme = document.getElementById("theme-select").value;
  state.activeLevel.gravity = parseFloat(document.getElementById("gravity-range").value);
  state.activeLevel.fuel = parseInt(document.getElementById("fuel-range").value);
  
  const gridVal = parseInt(document.getElementById("grid-snap-select").value);
  if (gridVal === 0) {
    state.snapToGrid = false;
  } else {
    state.snapToGrid = true;
    state.editorGridSize = gridVal;
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

document.getElementById("btn-test-level").addEventListener("click", () => {
  state.editorLevelCopy = JSON.parse(JSON.stringify(state.activeLevel));
  state.gameState = STATE_PLAYING;
  state.lives = 1;
  loadLevel(state.editorLevelCopy);
  showNotification("PLAYTEST MODUS");
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
// Start requestAnimationFrame loop sequence
requestAnimationFrame(coreGameLoop);
