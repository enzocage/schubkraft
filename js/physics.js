import { state, THEMES, STATE_PLAYING, STATE_LEVEL_COMPLETE, STATE_GAME_OVER, CAMPAIGN } from './constants.js';
import { playSFX, updateTractorSound, updateDroneSound, updatePersistentSounds } from './audio.js';

export function showNotification(msg) {
  state.textPromptMessage = msg;
  state.textPromptTimer = 2.0;
}

export function loadLevel(levelData) {
  state.activeLevel = JSON.parse(JSON.stringify(levelData));
  
  state.ship.x = state.activeLevel.spawn.x;
  state.ship.y = state.activeLevel.spawn.y;
  state.ship.oldX = state.ship.x;
  state.ship.oldY = state.ship.y;
  state.ship.vx = 0; state.ship.vy = 0;
  state.ship.angle = -Math.PI / 2;
  state.ship.visualAngle = state.ship.angle;
  state.ship.fuel = state.activeLevel.fuel;
  state.ship.shieldActive = false;
  state.ship.alive = true;
  state.ship.respawnTimer = 0;
  state.ship.tractorBeamActive = false;
  state.ship.tractorTarget = null;
  
  state.pod.attached = false;
  state.pod.alive = true;
  
  state.projectiles = [];
  state.particles = [];
  state.shockwaves = [];
  state.debris = [];
  state.reactorTimer = 0;
  state.paused = false;
  state.cam.x = state.ship.x;
  state.cam.y = state.ship.y;

  state.entities = [];
  for (const ent of state.activeLevel.entities) {
    if (ent.type === "pod") {
      state.pod.x = ent.x;
      state.pod.y = ent.y;
      state.pod.oldX = ent.x;
      state.pod.oldY = ent.y;
    } else {
      state.entities.push({ ...ent, active: true, bulletTimer: 0, health: ent.type === "reactor" ? 5 : 1 });
    }
  }

  buildCollisionGrid();
  bakeTerrain();

  // Teleport-in burst at the spawn point
  spawnSparks(state.ship.x, state.ship.y, "#7CFC00", 14);
  spawnShockwave(state.ship.x, state.ship.y, "#7CFC00");
}

export function buildCollisionGrid() {
  state.collisionGrid = {};
  const segments = getLevelSegments();
  
  for (const seg of segments) {
    const minX = Math.min(seg.x1, seg.x2);
    const maxX = Math.max(seg.x1, seg.x2);
    const minY = Math.min(seg.y1, seg.y2);
    const maxY = Math.max(seg.y1, seg.y2);
    
    const cellMinX = Math.floor(minX / 64);
    const cellMaxX = Math.floor(maxX / 64);
    const cellMinY = Math.floor(minY / 64);
    const cellMaxY = Math.floor(maxY / 64);
    
    for (let cx = cellMinX; cx <= cellMaxX; cx++) {
      for (let cy = cellMinY; cy <= cellMaxY; cy++) {
        const key = `${cx},${cy}`;
        if (!state.collisionGrid[key]) state.collisionGrid[key] = [];
        state.collisionGrid[key].push(seg);
      }
    }
  }
}

function getLevelSegments() {
  const segments = [];
  for (const poly of state.activeLevel.polygons) {
    if (poly.length < 2) continue;
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i];
      const p2 = poly[(i + 1) % poly.length];
      segments.push({ x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
    }
  }
  for (const ent of state.entities) {
    if (ent.type === "door" && ent.active) {
      segments.push({
        x1: ent.x, y1: ent.y,
        x2: ent.x + (ent.w || 8), y2: ent.y + (ent.h || 80),
        isDoor: true,
        ref: ent
      });
    }
  }
  return segments;
}

