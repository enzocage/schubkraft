import { state, STATE_TITLE, STATE_PLAYING, STATE_GAME_OVER, STATE_HIGHSCORE, STATE_EDITOR, TITLE_MENU_ITEMS, CAMPAIGN } from './constants.js?v=2';
import { initAudio, resumeAudioContext, playSFX } from './audio.js?v=2';
import { loadLevel, buildCollisionGrid, bakeTerrain, showNotification, getEditorWorldCoords, spawnSparks } from './physics.js?v=2';
import { toggleEditor, triggerEditorUndo, triggerEditorRedo, saveEditorUndoState, populateEntityProperties, handleEditorClick, isPointInPolygon, checkEdgeClick } from './editor.js?v=2';

export function fireLaserBullet() {
  const now = Date.now();
  if (now - state.lastFireTime < 110) return;
  state.lastFireTime = now;

  const bulletSpeed = 4.2;
  const bx = state.ship.x + Math.cos(state.ship.angle) * 7;
  const by = state.ship.y + Math.sin(state.ship.angle) * 7;

  state.projectiles.push({
    x: bx,
    y: by,
    vx: Math.cos(state.ship.angle) * bulletSpeed + state.ship.vx * 0.4,
    vy: Math.sin(state.ship.angle) * bulletSpeed + state.ship.vy * 0.4,
    enemy: false,
    life: 1.8
  });

  spawnSparks(bx, by, "#aaffff", 4); // muzzle flash sparks
  playSFX("pew");
  state.screenShake = Math.max(state.screenShake, 2.2);
}

