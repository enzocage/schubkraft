import { state, STATE_EDITOR, STATE_TITLE, STATE_PLAYING } from './constants.js';
import { loadLevel, buildCollisionGrid, bakeTerrain, showNotification } from './physics.js';
import { playSFX } from './audio.js';

export function saveEditorUndoState() {
  state.editorHistory.push(JSON.stringify(state.activeLevel));
  if (state.editorHistory.length > 5) state.editorHistory.shift();
}

export function triggerEditorUndo() {
  if (state.editorHistory.length > 0) {
    const lastState = state.editorHistory.pop();
    state.activeLevel = JSON.parse(lastState);
    loadLevel(state.activeLevel);
    showNotification("UNDO ERFOLGREICH");
  } else {
    showNotification("KEINE SCHRITTE ZUM RUECKGAENGIG MACHEN");
  }
}

export function toggleEditor(active) {
  if (active) {
    state.gameState = STATE_EDITOR;
    document.getElementById("editor-toolbar").style.display = "grid";
    showNotification("EDITOR MODUS");
    state.projectiles = [];
    state.particles = [];
    state.shockwaves = [];
    buildCollisionGrid();
    bakeTerrain();
  } else {
    document.getElementById("editor-toolbar").style.display = "none";
    document.getElementById("theme-settings-panel").style.display = "none";
    document.getElementById("entity-properties-panel").style.display = "none";
    state.gameState = STATE_TITLE;
  }
}

export function populateEntityProperties(ent) {
  document.getElementById("prop-type-title").innerText = "Typ: " + ent.type;
  
  document.getElementById("prop-angle-container").style.display = "none";
  document.getElementById("prop-trigger-container").style.display = "none";
  document.getElementById("prop-door-w-container").style.display = "none";
  document.getElementById("prop-door-h-container").style.display = "none";
  document.getElementById("prop-target-container").style.display = "none";

  if (ent.type === "turret") {
    document.getElementById("prop-angle-container").style.display = "flex";
    const deg = Math.round((ent.angle || 0) * 180 / Math.PI);
    document.getElementById("prop-angle-range").value = deg;
    document.getElementById("prop-angle-val").innerText = deg + "°";
  }
  else if (ent.type === "door") {
    document.getElementById("prop-trigger-container").style.display = "flex";
    document.getElementById("prop-door-w-container").style.display = "flex";
    document.getElementById("prop-door-h-container").style.display = "flex";
    document.getElementById("prop-trigger-input").value = ent.trigger || "switch1";
    document.getElementById("prop-door-w").value = ent.w || 8;
    document.getElementById("prop-door-h").value = ent.h || 60;
  }
  else if (ent.type === "switch") {
    document.getElementById("prop-target-container").style.display = "flex";
    document.getElementById("prop-target-input").value = ent.target || "switch1";
  }

  document.getElementById("entity-properties-panel").style.display = "block";
}

export function handleEditorClick(coords, e) {
  saveEditorUndoState();

  if (state.editorMode === "poly") {
    if (state.activePolygon.length > 2) {
      const startPt = state.activePolygon[0];
      const dist = Math.sqrt((coords.x - startPt[0])**2 + (coords.y - startPt[1])**2);
      if (dist < 10) {
        state.activeLevel.polygons.push(state.activePolygon);
        state.activePolygon = [];
        buildCollisionGrid();
        bakeTerrain();
        showNotification("POLYGON GESCHLOSSEN");
        return;
      }
    }
    state.activePolygon.push([coords.x, coords.y]);
    playSFX("fuelCollected");
  } 
  else if (state.editorMode === "entity") {
    if (state.selectedEntityPreset === "spawn") {
      state.activeLevel.spawn.x = coords.x;
      state.activeLevel.spawn.y = coords.y;
      showNotification("SPAWN GESETZT");
    } 
    else if (state.selectedEntityPreset === "pod") {
      const existing = state.activeLevel.entities.find(ent => ent.type === "pod");
      if (existing) {
        existing.x = coords.x;
        existing.y = coords.y;
      } else {
        state.activeLevel.entities.push({ type: "pod", x: coords.x, y: coords.y });
      }
      showNotification("PENDEL PLATZIERT");
    }
    else {
      const newEnt = {
        type: state.selectedEntityPreset,
        x: coords.x,
        y: coords.y,
        active: true
      };
      if (newEnt.type === "door") {
        newEnt.w = 8;
        newEnt.h = 60;
        newEnt.trigger = "switch1";
      }
      if (newEnt.type === "switch") {
        newEnt.target = "switch1";
      }
      state.activeLevel.entities.push(newEnt);
      showNotification("OBJEKT GESETZT");
    }
    loadLevel(state.activeLevel);
  }
}