export function bakeTerrain() {
  const themePreset = THEMES[state.activeLevel.theme] || THEMES.c64;
  
  let maxW = 640;
  let maxH = 800;
  for (const poly of state.activeLevel.polygons) {
    for (const pt of poly) {
      if (pt[0] > maxW) maxW = pt[0];
      if (pt[1] > maxH) maxH = pt[1];
    }
  }
  maxW = Math.max(640, maxW + 50);
  maxH = Math.max(800, maxH + 50);

  state.bakedTerrainCanvas = document.createElement("canvas");
  state.bakedTerrainCanvas.width = maxW;
  state.bakedTerrainCanvas.height = maxH;
  const offCtx = state.bakedTerrainCanvas.getContext("2d");

  offCtx.clearRect(0, 0, maxW, maxH);

  const tracePoly = (c, poly) => {
    c.beginPath();
    c.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) {
      c.lineTo(poly[i][0], poly[i][1]);
    }
    c.closePath();
  };

  if (themePreset.filled) {
    offCtx.fillStyle = themePreset.fillColor;
    for (const poly of state.activeLevel.polygons) {
      if (poly.length < 3) continue;
      tracePoly(offCtx, poly);
      offCtx.fill();
    }
  }

  // Rasterbar interior: C64-style horizontal scanlines whose color cycles
  // through a smooth band palette — classic demo-scene rasterline look
  const raster = themePreset.raster || [themePreset.terrain];
  if (themePreset.hatch > 0) {
    for (const poly of state.activeLevel.polygons) {
      if (poly.length < 3) continue;
      offCtx.save();
      tracePoly(offCtx, poly);
      offCtx.clip();

      offCtx.lineWidth = 1.2;
      const step = themePreset.hatch >= 4 ? 2 : (themePreset.hatch === 3 ? 3 : 3);
      const bandHeight = 10; // px per palette entry → slow vertical color roll
      for (let y = 0; y < maxH; y += step) {
        // Blend smoothly between adjacent raster band colors
        const bandPos = (y / bandHeight) % raster.length;
        offCtx.strokeStyle = raster[Math.floor(bandPos)];
        offCtx.beginPath();
        offCtx.moveTo(0, y);
        offCtx.lineTo(maxW, y);
        offCtx.stroke();
      }
      offCtx.restore();
    }
  }
  // BBC outline theme gets a faint scanline wash inside so caverns read as solid
  else if (!themePreset.filled) {
    for (const poly of state.activeLevel.polygons) {
      if (poly.length < 3) continue;
      offCtx.save();
      tracePoly(offCtx, poly);
      offCtx.clip();
      offCtx.lineWidth = 1;
      const bandHeight = 14;
      for (let y = 0; y < maxH; y += 4) {
        const bandPos = (y / bandHeight) % raster.length;
        offCtx.globalAlpha = 0.22;
        offCtx.strokeStyle = raster[Math.floor(bandPos)];
        offCtx.beginPath();
        offCtx.moveTo(0, y);
        offCtx.lineTo(maxW, y);
        offCtx.stroke();
      }
      offCtx.restore();
    }
  }

  // Baked soft neon glow: stroke the contour with heavy shadow blur for massive look
  for (const pass of [{ blur: 14, width: 3.2, alpha: 0.65 }, { blur: 6, width: 2.0, alpha: 0.85 }]) {
    offCtx.save();
    offCtx.shadowBlur = pass.blur;
    offCtx.shadowColor = themePreset.edge || themePreset.terrain;
    offCtx.globalAlpha = pass.alpha;
    offCtx.strokeStyle = themePreset.terrain;
    offCtx.lineWidth = pass.width;
    for (const poly of state.activeLevel.polygons) {
      if (poly.length < 2) continue;
      tracePoly(offCtx, poly);
      offCtx.stroke();
    }
    offCtx.restore();
  }

  // Crisp bright core line on top — the "hot" neon filament
  offCtx.strokeStyle = themePreset.edge || themePreset.terrain;
  offCtx.lineWidth = 0.9;
  for (const poly of state.activeLevel.polygons) {
    if (poly.length < 2) continue;
    tracePoly(offCtx, poly);
    offCtx.stroke();
  }
}

