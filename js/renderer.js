import { state, STATE_TITLE, STATE_PLAYING, STATE_LEVEL_COMPLETE, STATE_GAME_OVER, STATE_EDITOR, STATE_HIGHSCORE, THEMES, TITLE_MENU_ITEMS } from './constants.js';
import { drawVectorChar, drawVectorText } from './vectorFont.js';

// Organic animation — Baba Is You style variant cycling every 200ms
let animTick = 0;
export function tickAnimation() { animTick++; }
function variant() { return Math.floor(animTick / 12) % 5; }
function vJitter(amount) { return (variant() - 2) * amount; }

export function drawWireframePlanet(ctx, cx, cy, radius, rotation, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(Math.sin(rotation + i * Math.PI / 4), 1);
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI/2, Math.PI/2);
    ctx.stroke();
    ctx.restore();
  }
  
  for (let lat = -2; lat <= 2; lat++) {
    const yOffset = (lat / 3.2) * radius;
    const latRad = Math.sqrt(radius * radius - yOffset * yOffset);
    ctx.beginPath();
    ctx.moveTo(cx - latRad, cy + yOffset);
    ctx.lineTo(cx + latRad, cy + yOffset);
    ctx.stroke();
  }
}

export function renderGame(canvas, ctx) {
  tickAnimation();
  const dpr = window.devicePixelRatio || 1;
  const scaleX = canvas.width / 320;
  const scaleY = canvas.height / 200;

  ctx.save();
  ctx.scale(scaleX, scaleY);
  
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 320, 200);

  // Camera Offset
  let camX = state.ship.x;
  let camY = state.ship.y;
  
  if (state.gameState === STATE_TITLE || state.gameState === STATE_HIGHSCORE) {
    camX = 320 + Math.sin(Date.now() * 0.0003) * 120;
    camY = 400 + Math.cos(Date.now() * 0.0002) * 80;
  }
  else if (state.gameState === STATE_PLAYING || state.gameState === STATE_LEVEL_COMPLETE) {
    if (state.pod.attached && state.pod.alive) {
      camX = state.ship.x * 0.55 + state.pod.x * 0.45;
      camY = state.ship.y * 0.55 + state.pod.y * 0.45;
    }
    
    if (state.screenShake > 0) {
      const shakeFactor = state.reactorTimer > 0 && state.reactorTimer < 3.0 ? state.screenShake * 2.0 : state.screenShake;
      camX += (Math.random() - 0.5) * shakeFactor * 0.7;
      camY += (Math.random() - 0.5) * shakeFactor * 0.7;
    }
  } 
  else if (state.gameState === STATE_EDITOR) {
    camX = state.editorCam.x;
    camY = state.editorCam.y;
  }

  const viewL = camX - 160;
  const viewT = camY - 100;

  // 1. Draw Starfield with Parallax wrapping (Three speed layers)
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  for (let i = 0; i < state.stars.length; i++) {
    const star = state.stars[i];
    
    // speed layers: i % 3 === 0 (slow), 1 (medium), 2 (fast)
    let speed = star.speed;
    let color = "rgba(255, 255, 255, 0.45)";
    if (i % 3 === 0) {
      speed = star.speed * 0.25;
      color = "rgba(100, 100, 120, 0.3)";
    } else if (i % 3 === 1) {
      speed = star.speed * 0.6;
      color = "rgba(124, 252, 0, 0.35)"; // green tint
    }
    
    ctx.strokeStyle = color;
    const sx = ((star.x - camX * speed) % 320 + 320) % 320;
    const sy = ((star.y - camY * speed) % 200 + 200) % 200;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 0.6, sy);
    ctx.stroke();
  }

  // 2. Draw rotating wireframe moon background
  drawWireframePlanet(ctx, 160 - (camX * 0.05) % 320, 100 - (camY * 0.05) % 200, 48, state.rotateMoon, "rgba(124, 252, 0, 0.09)");

  // Translate context to camera space
  ctx.save();
  if (state.gameState === STATE_EDITOR) {
    ctx.translate(160, 100);
    ctx.scale(state.editorScale, state.editorScale);
    ctx.translate(-160, -100);
  }
  ctx.translate(160 - camX, 100 - camY);

  // 3. Draw Baked Cavern Terrains
  if (state.bakedTerrainCanvas) {
    ctx.drawImage(state.bakedTerrainCanvas, 0, 0);
  }

  // Draw exit line
  ctx.strokeStyle = "rgba(255, 255, 0, 0.25)";
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  ctx.beginPath();
  ctx.moveTo(0, state.activeLevel.exitY);
  ctx.lineTo(1200, state.activeLevel.exitY);
  ctx.stroke();

  const themePreset = THEMES[state.activeLevel.theme] || THEMES.c64;
  const objColor = themePreset.objects;

  // Vector Bloom / Glow Effect
  if (state.useBloom) {
    ctx.shadowBlur = 6 * dpr;
    ctx.shadowColor = objColor;
  } else {
    ctx.shadowBlur = 0;
  }

  // 4. Draw Entities (Turrets, Fuel, Reactor, Doors)
  ctx.lineWidth = (1.5 * dpr) / Math.min(scaleX, scaleY);
  for (const ent of state.entities) {
    if (!ent.active) continue;

    if (ent.x < viewL - 30 || ent.x > viewL + 350 || ent.y < viewT - 30 || ent.y > viewT + 230) {
      continue;
    }

    ctx.strokeStyle = objColor;

    if (ent.type === "turret") {
      ctx.beginPath();
      ctx.arc(ent.x + vJitter(0.8), ent.y + vJitter(0.8), 7 + vJitter(1), Math.PI, 0);
      ctx.stroke();
      
      const angle = ent.angle !== undefined ? ent.angle : (ent.dir === -1 ? Math.PI : 0);
      ctx.beginPath();
      ctx.moveTo(ent.x + vJitter(0.6), ent.y - 2 + vJitter(0.6));
      ctx.lineTo(ent.x + Math.cos(angle) * (11 + vJitter(1.5)), ent.y - 2 + Math.sin(angle) * (11 + vJitter(1.5)));
      ctx.stroke();

      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.22)";
      ctx.setLineDash([2, 4]);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(ent.x, ent.y - 2);
      ctx.lineTo(ent.x + Math.cos(angle) * 120, ent.y - 2 + Math.sin(angle) * 120);
      ctx.stroke();
      ctx.restore();
    } 
    else if (ent.type === "fuel") {
      ctx.strokeRect(ent.x - 9 + vJitter(1), ent.y - 8 + vJitter(1), 18 + vJitter(2), 16 + vJitter(2));
      ctx.save();
      ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
      drawVectorText(ctx, "FUEL", ent.x - 8, ent.y - 3, 0.22, objColor);
      ctx.restore();
    } 
    else if (ent.type === "reactor") {
      // Reactor pulse glow gradient background
      ctx.save();
      ctx.shadowBlur = 0;
      const grad = ctx.createRadialGradient(ent.x, ent.y, 2, ent.x, ent.y, 16 + Math.sin(Date.now() * 0.012) * 5);
      grad.addColorStop(0, "rgba(124, 252, 0, 0.22)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ent.x, ent.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeRect(ent.x - 12 + vJitter(1.2), ent.y - 12 + vJitter(1.2), 24 + vJitter(2), 24 + vJitter(2));
      const pulse = 4 + Math.sin(Date.now() * 0.015) * 2;
      ctx.strokeRect(ent.x - pulse, ent.y - pulse, pulse * 2, pulse * 2);
    }
    else if (ent.type === "door") {
      ctx.strokeStyle = "#ff2222";
      if (state.useBloom) ctx.shadowColor = "#ff2222";
      ctx.strokeRect(ent.x + vJitter(0.8), ent.y + vJitter(0.8), (ent.w || 8) + vJitter(1), (ent.h || 80) + vJitter(1.5));
      ctx.save();
      ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
      for (let dy = ent.y + 10; dy < ent.y + (ent.h || 80); dy += 15) {
        ctx.beginPath();
        ctx.moveTo(ent.x, dy);
        ctx.lineTo(ent.x + (ent.w || 8), dy - 4);
        ctx.stroke();
      }
      ctx.restore();
    }
    else if (ent.type === "switch") {
      ctx.strokeStyle = "#00ffff";
      if (state.useBloom) ctx.shadowColor = "#00ffff";
      ctx.strokeRect(ent.x - 5 + vJitter(0.7), ent.y - 5 + vJitter(0.7), 10 + vJitter(1.5), 10 + vJitter(1.5));
      ctx.beginPath();
      ctx.moveTo(ent.x, ent.y);
      ctx.lineTo(ent.x + 4, ent.y - 6);
      ctx.stroke();
    }
  }

  // 5. Draw Pod
  if (state.pod.alive) {
    ctx.strokeStyle = objColor;
    if (state.useBloom) ctx.shadowColor = objColor;
    ctx.beginPath();
    ctx.arc(state.pod.x + vJitter(1), state.pod.y + vJitter(1), 5 + vJitter(0.8), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(state.pod.x + vJitter(1), state.pod.y + vJitter(1), 2 + vJitter(0.5), 0, Math.PI * 2);
    ctx.stroke();
  }

  // 6. Draw Spaceship
  if (state.ship.alive) {
    ctx.save();
    ctx.translate(state.ship.x + vJitter(1.5), state.ship.y + vJitter(1.5));
    ctx.rotate(state.ship.visualAngle);
    
    ctx.strokeStyle = objColor;
    if (state.useBloom) ctx.shadowColor = objColor;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.stroke();

    // Thrust Flame & Glow
    if (state.keys.thrust && state.ship.fuel > 0) {
      ctx.save();
      ctx.shadowBlur = 0;
      const grad = ctx.createRadialGradient(-6, 0, 1, -6, 0, 11 + Math.random() * 8);
      grad.addColorStop(0, "rgba(255, 102, 0, 0.4)");
      grad.addColorStop(1, "rgba(255, 102, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(-6, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "#ff8800";
      if (state.useBloom) ctx.shadowColor = "#ff8800";
      const flameLength = 5 + Math.random() * 8;
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(-3 - flameLength, -2 + Math.random()*4);
      ctx.lineTo(-3, 0);
      ctx.stroke();
    }
    ctx.restore();

    // Shield bubble concentric glows & boundary sparks
    if (state.ship.shieldActive && state.ship.fuel > 0) {
      ctx.save();
      ctx.shadowBlur = 0;
      const grad = ctx.createRadialGradient(state.ship.x, state.ship.y, 6, state.ship.x, state.ship.y, 11);
      grad.addColorStop(0, "rgba(124, 252, 0, 0)");
      grad.addColorStop(0.8, "rgba(124, 252, 0, 0.15)");
      grad.addColorStop(1, "rgba(124, 252, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(state.ship.x, state.ship.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = "rgba(124, 252, 0, 0.85)";
      if (state.useBloom) ctx.shadowColor = "#7CFC00";
      ctx.beginPath();
      ctx.arc(state.ship.x, state.ship.y, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
      ctx.lineWidth = 0.5;
      const rot = Date.now() * 0.005;
      ctx.beginPath();
      ctx.arc(state.ship.x, state.ship.y, 9, rot, rot + 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(state.ship.x, state.ship.y, 9, rot + Math.PI, rot + Math.PI + 0.5);
      ctx.stroke();
      ctx.restore();
    } 
    else if (state.ship.tractorBeamActive && state.ship.tractorTarget) {
      const target = state.ship.tractorTarget;
      ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
      if (state.useBloom) ctx.shadowColor = "#00ffff";
      ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
      
      ctx.beginPath();
      ctx.moveTo(state.ship.x, state.ship.y);
      ctx.lineTo(target.x - 4, target.y);
      ctx.moveTo(state.ship.x, state.ship.y);
      ctx.lineTo(target.x + 4, target.y);
      ctx.stroke();
    }
  }

  // 7. Draw rigid tether cord line
  if (state.pod.attached && state.ship.alive && state.pod.alive) {
    ctx.strokeStyle = "#ffffff";
    if (state.useBloom) ctx.shadowColor = "#ffffff";
    ctx.lineWidth = (1.1 * dpr) / Math.min(scaleX, scaleY);
    ctx.beginPath();
    const notchX = state.ship.x - Math.cos(state.ship.angle) * 2;
    const notchY = state.ship.y - Math.sin(state.ship.angle) * 2;
    ctx.moveTo(notchX, notchY);
    ctx.lineTo(state.pod.x, state.pod.y);
    ctx.stroke();
  }

  // 8. Projectiles lines
  ctx.strokeStyle = "#ffffff";
  if (state.useBloom) ctx.shadowColor = "#ffffff";
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  for (const p of state.projectiles) {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.9, p.y - p.vy * 0.9);
    ctx.stroke();
  }

  ctx.shadowBlur = 0; // Disable shadow glow

  // 9. Explosion & Rocket sparks
  for (const p of state.particles) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size * dpr / Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.55, p.y - p.vy * 0.55);
    ctx.stroke();
  }

  // 10. Expanding Shockwaves rendering
  ctx.save();
  ctx.lineWidth = 1;
  for (const sw of state.shockwaves) {
    const alpha = sw.life / sw.maxLife;
    ctx.strokeStyle = sw.color;
    if (state.useBloom) ctx.shadowColor = sw.color;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 11. Editor Helpers
  if (state.gameState === STATE_EDITOR) {
    renderEditorHelpers(ctx, dpr, scaleX, scaleY);
  }

  ctx.restore(); // Exit camera coordinates translate

  // ==========================================
  // HUD & SCREEN OVERLAYS (Screen Space)
  // ==========================================
  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${state.flashTimer * 1.6})`;
    ctx.fillRect(0, 0, 320, 200);
  }

  if (state.gameState === STATE_PLAYING || state.gameState === STATE_LEVEL_COMPLETE || state.gameState === STATE_GAME_OVER) {
    renderHUD(ctx, dpr, scaleX, scaleY);
  }

  // Flashing border red screen indicator during meltdown countdown
  if (state.reactorTimer > 0) {
    const pulse = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255, 0, 0, ${pulse * 0.28})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 312, 192);
  }

  if (state.gameState === STATE_TITLE) {
    renderTitleScreen(ctx);
  } 
  else if (state.gameState === STATE_GAME_OVER) {
    renderGameOverScreen(ctx);
  }
  else if (state.gameState === STATE_LEVEL_COMPLETE) {
    renderLevelCompleteScreen(ctx);
  }
  else if (state.gameState === STATE_HIGHSCORE) {
    renderHighScoreScreen(ctx);
  }

  if (state.textPromptTimer > 0) {
    ctx.save();
    ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
    const textLen = state.textPromptMessage.length;
    const startX = 160 - (textLen * 3);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(startX - 6, 128, textLen * 6 + 12, 14);
    drawVectorText(ctx, state.textPromptMessage, startX, 131, 0.35, "#ffffff");
    ctx.restore();
  }

  // CRT static noise overlay
  ctx.save();
  const crtAlpha = 0.03 + Math.random() * 0.02;
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = "rgba(255,255,255," + (crtAlpha * Math.random()).toFixed(3) + ")";
    ctx.fillRect(Math.random() * 320, Math.random() * 200, 1 + Math.random() * 3, 1);
  }
  ctx.restore();

  ctx.restore();
}

export function renderHUD(ctx, dpr, scaleX, scaleY) {
  const hudColor = THEMES[state.activeLevel.theme]?.hud || "#7CFC00";
  
  ctx.strokeStyle = hudColor;
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  ctx.beginPath();
  ctx.moveTo(4, 3); ctx.lineTo(316, 3);
  ctx.moveTo(4, 5); ctx.lineTo(316, 5);
  ctx.moveTo(4, 18); ctx.lineTo(316, 18);
  ctx.stroke();

  const displayFuel = Math.ceil(state.ship.fuel);
  const fuelColor = displayFuel < 250 ? "#ff2222" : hudColor;

  drawVectorText(ctx, `FUEL: ${displayFuel.toString().padStart(4, '0')}`, 10, 8, 0.28, fuelColor);
  drawVectorText(ctx, `LIVES: ${state.lives}`, 125, 8, 0.28, hudColor);
  drawVectorText(ctx, `SCORE: ${state.score.toString().padStart(6, '0')}`, 205, 8, 0.28, hudColor);

  // Mini Radar
  const rx = 145;
  const ry = 23;
  ctx.strokeStyle = "rgba(124, 252, 0, 0.3)";
  ctx.strokeRect(rx, ry, 34, 10);
  
  const sx = rx + 2 + Math.min(30, (state.ship.x / 1200) * 30);
  const blink = Math.floor(Date.now() / 250) % 2 === 0;
  if (blink && state.ship.alive) {
    ctx.fillStyle = "#7CFC00";
    ctx.fillRect(sx - 0.6, ry + 4, 1.2, 2);
  }

  if (!state.pod.attached && state.pod.alive) {
    const px = rx + 2 + Math.min(30, (state.pod.x / 1200) * 30);
    ctx.fillStyle = "#ffaa00";
    ctx.fillRect(px - 0.6, ry + 4, 1.2, 2);
  }

  if (state.reactorTimer > 0) {
    const remaining = state.reactorTimer.toFixed(2);
    const warnColor = Math.floor(state.reactorTimer * 4) % 2 === 0 ? "#ff2222" : "#ffffff";
    drawVectorText(ctx, `OVERLOAD: ${remaining}S`, 90, 36, 0.35, warnColor);
  }
}

export function renderTitleScreen(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, 320, 200);

  drawVectorText(ctx, "THRUST", 75, 34, 1.4, "#7CFC00");
  drawVectorText(ctx, "HTML5 SPECIAL EDITION", 68, 64, 0.32, "#ffffff");

  for (let i = 0; i < TITLE_MENU_ITEMS.length; i++) {
    const item = TITLE_MENU_ITEMS[i];
    const isSelected = i === state.titleMenuIndex;
    const color = isSelected ? "#7CFC00" : "#777777";
    const prefix = isSelected ? "▶ " : "  ";
    drawVectorText(ctx, prefix + item, 84, 88 + i * 14, 0.32, color);
  }

  // active audio check overlay warning prompt
  const audioContextState = window.audioContextActiveState || false;
  if (!audioContextState) {
    const blink = Math.floor(Date.now() / 350) % 2 === 0;
    const msg = blink ? "KLICKEN ZUM AKTIVIEREN" : "";
    drawVectorText(ctx, msg, 70, 154, 0.38, "#ff9900");
  }

  drawVectorText(ctx, "PFEILTASTEN: NAVIGIEREN / SPACE: WAHL", 46, 178, 0.25, "#555");
  drawVectorText(ctx, "(C) 1986 FIREBIRD CLONE", 84, 188, 0.25, "#333");
}

export function renderGameOverScreen(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, 320, 200);

  drawVectorText(ctx, "GAME OVER", 95, 80, 0.95, "#ff3333");
  drawVectorText(ctx, `FINAL SCORE: ${state.score}`, 95, 110, 0.35, "#ffffff");
  
  const blink = Math.floor(Date.now() / 450) % 2 === 0;
  if (blink) {
    drawVectorText(ctx, "SPACE FUER HIGHSCORE REGISTRY", 58, 140, 0.32, "#7CFC00");
  }
}

export function renderHighScoreScreen(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, 320, 200);

  drawVectorText(ctx, "★ BESTENLISTE ★", 80, 24, 0.45, "#ffff00");

  for (let i = 0; i < 5; i++) {
    const hs = state.highscores[i] || { name: "---", score: 0 };
    drawVectorText(ctx, `${i+1}.`, 75, 54 + i * 18, 0.35, "#ffffff");
    drawVectorText(ctx, hs.name, 110, 54 + i * 18, 0.35, "#7CFC00");
    drawVectorText(ctx, hs.score.toString().padStart(6, '0'), 175, 54 + i * 18, 0.35, "#ffffff");
  }

  drawVectorText(ctx, "DRUECKE ESC FUER MENUE", 88, 168, 0.30, "#888");
}

export function renderLevelCompleteScreen(ctx) {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, 320, 200);

  drawVectorText(ctx, "PLANET FLUCHT ERFOLGREICH!", 50, 50, 0.42, "#7CFC00");
  
  const bonusFuel = Math.ceil(state.ship.fuel);
  const tetherBonus = state.pod.attached ? 2000 : 0;
  
  drawVectorText(ctx, `FUEL BONUS: +${bonusFuel}`, 90, 85, 0.32, "#ffffff");
  drawVectorText(ctx, `TETHER BONUS: +${tetherBonus}`, 90, 100, 0.32, "#ffffff");
  drawVectorText(ctx, `SCORE: ${state.score}`, 90, 125, 0.35, "#ffff00");

  drawVectorText(ctx, "LADE NAECHSTE MINE...", 85, 160, 0.32, "#888");
}

export function renderEditorHelpers(ctx, dpr, scaleX, scaleY) {
  ctx.strokeStyle = "rgba(124, 252, 0, 0.08)";
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  
  const gridSpacing = 16;
  const startX = Math.floor((state.editorCam.x - 160) / gridSpacing) * gridSpacing;
  const endX = startX + 320 + gridSpacing;
  const startY = Math.floor((state.editorCam.y - 100) / gridSpacing) * gridSpacing;
  const endY = startY + 200 + gridSpacing;

  for (let x = startX; x < endX; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }

  // Spawn indicator
  ctx.strokeStyle = "#ff9900";
  ctx.beginPath();
  ctx.arc(state.activeLevel.spawn.x, state.activeLevel.spawn.y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  drawVectorText(ctx, "SPAWN", state.activeLevel.spawn.x - 14, state.activeLevel.spawn.y - 12, 0.22, "#ff9900");
  ctx.restore();

  // switch visual link lines
  ctx.save();
  ctx.strokeStyle = "rgba(0, 255, 255, 0.45)";
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 0.8;
  for (const sw of state.activeLevel.entities.filter(e => e.type === "switch")) {
    const door = state.activeLevel.entities.find(d => d.type === "door" && d.trigger === sw.target);
    if (door) {
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y);
      ctx.lineTo(door.x + 4, door.y + 10);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Vertices
  ctx.fillStyle = "#ffffff";
  for (let p = 0; p < state.activeLevel.polygons.length; p++) {
    const poly = state.activeLevel.polygons[p];
    for (let v = 0; v < poly.length; v++) {
      const pt = poly[v];
      if (state.editorHoveredVertex && state.editorHoveredVertex.polyIdx === p && state.editorHoveredVertex.vertIdx === v) {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(pt[0] - 3, pt[1] - 3, 6, 6);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(pt[0] - 2, pt[1] - 2, 4, 4);
      }
    }
  }

  if (state.activePolygon.length > 0) {
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = (1.5 * dpr) / Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.moveTo(state.activePolygon[0][0], state.activePolygon[0][1]);
    for (let i = 1; i < state.activePolygon.length; i++) {
      ctx.lineTo(state.activePolygon[i][0], state.activePolygon[i][1]);
    }
    ctx.stroke();
    
    ctx.fillStyle = "#00ffff";
    for (const pt of state.activePolygon) {
      ctx.fillRect(pt[0] - 2, pt[1] - 2, 4, 4);
    }
  }

  ctx.save();
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  let modeText = `MODUS: ${state.editorMode.toUpperCase()}`;
  if (state.editorMode === "entity") modeText += ` (${state.selectedEntityPreset.toUpperCase()})`;
  drawVectorText(ctx, modeText, state.editorCam.x - 150, state.editorCam.y - 92, 0.25, "#ffffff");
  // CRT static noise overlay
  ctx.save();
  const crtAlpha = 0.03 + Math.random() * 0.02;
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = "rgba(255,255,255," + (crtAlpha * Math.random()).toFixed(3) + ")";
    ctx.fillRect(Math.random() * 320, Math.random() * 200, 1 + Math.random() * 3, 1);
  }
  ctx.restore();

  ctx.restore();
}
