import { state, STATE_EDITOR, STATE_TITLE } from './constants.js';
import { loadLevel, buildCollisionGrid, bakeTerrain, showNotification } from './physics.js';
import { playSFX } from './audio.js';

export function saveEditorUndoState() {
  state.editorHistory.push(JSON.stringify(state.activeLevel));
  if (state.editorHistory.length > 15) state.editorHistory.shift();
  state.editorRedoHistory = []; // Clear redo stack on new action
}

export function triggerEditorUndo() {
  if (state.editorHistory.length > 0) {
    state.editorRedoHistory.push(JSON.stringify(state.activeLevel));
    const lastState = state.editorHistory.pop();
    state.activeLevel = JSON.parse(lastState);
    loadLevel(state.activeLevel);
    showNotification("UNDO ERFOLGREICH");
  } else {
    showNotification("KEINE UNDO SCHRITTE VERFUEGBAR");
  }
}

export function triggerEditorRedo() {
  if (state.editorRedoHistory.length > 0) {
    state.editorHistory.push(JSON.stringify(state.activeLevel));
    const nextState = state.editorRedoHistory.pop();
    state.activeLevel = JSON.parse(nextState);
    loadLevel(state.activeLevel);
    showNotification("REDO ERFOLGREICH");
  } else {
    showNotification("KEINE REDO SCHRITTE VERFUEGBAR");
  }
}

export function toggleEditor(active) {
  if (active) {
    state.gameState = STATE_EDITOR;
    document.getElementById("editor-toolbar").style.display = "flex";
    document.getElementById("editor-status-bar").style.display = "flex";
    showNotification("EDITOR MODUS");
    state.projectiles = [];
    state.particles = [];
    state.shockwaves = [];
    buildCollisionGrid();
    bakeTerrain();
    
    const chkGrid = document.getElementById("chk-grid-dots");
    if (chkGrid) chkGrid.checked = state.editorShowGridDots;
  } else {
    document.getElementById("editor-toolbar").style.display = "none";
    document.getElementById("editor-status-bar").style.display = "none";
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

export function isPointInPolygon(x, y, vs) {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function getDistanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.sqrt((px - x1)**2 + (py - y1)**2);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt((px - (x1 + t * dx))**2 + (py - (y1 + t * dy))**2);
}

export function checkEdgeClick(coords) {
  for (let p = 0; p < state.activeLevel.polygons.length; p++) {
    const poly = state.activeLevel.polygons[p];
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      const dist = getDistanceToSegment(coords.x, coords.y, p1[0], p1[1], p2[0], p2[1]);
      if (dist < 6) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const l2 = dx * dx + dy * dy;
        let t = 0.5;
        if (l2 > 0) {
          t = Math.max(0, Math.min(1, ((coords.x - p1[0]) * dx + (coords.y - p1[1]) * dy) / l2));
        }
        const insertX = p1[0] + t * dx;
        const insertY = p1[1] + t * dy;
        
        saveEditorUndoState();
        poly.splice(i + 1, 0, [
          state.snapToGrid ? Math.round(insertX / state.editorGridSize) * state.editorGridSize : insertX,
          state.snapToGrid ? Math.round(insertY / state.editorGridSize) * state.editorGridSize : insertY
        ]);
        buildCollisionGrid();
        bakeTerrain();
        showNotification("PUNKT HINZUGEFUEGT");
        return true;
      }
    }
  }
  return false;
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
        active: true,
        health: state.selectedEntityPreset === "reactor" ? 3 : 1
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