export function updatePhysics(dt) {
  if (state.gameState !== STATE_PLAYING) return;

  const SUBSTEPS = 4;
  const sdt_frame = 1 / SUBSTEPS;

  // Track W key long press timer
  if (state.keys.thrust) {
    state.keys.wHoldTime += dt;
    if (state.keys.wHoldTime > 0.25) {
      state.keys.shield = true;
    }
  } else {
    state.keys.wHoldTime = 0;
    if (!state.keys.shieldReal) {
      state.keys.shield = false;
    }
  }

  state.ship.shieldActive = state.keys.shield && state.ship.fuel > 0;

  if (state.keys.thrust && state.ship.fuel > 0 && state.ship.alive) {
    state.ship.fuel = Math.max(0, state.ship.fuel - 1.25);
  }
  if (state.ship.shieldActive && state.ship.fuel > 0 && state.ship.alive) {
    state.ship.fuel = Math.max(0, state.ship.fuel - 2.5);
    if (state.ship.fuel <= 0) state.ship.shieldActive = false;
  }

  if (state.reactorTimer > 0) {
    state.reactorTimer = Math.max(0, state.reactorTimer - dt);
    if (state.reactorTimer === 0) {
      triggerMeltdownExplosion();
    }
  }

  for (let step = 0; step < SUBSTEPS; step++) {
    let gravityY = state.activeLevel.gravity;
    let gravityX = 0;
    
    if (state.reactorTimer > 0 && state.reactorTimer < 3.0) {
      gravityY += (Math.random() - 0.5) * 0.010;
      gravityX += (Math.random() - 0.5) * 0.010;
    }

    if (state.activeLevel.invertedGravity) gravityY = -gravityY;

    let thrustX = 0;
    let thrustY = 0;
    if (state.keys.thrust && state.ship.fuel > 0 && state.ship.alive) {
      const THRUST_ACC = 0.088;
      thrustX = Math.cos(state.ship.angle) * THRUST_ACC;
      thrustY = Math.sin(state.ship.angle) * THRUST_ACC;
    }

    if (state.ship.tractorBeamActive && state.ship.tractorTarget && state.ship.alive) {
      const target = state.ship.tractorTarget;
      const dx = target.x - state.ship.x;
      const dy = target.y - state.ship.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 0) {
        const tractorPull = 0.022;
        thrustX += (dx / dist) * tractorPull;
        thrustY += (dy / dist) * tractorPull;
      }
    }

    // Integrate Ship
    if (state.ship.alive) {
      let vx = state.ship.x - state.ship.oldX;
      let vy = state.ship.y - state.ship.oldY;
      
      let nextX = state.ship.x + vx + (thrustX + gravityX) * sdt_frame * sdt_frame;
      let nextY = state.ship.y + vy + (thrustY + gravityY) * sdt_frame * sdt_frame;
      
      state.ship.oldX = state.ship.x;
      state.ship.oldY = state.ship.y;
      state.ship.x = nextX;
      state.ship.y = nextY;
    }

    // Integrate Pod
    if (state.pod.alive) {
      if (state.pod.attached) {
        let vx = state.pod.x - state.pod.oldX;
        let vy = state.pod.y - state.pod.oldY;
        
        let nextX = state.pod.x + vx + gravityX * sdt_frame * sdt_frame;
        let nextY = state.pod.y + vy + gravityY * sdt_frame * sdt_frame;
        
        state.pod.oldX = state.pod.x;
        state.pod.oldY = state.pod.y;
        state.pod.x = nextX;
        state.pod.y = nextY;
      } else {
        const basePos = getPodSpawnBase();
        const onPedestal = basePos && Math.abs(state.pod.x - basePos.x) < 4 && Math.abs(state.pod.y - basePos.y) < 6;
        
        if (onPedestal) {
          state.pod.vx = 0; state.pod.vy = 0;
          state.pod.oldX = state.pod.x; state.pod.oldY = state.pod.y;
        } else {
          let vx = state.pod.x - state.pod.oldX;
          let vy = state.pod.y - state.pod.oldY;
          let nextX = state.pod.x + vx + gravityX * sdt_frame * sdt_frame;
          let nextY = state.pod.y + vy + gravityY * sdt_frame * sdt_frame;
          state.pod.oldX = state.pod.x;
          state.pod.oldY = state.pod.y;
          state.pod.x = nextX;
          state.pod.y = nextY;
        }
      }
    }

    // Rigid Tether Distance Constraint
    if (state.pod.attached && state.ship.alive && state.pod.alive) {
      const L = 28;
      const dx = state.ship.x - state.pod.x;
      const dy = state.ship.y - state.pod.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const error = dist - L;
        const nx = dx / dist;
        const ny = dy / dist;

        const mS = 1.0;
        const mP = 1.6;
        const totalMass = mS + mP;

        const shipCorr = (mP / totalMass) * error;
        const podCorr = (mS / totalMass) * error;

        state.ship.x -= nx * shipCorr * 0.95;
        state.ship.y -= ny * shipCorr * 0.95;
        state.pod.x += nx * podCorr * 0.95;
        state.pod.y += ny * podCorr * 0.95;
      }
    }

    if (state.ship.alive) {
      resolveTerrainCollision(state.ship, 4, true);
    }
    if (state.pod.alive && (state.pod.attached || !checkPodOnPedestal())) {
      resolveTerrainCollision(state.pod, 5, false);
    }
  }

  state.ship.vx = state.ship.x - state.ship.oldX;
  state.ship.vy = state.ship.y - state.ship.oldY;
  state.pod.vx = state.pod.x - state.pod.oldX;
  state.pod.vy = state.pod.y - state.pod.oldY;

  if (state.ship.alive) {
    const ROT_SPEED = 0.075;
    if (state.keys.rotateLeft) state.ship.angle -= ROT_SPEED;
    if (state.keys.rotateRight) state.ship.angle += ROT_SPEED;

    if (state.touchState.leftActive) {
      const deltaX = state.touchState.leftCurrentX - state.touchState.leftStartX;
      const deadzone = 8;
      if (Math.abs(deltaX) > deadzone) {
        if (deltaX < 0) state.ship.angle -= ROT_SPEED;
        else state.ship.angle += ROT_SPEED;
      }
    }

    state.ship.visualAngle += (state.ship.angle - state.ship.visualAngle) * 0.35;
  }

  updateProjectiles(dt);
  updateEntities(dt);
}