export function bindInputEvents(canvas) {
  window.addEventListener("keydown", (e) => {
    resumeAudioContext();
    initAudio();
    window.audioContextActiveState = true;

    // Toggle Help Overlay via H key
    if ((e.key.toLowerCase() === "h" || e.key === "?") && e.target.tagName !== "INPUT" && e.target.tagName !== "TEXTAREA") {
      const help = document.getElementById("help-panel");
      if (help) {
        e.preventDefault();
        const shown = help.style.display === "block";
        help.style.display = shown ? "none" : "block";
        if (!shown && state.gameState === STATE_PLAYING) {
          state.paused = true;
        }
        playSFX("select");
      }
      return;
    }

    if (state.gameState === STATE_TITLE) {
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        state.titleMenuIndex = (state.titleMenuIndex - 1 + TITLE_MENU_ITEMS.length) % TITLE_MENU_ITEMS.length;
        playSFX("select");
      }
      else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        state.titleMenuIndex = (state.titleMenuIndex + 1) % TITLE_MENU_ITEMS.length;
        playSFX("select");
      }
      else if (e.key === " " || e.key === "Enter") {
        playSFX("fuelCollected");
        
        if (state.titleMenuIndex === 0) {
          state.lives = 3;
          state.score = 0;
          state.activeCampaignIdx = 0;
          loadLevel(CAMPAIGN[0]);
          state.gameState = STATE_PLAYING;
        } 
        else if (state.titleMenuIndex === 1) {
          document.getElementById("campaign-select-panel").style.display = "block";
        }
        else if (state.titleMenuIndex === 2) {
          toggleEditor(true);
        }
        else if (state.titleMenuIndex === 3) {
          state.gameState = STATE_HIGHSCORE;
        }
      }
    }
    else if (state.gameState === STATE_GAME_OVER) {
      if (e.key === " " || e.key === "Enter") {
        state.gameState = STATE_TITLE;
      }
    }
    else if (state.gameState === STATE_HIGHSCORE) {
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        let code = state.hsNewName.charCodeAt(state.hsNameIndex);
        code = code === 90 ? 65 : code + 1;
        state.hsNewName = state.hsNewName.substring(0, state.hsNameIndex) + String.fromCharCode(code) + state.hsNewName.substring(state.hsNameIndex + 1);
        playSFX("select");
      }
      else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        let code = state.hsNewName.charCodeAt(state.hsNameIndex);
        code = code === 65 ? 90 : code - 1;
        state.hsNewName = state.hsNewName.substring(0, state.hsNameIndex) + String.fromCharCode(code) + state.hsNewName.substring(state.hsNameIndex + 1);
        playSFX("select");
      }
      else if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
        state.hsNameIndex = Math.max(0, state.hsNameIndex - 1);
        playSFX("select");
      }
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
        state.hsNameIndex = Math.min(2, state.hsNameIndex + 1);
        playSFX("select");
      }
      else if (e.key === " " || e.key === "Enter") {
        if (state.hsNameIndex < 2) {
          state.hsNameIndex++;
          playSFX("select");
        } else {
          state.highscores.push({ name: state.hsNewName, score: state.score });
          state.highscores.sort((a,b) => b.score - a.score);
          state.highscores = state.highscores.slice(0, 5);
          localStorage.setItem("thrust_highscores", JSON.stringify(state.highscores));
          
          state.gameState = STATE_HIGHSCORE;
          state.titleMenuIndex = 3;
          playSFX("fuelCollected");
        }
      }
      else if (e.key === "Escape") {
        state.gameState = STATE_TITLE;
      }
    }
    else if (state.gameState === STATE_PLAYING) {
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") state.keys.rotateLeft = true;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") state.keys.rotateRight = true;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") state.keys.thrust = true;
      if (e.key === "Shift" || e.key.toLowerCase() === "s" || e.key.toLowerCase() === "o") {
        const wasShield = state.keys.shield;
        state.keys.shieldReal = true;
        state.keys.shield = true;
        if (!wasShield && state.ship.alive && state.ship.fuel > 0) playSFX("shieldActivate");
      }
      if (e.key === " " || e.key.toLowerCase() === "k") {
        state.keys.fire = true;
        fireLaserBullet();
      }
      if (e.key.toLowerCase() === "e") {
        toggleEditor(true);
      }
      if (e.key.toLowerCase() === "p") {
        state.paused = !state.paused;
      }
    }
    else if (state.gameState === STATE_EDITOR) {
      const pSpeed = 16;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") state.editorCam.x -= pSpeed;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") state.editorCam.x += pSpeed;
      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") state.editorCam.y -= pSpeed;
      if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") state.editorCam.y += pSpeed;
      
      if (e.key.toLowerCase() === "t") {
        state.editorLevelCopy = JSON.parse(JSON.stringify(state.activeLevel));
        state.gameState = STATE_PLAYING;
        state.lives = 1;
        loadLevel(state.editorLevelCopy);
        showNotification("PLAYTEST MODUS");
      }
      if (e.key.toLowerCase() === "z" && e.ctrlKey) {
        triggerEditorUndo();
      }
      if (e.key.toLowerCase() === "y" && e.ctrlKey) {
        triggerEditorRedo();
      }
      if (e.key.toLowerCase() === "g") {
        state.editorShowGridDots = !state.editorShowGridDots;
        const chk = document.getElementById("chk-grid-dots");
        if (chk) chk.checked = state.editorShowGridDots;
        showNotification(state.editorShowGridDots ? "VISUAL GRID AN" : "VISUAL GRID AUS");
      }
      if (e.key.toLowerCase() === "s") {
        state.snapToGrid = !state.snapToGrid;
        showNotification(state.snapToGrid ? "GRID SNAP AN" : "GRID SNAP AUS");
      }
      if (e.key === "Escape") {
        state.editorSelectedEntity = null;
        state.editorSelectedPoly = null;
        document.getElementById("entity-properties-panel").style.display = "none";
        showNotification("AUSWAHL AUFGEHOBEN");
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (state.editorSelectedEntity) {
          saveEditorUndoState();
          const idx = state.activeLevel.entities.indexOf(state.editorSelectedEntity);
          if (idx !== -1) {
            state.activeLevel.entities.splice(idx, 1);
            showNotification("OBJEKT ENTFERNT");
          }
          state.editorSelectedEntity = null;
          document.getElementById("entity-properties-panel").style.display = "none";
          loadLevel(state.activeLevel);
        } else if (state.editorSelectedPoly !== null) {
          saveEditorUndoState();
          state.activeLevel.polygons.splice(state.editorSelectedPoly, 1);
          showNotification("POLYGON ENTFERNT");
          state.editorSelectedPoly = null;
          buildCollisionGrid();
          bakeTerrain();
        }
      }
      if (e.key.toLowerCase() === "e" && !e.ctrlKey) {
        toggleEditor(false);
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") state.keys.rotateLeft = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") state.keys.rotateRight = false;
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
      state.keys.thrust = false;
      state.keys.wHoldTime = 0;
      if (!state.keys.shieldReal) state.keys.shield = false;
    }
    if (e.key === "Shift" || e.key.toLowerCase() === "s" || e.key.toLowerCase() === "o") {
      state.keys.shieldReal = false;
      if (state.keys.wHoldTime <= 0.25) state.keys.shield = false;
    }
    if (e.key === " " || e.key.toLowerCase() === "k") state.keys.fire = false;
  });

  canvas.addEventListener("pointerdown", (e) => {
    resumeAudioContext();
    initAudio();
    window.audioContextActiveState = true;
    
    if (state.gameState === STATE_TITLE) {
      const rect = canvas.getBoundingClientRect();
      const touchY = (e.clientY - rect.top) / rect.height * 200;
      if (touchY > 80 && touchY < 150) {
        const index = Math.floor((touchY - 80) / 14);
        if (index >= 0 && index < TITLE_MENU_ITEMS.length) {
          state.titleMenuIndex = index;
          playSFX("select");
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        }
      }
      return;
    }
    if (state.gameState === STATE_GAME_OVER) {
      state.gameState = STATE_TITLE;
      return;
    }
    if (state.gameState === STATE_HIGHSCORE) {
      state.gameState = STATE_TITLE;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const touchX = (e.clientX - rect.left) / rect.width * 320;
    const touchY = (e.clientY - rect.top) / rect.height * 200;

    if (state.gameState === STATE_PLAYING) {
      if (touchX < 160) {
        state.touchState.leftActive = true;
        state.touchState.leftStartX = touchX;
        state.touchState.leftCurrentX = touchX;
      } else {
        if (touchY > 100) {
          state.keys.thrust = true;
        } else {
          fireLaserBullet();
          if (e.isPrimary === false) {
            state.keys.shield = true;
          }
        }
      }
    } 
    else if (state.gameState === STATE_EDITOR) {
      if (e.button === 1 || e.shiftKey) {
        state.editorPanning = true;
        state.editorPanStartCam = { x: state.editorCam.x, y: state.editorCam.y };
        state.editorPanStartMouse = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      const coords = getEditorWorldCoords(e);
      state.editorLastMousePos = coords;
      
      // 1. Check if dragging the exit line
      const exitLineDist = Math.abs(coords.y - state.activeLevel.exitY);
      if (exitLineDist < 8) {
        state.editorDraggingExitLine = true;
        saveEditorUndoState();
        showNotification("FLUCHT-LINIE AUSGEWAEHLT");
        return;
      }

      if (state.editorMode === "delete") {
        saveEditorUndoState();
        let deleted = false;
        for (let i = state.activeLevel.entities.length - 1; i >= 0; i--) {
          const ent = state.activeLevel.entities[i];
          const dist = Math.sqrt((coords.x - ent.x)**2 + (coords.y - ent.y)**2);
          if (dist < 12) {
            state.activeLevel.entities.splice(i, 1);
            showNotification("OBJEKT ENTFERNT");
            deleted = true;
            break;
          }
        }
        if (!deleted) {
          for (let p = 0; p < state.activeLevel.polygons.length; p++) {
            const poly = state.activeLevel.polygons[p];
            for (let v = 0; v < poly.length; v++) {
              const pt = poly[v];
              const dist = Math.sqrt((coords.x - pt[0])**2 + (coords.y - pt[1])**2);
              if (dist < 8) {
                poly.splice(v, 1);
                showNotification("VERTEX ENTFERNT");
                if (poly.length < 3) {
                  state.activeLevel.polygons.splice(p, 1);
                  showNotification("POLYGON ENTFERNT");
                }
                deleted = true;
                break;
              }
            }
            if (deleted) break;
          }
        }
        if (deleted) {
          buildCollisionGrid();
          bakeTerrain();
          loadLevel(state.activeLevel);
        }
        return;
      }

      // 2. Check if clicked near an edge to insert a vertex
      if (checkEdgeClick(coords)) {
        return;
      }

      let found = false;
      // 3. Check if clicked on a vertex
      for (let p = 0; p < state.activeLevel.polygons.length; p++) {
        const poly = state.activeLevel.polygons[p];
        for (let v = 0; v < poly.length; v++) {
          const pt = poly[v];
          const dist = Math.sqrt((coords.x - pt[0])**2 + (coords.y - pt[1])**2);
          if (dist < 8) {
            state.editorDraggingVertex = { polyIdx: p, vertIdx: v };
            state.editorSelectedPoly = p;
            state.editorSelectedEntity = null;
            document.getElementById("entity-properties-panel").style.display = "none";
            found = true;
            break;
          }
        }
        if (found) break;
      }

      // 4. Check if clicked on an entity
      if (!found) {
        for (let i = 0; i < state.activeLevel.entities.length; i++) {
          const ent = state.activeLevel.entities[i];
          const dist = Math.sqrt((coords.x - ent.x)**2 + (coords.y - ent.y)**2);
          if (dist < 12) {
            state.editorDraggingEntity = ent;
            state.editorSelectedEntity = ent;
            populateEntityProperties(ent);
            state.editorSelectedPoly = null;
            found = true;
            break;
          }
        }
      }

      // 5. Check if clicked inside a polygon to select/drag it
      if (!found) {
        for (let p = 0; p < state.activeLevel.polygons.length; p++) {
          if (isPointInPolygon(coords.x, coords.y, state.activeLevel.polygons[p])) {
            state.editorSelectedPoly = p;
            state.editorSelectedEntity = null;
            document.getElementById("entity-properties-panel").style.display = "none";
            state.editorDraggingPoly = {
              polyIdx: p,
              startCoords: { x: coords.x, y: coords.y },
              originalVerts: state.activeLevel.polygons[p].map(pt => [pt[0], pt[1]])
            };
            found = true;
            showNotification("POLYGON AUSGEWAEHLT");
            saveEditorUndoState();
            break;
          }
        }
      }

      if (!found) {
        handleEditorClick(coords, e);
      }
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (state.gameState === STATE_PLAYING && state.touchState.leftActive) {
      const rect = canvas.getBoundingClientRect();
      const touchX = (e.clientX - rect.left) / rect.width * 320;
      state.touchState.leftCurrentX = touchX;
    }
    else if (state.gameState === STATE_EDITOR) {
      if (state.editorPanning) {
        const dx = e.clientX - state.editorPanStartMouse.x;
        const dy = e.clientY - state.editorPanStartMouse.y;
        const rect = canvas.getBoundingClientRect();
        const worldDx = (dx / rect.width) * 320 / state.editorScale;
        const worldDy = (dy / rect.height) * 200 / state.editorScale;
        state.editorCam.x = state.editorPanStartCam.x - worldDx;
        state.editorCam.y = state.editorPanStartCam.y - worldDy;
        return;
      }

      const coords = getEditorWorldCoords(e);
      state.editorLastMousePos = coords;

      // Update HUD coordinates overlay
      const coordsSpan = document.getElementById("status-coords");
      if (coordsSpan) {
        coordsSpan.innerText = `X: ${Math.round(coords.x)} Y: ${Math.round(coords.y)}`;
      }
      
      if (state.editorDraggingExitLine) {
        state.activeLevel.exitY = state.snapToGrid ? Math.round(coords.y / state.editorGridSize) * state.editorGridSize : coords.y;
        const exitRange = document.getElementById("exit-y-range");
        if (exitRange) exitRange.value = state.activeLevel.exitY;
        const exitVal = document.getElementById("exit-y-val");
        if (exitVal) exitVal.innerText = state.activeLevel.exitY;
      }
      else if (state.editorDraggingVertex) {
        const v = state.editorDraggingVertex;
        state.activeLevel.polygons[v.polyIdx][v.vertIdx] = [coords.x, coords.y];
        buildCollisionGrid();
        bakeTerrain();
      } 
      else if (state.editorDraggingEntity) {
        state.editorDraggingEntity.x = coords.x;
        state.editorDraggingEntity.y = coords.y;
        loadLevel(state.activeLevel);
      }
      else if (state.editorDraggingPoly) {
        const drag = state.editorDraggingPoly;
        const dx = coords.x - drag.startCoords.x;
        const dy = coords.y - drag.startCoords.y;
        const poly = state.activeLevel.polygons[drag.polyIdx];
        for (let v = 0; v < poly.length; v++) {
          let nx = drag.originalVerts[v][0] + dx;
          let ny = drag.originalVerts[v][1] + dy;
          if (state.snapToGrid) {
            nx = Math.round(nx / state.editorGridSize) * state.editorGridSize;
            ny = Math.round(ny / state.editorGridSize) * state.editorGridSize;
          }
          poly[v] = [nx, ny];
        }
        buildCollisionGrid();
        bakeTerrain();
      }

      // Live hover checking
      state.editorHoveredVertex = null;
      state.editorHoveredEntity = null;
      state.editorHoveredPoly = null;

      let hoverFound = false;
      for (let p = 0; p < state.activeLevel.polygons.length; p++) {
        const poly = state.activeLevel.polygons[p];
        for (let v = 0; v < poly.length; v++) {
          const pt = poly[v];
          const dist = Math.sqrt((coords.x - pt[0])**2 + (coords.y - pt[1])**2);
          if (dist < 8) {
            state.editorHoveredVertex = { polyIdx: p, vertIdx: v };
            hoverFound = true;
            break;
          }
        }
        if (hoverFound) break;
      }

      if (!hoverFound) {
        for (const ent of state.activeLevel.entities) {
          const dist = Math.sqrt((coords.x - ent.x)**2 + (coords.y - ent.y)**2);
          if (dist < 12) {
            state.editorHoveredEntity = ent;
            hoverFound = true;
            break;
          }
        }
      }

      if (!hoverFound) {
        for (let p = 0; p < state.activeLevel.polygons.length; p++) {
          if (isPointInPolygon(coords.x, coords.y, state.activeLevel.polygons[p])) {
            state.editorHoveredPoly = p;
            break;
          }
        }
      }
    }
  });

  canvas.addEventListener("pointerup", (e) => {
    state.touchState.leftActive = false;
    state.keys.thrust = false;
    state.keys.shield = false;
    
    if (state.editorPanning) {
      state.editorPanning = false;
      canvas.releasePointerCapture(e.pointerId);
    }
    state.editorDraggingVertex = null;
    state.editorDraggingEntity = null;
    state.editorDraggingPoly = null;
    state.editorDraggingExitLine = false;
  });

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}
