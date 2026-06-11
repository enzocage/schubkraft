import { state, STATE_TITLE, STATE_PLAYING, STATE_LEVEL_COMPLETE, STATE_GAME_OVER, STATE_EDITOR, STATE_HIGHSCORE, THEMES, TITLE_MENU_ITEMS } from './constants.js?v=2';
import { drawVectorChar, drawVectorText } from './vectorFont.js?v=2';

// Organic animation — Baba Is You style variant cycling every 200ms
let animTick = 0;
let shootingStar = null;
export function tickAnimation() { animTick++; }
function variant() { return Math.floor(animTick / 12) % 5; }
// Subtle wobble: ±0.3 of the given amount instead of ±2x
function vJitter(amount) { return (variant() - 2) * amount * 0.3; }

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

  // Deep-space backdrop: subtle radial night gradient instead of flat black
  const bgGrad = ctx.createRadialGradient(160, 90, 10, 160, 110, 260);
  bgGrad.addColorStop(0, "#0b0b1a");
  bgGrad.addColorStop(0.5, "#06060f");
  bgGrad.addColorStop(1, "#010103");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 320, 200);

  // Camera Offset
  let camX = state.ship.x;
  let camY = state.ship.y;
  
  if (state.gameState === STATE_TITLE || state.gameState === STATE_HIGHSCORE) {
    camX = 320 + Math.sin(Date.now() * 0.0003) * 120;
    camY = 400 + Math.cos(Date.now() * 0.0002) * 80;
  }
  else if (state.gameState === STATE_PLAYING || state.gameState === STATE_LEVEL_COMPLETE) {
    // Velocity look-ahead target, smoothed for cinematic camera motion
    let targetX = state.ship.x + state.ship.vx * 10;
    let targetY = state.ship.y + state.ship.vy * 10;
    if (state.pod.attached && state.pod.alive) {
      targetX = targetX * 0.55 + state.pod.x * 0.45;
      targetY = targetY * 0.55 + state.pod.y * 0.45;
    }
    state.cam.x += (targetX - state.cam.x) * 0.10;
    state.cam.y += (targetY - state.cam.y) * 0.10;
    camX = state.cam.x;
    camY = state.cam.y;

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

  // 0b. Distant nebula clouds drifting on very slow parallax
  const nebulae = [
    { x: 90, y: 60, r: 70, col: "rgba(90, 40, 140," , a: 0.05, p: 0.012 },
    { x: 250, y: 140, r: 85, col: "rgba(0, 90, 110,", a: 0.045, p: 0.018 },
    { x: 180, y: 40, r: 55, col: "rgba(140, 40, 70,", a: 0.04, p: 0.009 }
  ];
  for (const nb of nebulae) {
    const nx = ((nb.x - camX * nb.p) % 380 + 380) % 380 - 30;
    const ny = ((nb.y - camY * nb.p) % 240 + 240) % 240 - 20;
    const pulse = 1 + 0.18 * Math.sin(Date.now() * 0.0004 + nb.x);
    const ng = ctx.createRadialGradient(nx, ny, 4, nx, ny, nb.r * pulse);
    ng.addColorStop(0, nb.col + (nb.a * 1.6) + ")");
    ng.addColorStop(0.6, nb.col + nb.a + ")");
    ng.addColorStop(1, nb.col + "0)");
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.arc(nx, ny, nb.r * pulse, 0, Math.PI * 2);
    ctx.fill();
  }

  // 0c. Occasional shooting star streaking across the sky
  if (!shootingStar && Math.random() < 0.004) {
    const fromLeft = Math.random() < 0.5;
    shootingStar = {
      x: fromLeft ? -10 : 330,
      y: Math.random() * 90 + 10,
      vx: (fromLeft ? 1 : -1) * (2.2 + Math.random() * 2),
      vy: 0.5 + Math.random() * 0.9,
      life: 1
    };
  }
  if (shootingStar) {
    const ss = shootingStar;
    ss.x += ss.vx;
    ss.y += ss.vy;
    ss.life -= 0.012;
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${Math.max(0, ss.life * 0.8)})`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(ss.x, ss.y);
    ctx.lineTo(ss.x - ss.vx * 6, ss.y - ss.vy * 6);
    ctx.stroke();
    ctx.strokeStyle = `rgba(150,200,255,${Math.max(0, ss.life * 0.3)})`;
    ctx.beginPath();
    ctx.moveTo(ss.x - ss.vx * 6, ss.y - ss.vy * 6);
    ctx.lineTo(ss.x - ss.vx * 14, ss.y - ss.vy * 14);
    ctx.stroke();
    ctx.restore();
    if (ss.life <= 0 || ss.x < -30 || ss.x > 350 || ss.y > 230) shootingStar = null;
  }

  // 1. Pseudo-3D parallax starfield: depth-scaled glowing circles.
  // Far stars: tiny dim dots. Near stars: bright discs with soft halos.
  const starTime = Date.now();
  for (let i = 0; i < state.stars.length; i++) {
    const star = state.stars[i];
    const z = star.z;
    const speed = 0.04 + z * 0.22;             // nearer = faster parallax
    const radius = 0.25 + z * 1.15;            // nearer = bigger disc
    const twinkle = 0.5 + 0.5 * Math.sin(starTime * 0.002 * (1 + z * 2) + star.twinkle);

    const sx = ((star.x - camX * speed) % 320 + 320) % 320;
    const sy = ((star.y - camY * speed) % 200 + 200) % 200;

    if (z > 0.62) {
      // Near layer: glowing white disc with soft halo
      const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 3.2);
      halo.addColorStop(0, `rgba(255,255,255,${0.5 * twinkle})`);
      halo.addColorStop(0.4, `rgba(180,220,255,${0.18 * twinkle})`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sx, sy, radius * 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.55 + 0.45 * twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (z > 0.3) {
      // Mid layer: small green-tinted discs
      ctx.fillStyle = `rgba(150,255,120,${0.25 + 0.3 * twinkle})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Far layer: dim blue-gray pixels
      ctx.fillStyle = `rgba(110,115,145,${0.18 + 0.2 * twinkle})`;
      ctx.fillRect(sx, sy, 0.7, 0.7);
    }
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

  // 3b. Live breathing neon pulse along the terrain contours.
  // The static glow is baked; this thin animated pass makes walls feel alive.
  if (state.useBloom && state.activeLevel.polygons.length > 0) {
    const themeLive = THEMES[state.activeLevel.theme] || THEMES.c64;
    const breathe = 0.35 + 0.25 * Math.sin(Date.now() * 0.0016);
    ctx.save();
    ctx.globalAlpha = breathe;
    ctx.shadowBlur = 7 * dpr;
    ctx.shadowColor = themeLive.edge || themeLive.terrain;
    ctx.strokeStyle = themeLive.edge || themeLive.terrain;
    ctx.lineWidth = (1.2 * dpr) / Math.min(scaleX, scaleY);
    for (const poly of state.activeLevel.polygons) {
      if (poly.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i][0], poly[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Exit line: animated dashed beacon + chevrons pointing the escape direction
  const exitYLine = state.activeLevel.exitY;
  const exitInverted = !!state.activeLevel.invertedGravity;
  ctx.save();
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  const exitPulse = 0.18 + 0.14 * Math.sin(Date.now() * 0.003);
  ctx.strokeStyle = `rgba(255, 255, 0, ${exitPulse})`;
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -(Date.now() * 0.01) % 11;
  ctx.beginPath();
  ctx.moveTo(0, exitYLine);
  ctx.lineTo(1200, exitYLine);
  ctx.stroke();
  ctx.setLineDash([]);
  // Chevrons drift toward the exit (up normally, down when gravity inverted)
  const chevDir = exitInverted ? 1 : -1;
  const chevPhase = (Date.now() * 0.012) % 16;
  ctx.strokeStyle = "rgba(255, 255, 80, 0.30)";
  for (let cxp = 40; cxp < 640; cxp += 80) {
    const cy2 = exitYLine + chevDir * (6 + chevPhase);
    ctx.beginPath();
    ctx.moveTo(cxp - 4, cy2 + chevDir * 4);
    ctx.lineTo(cxp, cy2);
    ctx.lineTo(cxp + 4, cy2 + chevDir * 4);
    ctx.stroke();
  }
  ctx.restore();

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
      // Armored base plate + mount struts + rotating dome
      ctx.beginPath();
      ctx.moveTo(ent.x - 10, ent.y + 1);
      ctx.lineTo(ent.x + 10, ent.y + 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ent.x - 7, ent.y + 1); ctx.lineTo(ent.x - 5, ent.y - 2);
      ctx.moveTo(ent.x + 7, ent.y + 1); ctx.lineTo(ent.x + 5, ent.y - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ent.x + vJitter(0.8), ent.y + vJitter(0.8), 7 + vJitter(1), Math.PI, 0);
      ctx.stroke();
      // Dome seam detail
      ctx.beginPath();
      ctx.arc(ent.x, ent.y, 4.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      const angle = ent.angle !== undefined ? ent.angle : (ent.dir === -1 ? Math.PI : 0);
      // Barrel recoil: snaps back right after firing (bulletTimer just reset)
      const recoil = ent.bulletTimer !== undefined && ent.bulletTimer < 0.12 ? -2.5 : 0;
      const barrelLen = 11 + recoil + vJitter(1.5);
      const muzzleX = ent.x + Math.cos(angle) * barrelLen;
      const muzzleY = ent.y - 2 + Math.sin(angle) * barrelLen;
      ctx.beginPath();
      ctx.moveTo(ent.x + vJitter(0.6), ent.y - 2 + vJitter(0.6));
      ctx.lineTo(muzzleX, muzzleY);
      ctx.stroke();

      // Charge-up glow: red dot grows at the muzzle as the next shot approaches
      if (ent.bulletTimer !== undefined && ent.bulletTimer > 0.9) {
        const charge = Math.min(1, (ent.bulletTimer - 0.9) / 0.5);
        ctx.save();
        ctx.fillStyle = `rgba(255, ${Math.floor(80 - charge * 60)}, 40, ${0.35 + charge * 0.6})`;
        ctx.beginPath();
        ctx.arc(muzzleX, muzzleY, 0.7 + charge * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Muzzle flash right after the shot
      if (ent.bulletTimer !== undefined && ent.bulletTimer < 0.1) {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        for (let f = -1; f <= 1; f++) {
          const fa = angle + f * 0.4;
          ctx.beginPath();
          ctx.moveTo(muzzleX, muzzleY);
          ctx.lineTo(muzzleX + Math.cos(fa) * 5, muzzleY + Math.sin(fa) * 5);
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.strokeStyle = "rgba(255, 0, 0, 0.22)";
      ctx.setLineDash([2, 4]);
      ctx.lineDashOffset = -(Date.now() * 0.01) % 6; // crawling threat line
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(ent.x, ent.y - 2);
      ctx.lineTo(ent.x + Math.cos(angle) * 120, ent.y - 2 + Math.sin(angle) * 120);
      ctx.stroke();
      ctx.restore();
    }
    else if (ent.type === "fuel") {
      // Fuel canister: body + cap + level gauge that drains as it's siphoned
      const fillFrac = Math.max(0, Math.min(1, ent.health !== undefined ? ent.health : 1));
      const fx = ent.x + vJitter(0.4);
      const fy = ent.y + vJitter(0.4);

      // Soft pulsing glow behind canister
      ctx.save();
      ctx.shadowBlur = 0;
      const fuelPulse = 0.10 + 0.06 * Math.sin(Date.now() * 0.004 + ent.x);
      const fg = ctx.createRadialGradient(fx, fy, 2, fx, fy, 16);
      fg.addColorStop(0, `rgba(124, 252, 0, ${fuelPulse})`);
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body + filler cap
      ctx.strokeRect(fx - 9, fy - 8, 18, 16);
      ctx.strokeRect(fx - 3, fy - 11, 6, 3);
      // Liquid level (filled from bottom, drains while tractored)
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(124, 252, 0, 0.25)";
      const lh = 13 * fillFrac;
      ctx.fillRect(fx - 7.5, fy + 6.5 - lh, 15, lh);
      // Liquid surface shimmer line
      ctx.strokeStyle = "rgba(190, 255, 120, 0.8)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(fx - 7.5, fy + 6.5 - lh + Math.sin(Date.now() * 0.01) * 0.5);
      ctx.lineTo(fx + 7.5, fy + 6.5 - lh - Math.sin(Date.now() * 0.01) * 0.5);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
      drawVectorText(ctx, "FUEL", fx - 8, fy - 3, 0.22, objColor);
      ctx.restore();
    }
    else if (ent.type === "reactor") {
      const overload = state.reactorTimer > 0;
      const t = Date.now() * (overload ? 0.03 : 0.008);

      // Reactor pulse glow gradient background (red + violent when overloading)
      ctx.save();
      ctx.shadowBlur = 0;
      const glowCol = overload ? "rgba(255, 40, 40, 0.35)" : "rgba(124, 252, 0, 0.22)";
      const grad = ctx.createRadialGradient(ent.x, ent.y, 2, ent.x, ent.y, 16 + Math.sin(Date.now() * 0.012) * 5);
      grad.addColorStop(0, glowCol);
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ent.x, ent.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (overload) {
        ctx.strokeStyle = Math.floor(Date.now() / 120) % 2 === 0 ? "#ff3333" : objColor;
        if (state.useBloom) ctx.shadowColor = "#ff3333";
      }

      // Outer housing
      ctx.strokeRect(ent.x - 12 + vJitter(1.2), ent.y - 12 + vJitter(1.2), 24 + vJitter(2), 24 + vJitter(2));

      // Counter-rotating inner core squares
      for (let ring = 0; ring < 2; ring++) {
        const rot = ring === 0 ? t : -t * 1.4;
        const rad = ring === 0 ? 7 : 4 + Math.sin(Date.now() * 0.015) * 1.5;
        ctx.save();
        ctx.translate(ent.x, ent.y);
        ctx.rotate(rot);
        ctx.strokeRect(-rad, -rad, rad * 2, rad * 2);
        ctx.restore();
      }

      // Energy arcs flickering off the core during overload
      if (overload && Math.random() < 0.4) {
        ctx.save();
        ctx.strokeStyle = "#ffffff";
        const arcA = Math.random() * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(ent.x + Math.cos(arcA) * 8, ent.y + Math.sin(arcA) * 8);
        ctx.lineTo(ent.x + Math.cos(arcA + 0.5) * (14 + Math.random() * 6), ent.y + Math.sin(arcA + 0.5) * (14 + Math.random() * 6));
        ctx.stroke();
        ctx.restore();
      }
    }
    else if (ent.type === "door") {
      // Energy-field force door: pulsing frame + scrolling field lines
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.006);
      ctx.strokeStyle = `rgba(255, 34, 34, ${pulse})`;
      if (state.useBloom) ctx.shadowColor = "#ff2222";
      ctx.strokeRect(ent.x + vJitter(0.8), ent.y + vJitter(0.8), (ent.w || 8) + vJitter(1), (ent.h || 80) + vJitter(1.5));
      ctx.save();
      ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
      const scroll = (Date.now() * 0.02) % 15;
      const doorH = ent.h || 80;
      const doorW = ent.w || 8;
      for (let dy = ent.y + scroll; dy < ent.y + doorH; dy += 15) {
        const lineAlpha = 0.4 + 0.6 * Math.abs(Math.sin(dy * 0.3 + Date.now() * 0.008));
        ctx.strokeStyle = `rgba(255, 80, 80, ${lineAlpha})`;
        ctx.beginPath();
        ctx.moveTo(ent.x, dy);
        ctx.lineTo(ent.x + doorW, dy - 4);
        ctx.stroke();
      }
      ctx.restore();
    }
    else if (ent.type === "switch") {
      // Pulsing beacon so switches read as interactive
      const swPulse = 0.55 + 0.45 * Math.sin(Date.now() * 0.008);
      ctx.strokeStyle = `rgba(0, 255, 255, ${swPulse})`;
      if (state.useBloom) ctx.shadowColor = "#00ffff";
      ctx.strokeRect(ent.x - 5 + vJitter(0.7), ent.y - 5 + vJitter(0.7), 10 + vJitter(1.5), 10 + vJitter(1.5));
      ctx.beginPath();
      ctx.moveTo(ent.x, ent.y);
      ctx.lineTo(ent.x + 4, ent.y - 6);
      ctx.stroke();
      // Expanding ping ring
      const ping = (Date.now() % 1600) / 1600;
      ctx.save();
      ctx.globalAlpha = (1 - ping) * 0.5;
      ctx.beginPath();
      ctx.arc(ent.x, ent.y, 6 + ping * 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 5. Draw Pod (with slowly rotating orbital tick marks)
  if (state.pod.alive) {
    ctx.strokeStyle = objColor;
    if (state.useBloom) ctx.shadowColor = objColor;
    ctx.beginPath();
    ctx.arc(state.pod.x + vJitter(1), state.pod.y + vJitter(1), 5 + vJitter(0.8), 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(state.pod.x + vJitter(1), state.pod.y + vJitter(1), 2 + vJitter(0.5), 0, Math.PI * 2);
    ctx.stroke();

    const podRot = Date.now() * 0.0012;
    for (let k = 0; k < 3; k++) {
      const a = podRot + k * (Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.moveTo(state.pod.x + Math.cos(a) * 5, state.pod.y + Math.sin(a) * 5);
      ctx.lineTo(state.pod.x + Math.cos(a) * 7.5, state.pod.y + Math.sin(a) * 7.5);
      ctx.stroke();
    }

    // Highlight halo while not yet attached and ship is near (tractor range hint)
    if (!state.pod.attached && state.ship.alive) {
      const dx = state.ship.x - state.pod.x;
      const dy = state.ship.y - state.pod.y;
      if (dx * dx + dy * dy < 36 * 36) {
        const hint = (Date.now() % 900) / 900;
        ctx.save();
        ctx.globalAlpha = (1 - hint) * 0.5;
        ctx.strokeStyle = "#00ffff";
        ctx.beginPath();
        ctx.arc(state.pod.x, state.pod.y, 7 + hint * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
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

    // Cockpit canopy + glowing engine port detail
    ctx.beginPath();
    ctx.moveTo(3.5, 0);
    ctx.lineTo(0.5, -1.6);
    ctx.lineTo(0.5, 1.6);
    ctx.closePath();
    ctx.stroke();
    ctx.save();
    ctx.fillStyle = state.keys.thrust && state.ship.fuel > 0 ? "#ffcc66" : "rgba(124,252,0,0.5)";
    ctx.fillRect(-3.4, -0.9, 1.2, 1.8);
    ctx.restore();

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

      // Two-layer animated flame: orange outer cone + white-hot inner jet
      const flameLength = 6 + Math.random() * 8;
      ctx.strokeStyle = "#ff8800";
      if (state.useBloom) ctx.shadowColor = "#ff8800";
      ctx.beginPath();
      ctx.moveTo(-3, -1.6);
      ctx.lineTo(-3 - flameLength * 0.6, -1 + Math.random() * 2 - 1);
      ctx.lineTo(-3 - flameLength, (Math.random() - 0.5) * 1.5);
      ctx.lineTo(-3 - flameLength * 0.6, 1 + Math.random() * 2 - 1);
      ctx.lineTo(-3, 1.6);
      ctx.stroke();

      ctx.strokeStyle = "#ffee99";
      if (state.useBloom) ctx.shadowColor = "#ffee99";
      ctx.beginPath();
      ctx.moveTo(-3, 0);
      ctx.lineTo(-3 - flameLength * 0.55, (Math.random() - 0.5) * 1.2);
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
      // Undulating energy beam with pulses travelling toward the ship
      const target = state.ship.tractorTarget;
      ctx.strokeStyle = "rgba(0, 255, 255, 0.8)";
      if (state.useBloom) ctx.shadowColor = "#00ffff";
      ctx.lineWidth = dpr / Math.min(scaleX, scaleY);

      const bdx = target.x - state.ship.x;
      const bdy = target.y - state.ship.y;
      const blen = Math.sqrt(bdx * bdx + bdy * bdy) || 1;
      const pnx = -bdy / blen; // perpendicular
      const pny = bdx / blen;
      const tNow = Date.now() * 0.012;

      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.moveTo(state.ship.x, state.ship.y);
        const SEGS = 6;
        for (let s2 = 1; s2 <= SEGS; s2++) {
          const f = s2 / SEGS;
          const wob = Math.sin(f * Math.PI * 3 - tNow) * 2.5 * side * Math.sin(f * Math.PI);
          ctx.lineTo(
            state.ship.x + bdx * f + pnx * (wob + side * 4 * f),
            state.ship.y + bdy * f + pny * (wob + side * 4 * f)
          );
        }
        ctx.stroke();
      }

      // Energy pulse dots flowing from target to ship
      ctx.fillStyle = "rgba(180, 255, 255, 0.9)";
      for (let pd = 0; pd < 3; pd++) {
        const f = 1 - ((Date.now() * 0.0009 + pd * 0.33) % 1);
        ctx.fillRect(state.ship.x + bdx * f - 0.7, state.ship.y + bdy * f - 0.7, 1.4, 1.4);
      }
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

  // 8. Projectiles — fat glowing plasma bolts: halo + streak + hot head
  for (const p of state.projectiles) {
    const col = p.enemy ? "#ff4444" : "#ffffff";
    const glowCol = p.enemy ? "rgba(255,80,60," : "rgba(160,255,255,";
    const headR = p.enemy ? 1.6 : 1.3;
    if (state.useBloom) ctx.shadowColor = col;

    // Soft plasma halo around the head
    ctx.save();
    ctx.shadowBlur = 0;
    const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, headR * 3);
    halo.addColorStop(0, glowCol + "0.5)");
    halo.addColorStop(1, glowCol + "0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, headR * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Long faded trail
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = col;
    ctx.lineWidth = (1.4 * dpr) / Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.moveTo(p.x - p.vx * 0.8, p.y - p.vy * 0.8);
    ctx.lineTo(p.x - p.vx * 2.8, p.y - p.vy * 2.8);
    ctx.stroke();
    ctx.restore();

    // Hot streak
    ctx.strokeStyle = col;
    ctx.lineWidth = (2.0 * dpr) / Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.8, p.y - p.vy * 0.8);
    ctx.stroke();

    // Bright bolt head
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, headR * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);

  ctx.shadowBlur = 0; // Disable shadow glow

  // 9. Explosion & Rocket sparks — circular neon particles with alpha fade out
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = p.maxLife ? Math.max(0, p.life / p.maxLife) : 1;
    ctx.fillStyle = p.color;
    if (state.useBloom) {
      ctx.shadowBlur = 4 * dpr;
      ctx.shadowColor = p.color;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  // 9b. Spinning wireframe debris shards
  ctx.lineWidth = (1.2 * dpr) / Math.min(scaleX, scaleY);
  for (const d of state.debris) {
    ctx.globalAlpha = Math.max(0, Math.min(1, d.life / 0.6));
    ctx.strokeStyle = d.color;
    const dx = Math.cos(d.rot) * d.len;
    const dy = Math.sin(d.rot) * d.len;
    ctx.beginPath();
    ctx.moveTo(d.x - dx, d.y - dy);
    ctx.lineTo(d.x + dx, d.y + dy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

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
    // Trailing inner ring for depth
    ctx.globalAlpha = alpha * 0.45;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius * 0.62, 0, Math.PI * 2);
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

  if (state.gameState === STATE_PLAYING && state.paused) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, 320, 200);
    drawVectorText(ctx, "PAUSE", 122, 90, 0.85, "#7CFC00");
    drawVectorText(ctx, "DRUECKE P ZUM FORTSETZEN", 78, 120, 0.3, "#888");
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

  if (state.musicTitleTimer > 0) {
    ctx.save();
    ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
    const size = 0.55;
    const text = state.musicTitleMessage;
    const textLen = text.length;
    const spacing = size * 10;
    const startX = 160 - (textLen * spacing) / 2;
    const startY = 100 - (size * 8) / 2;

    ctx.fillStyle = "rgba(10, 10, 20, 0.85)";
    ctx.fillRect(startX - 8, startY - 6, textLen * spacing + 16, size * 8 + 12);

    ctx.strokeStyle = "rgba(124, 252, 0, 0.4)";
    ctx.strokeRect(startX - 8, startY - 6, textLen * spacing + 16, size * 8 + 12);

    drawVectorText(ctx, text, startX, startY, size, "#ffffff");
    ctx.restore();
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

  // Screen transition: one of 5 randomized trash bursts on EVERY state change
  if (state.gameState !== state.lastGameState) {
    state.lastGameState = state.gameState;
    state.transitionTimer = 0.55;
    state.transitionVariant = Math.floor(Math.random() * 5);
  }
  if (state.transitionTimer > 0) {
    const ta = state.transitionTimer / 0.55;
    ctx.save();

    if (state.transitionVariant === 0) {
      // ===== RGB STATIC STORM: violent tri-color noise blizzard =====
      const chans = ["255,40,40", "40,255,60", "60,80,255", "255,255,255"];
      for (let i = 0; i < 320 * ta; i++) {
        ctx.fillStyle = `rgba(${chans[i % 4]},${(Math.random() * 0.65 * ta).toFixed(3)})`;
        ctx.fillRect(Math.random() * 320, Math.random() * 200, 1 + Math.random() * 9, 1 + Math.random() * 2.5);
      }
      ctx.fillStyle = `rgba(255,255,255,${0.10 * ta})`;
      ctx.fillRect(0, Math.random() * 200, 320, 3);
    }
    else if (state.transitionVariant === 1) {
      // ===== VHS CHROMA TEAR: shifted magenta/cyan bands + tracking lines =====
      for (let i = 0; i < 9 * ta; i++) {
        const ty2 = Math.random() * 200;
        const th = 3 + Math.random() * 10;
        const shift = (Math.random() - 0.5) * 26 * ta;
        ctx.fillStyle = `rgba(255,0,180,${0.10 + Math.random() * 0.22 * ta})`;
        ctx.fillRect(shift, ty2, 320, th);
        ctx.fillStyle = `rgba(0,230,255,${0.10 + Math.random() * 0.22 * ta})`;
        ctx.fillRect(-shift, ty2 + th * 0.4, 320, th * 0.6);
      }
      for (let i = 0; i < 90 * ta; i++) {
        ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.5 * ta).toFixed(3)})`;
        ctx.fillRect(Math.random() * 320, Math.random() * 200, 2 + Math.random() * 12, 1);
      }
    }
    else if (state.transitionVariant === 2) {
      // ===== C64 RAINBOW BARS: classic loader stripes sweeping down =====
      const barCols = ["#ff2222", "#ff8800", "#ffee00", "#22dd44", "#2288ff", "#aa44ff", "#ff44aa"];
      const sweep = (1 - ta) * 280 - 60;
      for (let i = 0; i < 14; i++) {
        const by = sweep + i * 9;
        ctx.globalAlpha = 0.5 * ta;
        ctx.fillStyle = barCols[i % barCols.length];
        ctx.fillRect(0, by, 320, 5);
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 60 * ta; i++) {
        ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.4 * ta).toFixed(3)})`;
        ctx.fillRect(Math.random() * 320, Math.random() * 200, 1 + Math.random() * 4, 1);
      }
    }
    else if (state.transitionVariant === 3) {
      // ===== PIXEL DUST IMPLOSION: colored motes spiraling toward center =====
      const prog = 1 - ta;
      const dustCols = ["255,200,60", "120,255,120", "120,200,255", "255,120,200"];
      for (let i = 0; i < 60 * ta; i++) {
        const a = (i / 60) * Math.PI * 2 + prog * 5;
        const dist = (1 - prog) * (60 + (i % 5) * 26);
        const px2 = 160 + Math.cos(a) * dist * 1.5;
        const py2 = 100 + Math.sin(a) * dist;
        ctx.fillStyle = `rgba(${dustCols[i % 4]},${(0.25 + Math.random() * 0.5) * ta})`;
        ctx.beginPath();
        ctx.arc(px2, py2, 0.6 + Math.random() * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Center flash as everything collapses
      const flashGrad = ctx.createRadialGradient(160, 100, 0, 160, 100, 50 * ta + 6);
      flashGrad.addColorStop(0, `rgba(255,255,255,${0.30 * ta})`);
      flashGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, 320, 200);
    }
    else {
      // ===== GLITCH BLOCKS: phosphor wash + displaced color rectangles =====
      ctx.fillStyle = `rgba(40, 255, 80, ${0.07 * ta})`;
      ctx.fillRect(0, 0, 320, 200);
      const glitchCols = ["255,60,60", "60,255,120", "255,220,40", "200,80,255", "60,220,255"];
      for (let i = 0; i < 16 * ta; i++) {
        ctx.fillStyle = `rgba(${glitchCols[i % 5]},${0.12 + Math.random() * 0.30 * ta})`;
        ctx.fillRect(Math.random() * 300, Math.random() * 190, 8 + Math.random() * 60, 2 + Math.random() * 9);
      }
      // Scanline roll bar
      const rollY = ((1 - ta) * 300) - 40;
      ctx.fillStyle = `rgba(180,255,180,${0.14 * ta})`;
      ctx.fillRect(0, rollY, 320, 30);
      for (let i = 0; i < 100 * ta; i++) {
        ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.45 * ta).toFixed(3)})`;
        ctx.fillRect(Math.random() * 320, Math.random() * 200, 1 + Math.random() * 5, 1);
      }
    }

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
  const lowFuel = displayFuel < 250;
  const fuelColor = lowFuel ? "#ff2222" : hudColor;

  drawVectorText(ctx, `FUEL: ${displayFuel.toString().padStart(4, '0')}`, 10, 8, 0.28, fuelColor);

  // Fuel gauge bar (blinks when low)
  const fuelFrac = Math.max(0, Math.min(1, state.ship.fuel / (state.activeLevel.fuel || 1)));
  const barBlink = !lowFuel || Math.floor(Date.now() / 250) % 2 === 0;
  ctx.strokeStyle = "rgba(124, 252, 0, 0.3)";
  ctx.strokeRect(10, 22, 60, 4);
  if (barBlink) {
    ctx.fillStyle = fuelColor;
    ctx.fillRect(11, 23, 58 * fuelFrac, 2);
  }
  // Lives shown as little ship glyphs
  drawVectorText(ctx, "LIVES:", 125, 8, 0.28, hudColor);
  ctx.save();
  ctx.strokeStyle = hudColor;
  for (let li = 0; li < Math.min(5, state.lives); li++) {
    const lx = 172 + li * 11;
    ctx.beginPath();
    ctx.moveTo(lx, 7);
    ctx.lineTo(lx - 3, 13);
    ctx.lineTo(lx, 11.5);
    ctx.lineTo(lx + 3, 13);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
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

  // Pulsing glow behind the title
  const titlePulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.002);
  ctx.save();
  if (state.useBloom) {
    ctx.shadowBlur = 8 + titlePulse * 10;
    ctx.shadowColor = "#7CFC00";
  }
  drawVectorText(ctx, "SCHUBKRAFT", 90, 34, 1.4, "#7CFC00");
  ctx.restore();
  drawVectorText(ctx, "HTML5 SPECIAL EDITION", 68, 64, 0.32, "#ffffff");

  // Tiny demo ship flying across the title screen with flame
  const flyT = (Date.now() % 9000) / 9000;
  const shipX = -20 + flyT * 360;
  const shipY = 48 + Math.sin(flyT * Math.PI * 4) * 10;
  ctx.save();
  ctx.translate(shipX, shipY);
  ctx.rotate(Math.sin(flyT * Math.PI * 4) * 0.3);
  ctx.strokeStyle = "#7CFC00";
  if (state.useBloom) { ctx.shadowBlur = 5; ctx.shadowColor = "#7CFC00"; }
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = "#ff8800";
  ctx.beginPath();
  ctx.moveTo(-3, 0);
  ctx.lineTo(-3 - (4 + Math.random() * 5), (Math.random() - 0.5) * 2);
  ctx.stroke();
  ctx.restore();

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

  drawVectorText(ctx, "CONTROLS: WASD/O:SHIELD/K:FIRE + SPACE", 84, 170, 0.24, "#555");
  drawVectorText(ctx, "PRESS H FOR HELP", 84, 179, 0.28, "#7CFC00");
  drawVectorText(ctx, "coding by felix schmidt 2026", 72, 188, 0.25, "#333");
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
  // 1. Grid Dots visual rendering
  if (state.editorShowGridDots) {
    ctx.save();
    ctx.fillStyle = "rgba(124, 252, 0, 0.16)";
    const spacing = state.snapToGrid ? state.editorGridSize : 16;
    const sX = Math.floor((state.editorCam.x - 160 / state.editorScale) / spacing) * spacing;
    const eX = sX + 320 / state.editorScale + spacing * 2;
    const sY = Math.floor((state.editorCam.y - 100 / state.editorScale) / spacing) * spacing;
    const eY = sY + 200 / state.editorScale + spacing * 2;
    
    for (let x = sX; x < eX; x += spacing) {
      for (let y = sY; y < eY; y += spacing) {
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
    ctx.restore();
  } else {
    // Faint boundary guidelines if grid dots are hidden
    ctx.strokeStyle = "rgba(124, 252, 0, 0.04)";
    ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.moveTo(state.editorCam.x - 160, state.editorCam.y);
    ctx.lineTo(state.editorCam.x + 160, state.editorCam.y);
    ctx.moveTo(state.editorCam.x, state.editorCam.y - 100);
    ctx.lineTo(state.editorCam.x, state.editorCam.y + 100);
    ctx.stroke();
  }

  // 2. Interactive Exit line handle
  const exitY = state.activeLevel.exitY || 50;
  ctx.save();
  ctx.strokeStyle = "#ffff00";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(state.editorCam.x - 160 / state.editorScale, exitY);
  ctx.lineTo(state.editorCam.x + 160 / state.editorScale, exitY);
  ctx.stroke();
  
  // Handle box
  ctx.fillStyle = "#ffff00";
  ctx.fillRect(state.editorCam.x - 30, exitY - 4, 60, 8);
  ctx.lineWidth = 0.5;
  drawVectorText(ctx, "EXIT HEIGHT", state.editorCam.x - 26, exitY - 3, 0.16, "#000000");
  ctx.restore();

  // 3. Spawn point indicator
  ctx.strokeStyle = "#ff9900";
  ctx.beginPath();
  ctx.arc(state.activeLevel.spawn.x, state.activeLevel.spawn.y, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  drawVectorText(ctx, "SPAWN", state.activeLevel.spawn.x - 14, state.activeLevel.spawn.y - 12, 0.22, "#ff9900");
  ctx.restore();

  // 4. Switch visual link lines
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

  // 5. Selected / Hovered Polygon visual fills
  if (state.editorHoveredPoly !== null) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 255, 255, 0.06)";
    ctx.beginPath();
    const poly = state.activeLevel.polygons[state.editorHoveredPoly];
    if (poly && poly.length > 0) {
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  if (state.editorSelectedPoly !== null) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 255, 255, 0.03)";
    ctx.strokeStyle = "rgba(0, 255, 255, 0.7)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    const poly = state.activeLevel.polygons[state.editorSelectedPoly];
    if (poly && poly.length > 0) {
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 6. Selected / Hovered Entity outlines
  if (state.editorSelectedEntity) {
    ctx.save();
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.arc(state.editorSelectedEntity.x, state.editorSelectedEntity.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (state.editorHoveredEntity && state.editorHoveredEntity !== state.editorSelectedEntity) {
    ctx.save();
    ctx.strokeStyle = "rgba(0, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(state.editorHoveredEntity.x, state.editorHoveredEntity.y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Vertices drawing
  ctx.save();
  for (let p = 0; p < state.activeLevel.polygons.length; p++) {
    const poly = state.activeLevel.polygons[p];
    for (let v = 0; v < poly.length; v++) {
      const pt = poly[v];
      if (state.editorHoveredVertex && state.editorHoveredVertex.polyIdx === p && state.editorHoveredVertex.vertIdx === v) {
        ctx.fillStyle = "#ff3333";
        ctx.fillRect(pt[0] - 3.5, pt[1] - 3.5, 7, 7);
      } else if (state.editorSelectedPoly === p) {
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(pt[0] - 2.5, pt[1] - 2.5, 5, 5);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillRect(pt[0] - 1.5, pt[1] - 1.5, 3, 3);
      }
    }
  }
  ctx.restore();

  // 8. Active drawing polygon line segments
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
      ctx.fillRect(pt[0] - 2.5, pt[1] - 2.5, 5, 5);
    }
  }

  // 9. Floating cursor coordinates display under active toolbar status bar
  ctx.save();
  ctx.lineWidth = dpr / Math.min(scaleX, scaleY);
  let modeText = `MODUS: ${state.editorMode.toUpperCase()}`;
  if (state.editorMode === "entity") modeText += ` (${state.selectedEntityPreset.toUpperCase()})`;
  drawVectorText(ctx, modeText, state.editorCam.x - 150, state.editorCam.y - 92, 0.25, "#ffffff");
  ctx.restore();
}