function checkPodOnPedestal() {
  const base = getPodSpawnBase();
  if (!base) return false;
  const dx = state.pod.x - base.x;
  const dy = state.pod.y - base.y;
  return Math.sqrt(dx*dx + dy*dy) < 6;
}

function getPodSpawnBase() {
  const originalPod = state.activeLevel.entities.find(e => e.type === "pod");
  return originalPod ? { x: originalPod.x, y: originalPod.y } : null;
}

function resolveTerrainCollision(entity, radius, isShip) {
  const cellX = Math.floor(entity.x / 64);
  const cellY = Math.floor(entity.y / 64);
  
  let collisionDetected = false;
  let collisionNormalX = 0;
  let collisionNormalY = 0;
  let maxPenetration = 0;

  for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
    for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
      const cellKey = `${cx},${cy}`;
      const segments = state.collisionGrid[cellKey];
      if (!segments) continue;

      for (const seg of segments) {
        const dx = seg.x2 - seg.x1;
        const dy = seg.y2 - seg.y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;

        const t = Math.max(0, Math.min(1, ((entity.x - seg.x1) * dx + (entity.y - seg.y1) * dy) / lenSq));
        const closestX = seg.x1 + t * dx;
        const closestY = seg.y1 + t * dy;

        const distX = entity.x - closestX;
        const distY = entity.y - closestY;
        const distSq = distX * distX + distY * distY;

        if (distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const penetration = radius - dist;

          let nx = 0;
          let ny = 0;
          if (dist > 0.001) {
            nx = distX / dist;
            ny = distY / dist;
          } else {
            const len = Math.sqrt(lenSq);
            nx = -dy / len;
            ny = dx / len;
          }

          entity.x += nx * penetration;
          entity.y += ny * penetration;

          collisionDetected = true;
          if (penetration > maxPenetration) {
            maxPenetration = penetration;
            collisionNormalX = nx;
            collisionNormalY = ny;
          }
        }
      }
    }
  }

  if (collisionDetected) {
    if (isShip) {
      if (state.ship.shieldActive && state.ship.fuel > 0) {
        const vx = entity.x - entity.oldX;
        const vy = entity.y - entity.oldY;
        const velN = vx * collisionNormalX + vy * collisionNormalY;

        if (velN < 0) {
          const e = 0.55;
          entity.oldX += collisionNormalX * (1 + e) * velN;
          entity.oldY += collisionNormalY * (1 + e) * velN;
          
          state.ship.fuel = Math.max(0, state.ship.fuel - 28);
          playSFX("shieldPing");
          state.screenShake = Math.max(state.screenShake, 3.5);
          spawnSparks(entity.x, entity.y, "#7CFC00", 6);
        }
      } else {
        explodeShip();
      }
    } else {
      const vx = entity.x - entity.oldX;
      const vy = entity.y - entity.oldY;
      const speed = Math.sqrt(vx * vx + vy * vy);

      if (speed > 1.25) {
        explodePod();
      } else {
        const velN = vx * collisionNormalX + vy * collisionNormalY;
        if (velN < 0) {
          entity.oldX += collisionNormalX * 1.15 * velN;
          entity.oldY += collisionNormalY * 1.15 * velN;
          spawnSparks(entity.x, entity.y, "#ffffff", 2);
        }
      }
    }
  }
}

export function checkLineIntersection(p1, p2, q1, q2) {
  const r_px = p2.x - p1.x;
  const r_py = p2.y - p1.y;
  const s_px = q2.x - q1.x;
  const s_py = q2.y - q1.y;

  const r_cross_s = r_px * s_py - r_py * s_px;
  if (r_cross_s === 0) return null;

  const t = ((q1.x - p1.x) * s_py - (q1.y - p1.y) * s_px) / r_cross_s;
  const u = ((q1.x - p1.x) * r_py - (q1.y - p1.y) * r_px) / r_cross_s;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return { x: p1.x + t * r_px, y: p1.y + t * r_py };
  }
  return null;
}

export function checkRaycastTerrain(p1, p2) {
  const cellMinX = Math.floor(Math.min(p1.x, p2.x) / 64);
  const cellMaxX = Math.floor(Math.max(p1.x, p2.x) / 64);
  const cellMinY = Math.floor(Math.min(p1.y, p2.y) / 64);
  const cellMaxY = Math.floor(Math.max(p1.y, p2.y) / 64);

  for (let cx = cellMinX; cx <= cellMaxX; cx++) {
    for (let cy = cellMinY; cy <= cellMaxY; cy++) {
      const cellKey = `${cx},${cy}`;
      const segments = state.collisionGrid[cellKey];
      if (!segments) continue;

      for (const seg of segments) {
        const hit = checkLineIntersection(p1, p2, { x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 });
        if (hit) return hit;
      }
    }
  }
  return null;
}

export function spawnSparks(cx, cy, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.8 + 0.4;
    const life = Math.random() * 0.28 + 0.1;
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: color,
      life: life,
      maxLife: life,
      size: 0.8
    });
  }
}

export function spawnExplosionParticles(cx, cy, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.8 + 0.6;
    const life = Math.random() * 0.9 + 0.4;
    state.particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + 0.1,
      color: i % 3 === 0 ? "#ffffff" : (i % 3 === 1 ? "#ffaa00" : "#ff5500"),
      life: life,
      maxLife: life,
      grav: true,
      size: Math.random() * 1.5 + 0.5
    });
  }
}

// Spinning wireframe shards — the ship/pod breaking apart
export function spawnDebris(cx, cy, color, count, baseVx, baseVy) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.4 + 0.3;
    state.debris.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed + (baseVx || 0) * 0.5,
      vy: Math.sin(angle) * speed + (baseVy || 0) * 0.5 - 0.4,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.5,
      len: Math.random() * 4 + 2,
      color: color,
      life: Math.random() * 1.2 + 0.8,
      maxLife: 2.0
    });
  }
}

export function spawnShockwave(cx, cy, color) {
  state.shockwaves.push({
    x: cx,
    y: cy,
    radius: 2,
    maxRadius: 36,
    life: 0.4,
    maxLife: 0.4,
    color: color || "#ffaa00"
  });
}

export function explodeShip() {
  if (!state.ship.alive) return;
  state.ship.alive = false;
  state.ship.respawnTimer = 2.0;
  
  playSFX("shipDeath");
  state.screenShake = 24;
  state.flashTimer = 0.5;
  
  spawnExplosionParticles(state.ship.x, state.ship.y, 30);
  spawnDebris(state.ship.x, state.ship.y, "#7CFC00", 8, state.ship.vx, state.ship.vy);
  spawnShockwave(state.ship.x, state.ship.y, "#ffaa00");
  state.lives--;
  
  if (state.pod.attached) {
    state.pod.attached = false;
  }
}

export function explodePod() {
  if (!state.pod.alive) return;
  state.pod.alive = false;
  state.pod.attached = false;
  state.ship.respawnTimer = 2.0;

  playSFX("explosion");
  state.screenShake = 20;
  state.flashTimer = 0.4;

  spawnExplosionParticles(state.pod.x, state.pod.y, 25);
  spawnDebris(state.pod.x, state.pod.y, "#ffffff", 6, state.pod.vx, state.pod.vy);
  spawnShockwave(state.pod.x, state.pod.y, "#ffffff");
  state.lives--;
}

function triggerMeltdownExplosion() {
  explodeShip();
  showNotification("REAKTOR-KERNEXPLOSION!");
}

function updateProjectiles(dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    const nextX = p.x + p.vx;
    const nextY = p.y + p.vy;

    // Glowing trail embers behind every bullet
    if (Math.random() < 0.55) {
      const trailLife = 0.12 + Math.random() * 0.1;
      state.particles.push({
        x: p.x, y: p.y,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        color: p.enemy ? "#ff6644" : "#aaffff",
        life: trailLife, maxLife: trailLife, size: 0.7
      });
    }

    const hitTerrain = checkRaycastTerrain({ x: p.x, y: p.y }, { x: nextX, y: nextY });
    if (hitTerrain) {
      spawnSparks(hitTerrain.x, hitTerrain.y, p.enemy ? "#ff8866" : "#ffffff", 10);
      playSFX("projectileHit");
      state.projectiles.splice(i, 1);
      continue;
    }

    if (state.ship.alive && p.enemy) {
      const distShip = Math.sqrt((nextX - state.ship.x)**2 + (nextY - state.ship.y)**2);
      if (distShip < 6) {
        if (state.ship.shieldActive && state.ship.fuel > 0) {
          state.ship.fuel = Math.max(0, state.ship.fuel - 90);
          playSFX("shieldPing");
          state.screenShake = Math.max(state.screenShake, 3);
          spawnSparks(nextX, nextY, "#7CFC00", 6);
        } else {
          explodeShip();
        }
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    if (!p.enemy) {
      let hitEntity = false;
      for (const ent of state.entities) {
        if (!ent.active) continue;
        
        let size = 10;
        if (ent.type === "reactor") size = 18;
        if (ent.type === "switch") size = 8;
        
        const dist = Math.sqrt((nextX - ent.x)**2 + (nextY - ent.y)**2);
        if (dist < size) {
          hitEntity = true;
          ent.health--;
          spawnSparks(nextX, nextY, "#00ffff", 6);
          
          if (ent.type === "switch") {
            const linkId = ent.target;
            for (const other of state.entities) {
              if (other.type === "door" && other.trigger === linkId) {
                other.active = !other.active;
                playSFX("doorHiss");
                spawnSparks(other.x + (other.w || 8) / 2, other.y + (other.h || 80) / 2, "#ff5555", 14);
              }
            }
            spawnShockwave(ent.x, ent.y, "#00ffff");
            playSFX("select");
            buildCollisionGrid();
            showNotification("TÜR SCHALTUNG");
          }
          else if (ent.health <= 0) {
            ent.active = false;
            spawnExplosionParticles(ent.x, ent.y, 24);
            spawnDebris(ent.x, ent.y, ent.type === "reactor" ? "#7CFC00" : "#ff5500", 6, 0, 0);
            spawnShockwave(ent.x, ent.y, ent.type === "reactor" ? "#7CFC00" : "#ff5500");
            if (ent.type === "turret") {
              playSFX("turretDestroyed");
              state.score += 750;
              showNotification("+750 ABWEHRTURM");
            } 
            else if (ent.type === "fuel") {
              playSFX("explosion");
              showNotification("SPEICHER ZERSTÖRT!");
            }
            else if (ent.type === "reactor") {
              state.score += 1500;
              state.reactorTimer = 10.0;
              showNotification("REAKTOR OVERLOAD: 10 SEK!");
            }
            buildCollisionGrid();
          } else {
            playSFX("shieldPing");
          }
          break;
        }
      }
      if (hitEntity) {
        state.projectiles.splice(i, 1);
        continue;
      }
    }

    p.x = nextX;
    p.y = nextY;
    p.life -= dt;
    if (p.life <= 0) {
      state.projectiles.splice(i, 1);
    }
  }
}

function updateEntities(dt) {
  if (!state.ship.alive) {
    state.ship.tractorBeamActive = false;
    updateTractorSound(false, false, false);
    return;
  }

  let closestTractorTarget = null;
  let closestDist = 9999;
  let suckingActive = false;

  if (state.keys.shield && state.ship.fuel > 0) {
    state.ship.tractorBeamActive = true;
    
    for (const ent of state.entities) {
      if (ent.type === "fuel" && ent.active) {
        const dist = Math.sqrt((state.ship.x - ent.x)**2 + (state.ship.y - ent.y)**2);
        if (dist < 64 && dist < closestDist) {
          closestDist = dist;
          closestTractorTarget = ent;
        }
      }
    }

    if (!state.pod.attached && state.pod.alive) {
      const distPod = Math.sqrt((state.ship.x - state.pod.x)**2 + (state.ship.y - state.pod.y)**2);
      if (distPod < 36 && distPod < closestDist) {
        closestDist = distPod;
        closestTractorTarget = state.pod;
      }
    }

    state.ship.tractorTarget = closestTractorTarget;
  } else {
    state.ship.tractorBeamActive = false;
    state.ship.tractorTarget = null;
  }

  if (state.ship.tractorBeamActive && state.ship.tractorTarget) {
    const target = state.ship.tractorTarget;
    const dx = target.x - state.ship.x;
    const dy = target.y - state.ship.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (target.type === "fuel" && dist > 0) {
      suckingActive = true;
      const drain = Math.min(2.5, target.health * 100);
      state.ship.fuel = Math.min(state.activeLevel.fuel, state.ship.fuel + drain);
      target.health -= 0.02;
      
      if (target.health <= 0) {
        target.active = false;
        showNotification("TREIBSTOFF LEER!");
        state.ship.tractorTarget = null;
      }

      if (Math.random() < 0.15) playSFX("fuelCollected");
      spawnSparks(target.x, target.y - 4, "#7CFC00", 3);
      // Energy streaks flying from depot to ship
      if (Math.random() < 0.5) {
        const streakLife = 0.25;
        state.particles.push({
          x: target.x, y: target.y - 4,
          vx: (state.ship.x - target.x) * 0.045,
          vy: (state.ship.y - target.y) * 0.045,
          color: "#bfff80", life: streakLife, maxLife: streakLife, size: 1.1
        });
      }
    } 
    else if (target === state.pod && !state.pod.attached) {
      suckingActive = true;
      const pullForce = 0.065;
      const pullX = (dx / dist) * pullForce;
      const pullY = (dy / dist) * pullForce;
      
      state.pod.x -= pullX;
      state.pod.y -= pullY;

      if (dist < 29) {
        state.pod.attached = true;
        playSFX("podAttach");
        spawnSparks(state.pod.x, state.pod.y, "#00ffff", 12);
        spawnShockwave(state.pod.x, state.pod.y, "#00ffff");
        showNotification("PENDEL GEKOPPELT!");
        state.ship.tractorTarget = null;
      }
    }
  }

  updateTractorSound(state.ship.tractorBeamActive, suckingActive, state.ship.alive);

  for (const ent of state.entities) {
    if (ent.type === "turret" && ent.active) {
      const dx = state.ship.x - ent.x;
      const dy = state.ship.y - ent.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < 155) {
        const blocked = checkRaycastTerrain({ x: ent.x, y: ent.y }, { x: state.ship.x, y: state.ship.y });
        if (!blocked) {
          const targetAngle = Math.atan2(dy, dx);
          if (ent.angle === undefined) ent.angle = targetAngle;
          let diff = targetAngle - ent.angle;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          ent.angle += diff * 0.085;

          ent.bulletTimer += dt;
          if (ent.bulletTimer > 1.15) {
            ent.bulletTimer = 0;
            spawnSparks(ent.x + Math.cos(ent.angle) * 11, ent.y - 2 + Math.sin(ent.angle) * 11, "#ff8866", 4);

            const shootSpeed = 2.2;
            state.projectiles.push({
              x: ent.x + Math.cos(ent.angle) * 9,
              y: ent.y + Math.sin(ent.angle) * 9,
              vx: Math.cos(ent.angle) * shootSpeed,
              vy: Math.sin(ent.angle) * shootSpeed,
              enemy: true,
              life: 2.8
            });
            playSFX("turretShoot");
          }
        }
      }
    }
  }

  // exit win condition — inverted-gravity levels escape DOWNWARD past exitY
  const inv = !!state.activeLevel.invertedGravity;
  const escaped = inv
    ? state.ship.y > state.activeLevel.exitY
    : state.ship.y < state.activeLevel.exitY;
  if (state.ship.alive && escaped) {
    if (state.pod.attached || state.activeLevel.polygons.length === 0) {
      triggerLevelComplete();
    } else {
      showNotification("RETTE ERST DAS PENDEL!");
      state.ship.y = state.activeLevel.exitY + (inv ? -4 : 4);
    }
  }
}

function triggerLevelComplete() {
  state.gameState = STATE_LEVEL_COMPLETE;
  playSFX("levelComplete");
  
  const bonusFuel = Math.ceil(state.ship.fuel);
  const tetherBonus = state.pod.attached ? 2000 : 0;
  state.score += bonusFuel + tetherBonus;

  updateTractorSound(false, false, false);
  
  setTimeout(() => {
    state.activeCampaignIdx = (state.activeCampaignIdx + 1) % CAMPAIGN.length;
    if (state.activeCampaignIdx === 0) {
      showNotification("KAMPAGNE GESCHAFFT! NEUE RUNDE");
    }
    loadLevel(CAMPAIGN[state.activeCampaignIdx]);
    state.gameState = STATE_PLAYING;
  }, 3500);
}

export function getEditorWorldCoords(e) {
  const canvas = document.getElementById("gameCanvas");
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) / rect.width * 320;
  const clickY = (e.clientY - rect.top) / rect.height * 200;
  
  const worldX = state.editorCam.x + (clickX - 160) / state.editorScale;
  const worldY = state.editorCam.y + (clickY - 100) / state.editorScale;

  if (state.snapToGrid) {
    return {
      x: Math.round(worldX / state.editorGridSize) * state.editorGridSize,
      y: Math.round(worldY / state.editorGridSize) * state.editorGridSize
    };
  }
  return { x: worldX, y: worldY };
}

