// ============================================================================
// KI LEVEL GENERATOR
// Procedurally builds Schubkraft-style cave systems for the editor.
// A meandering centerline is carved downward, then turned into two wall
// polygons + floor + pod pedestal. Entities follow the same solvability
// rules as the hand-made campaign:
// - the corridor never gets narrower than minGap (ship + towed pod fit)
// - switches always sit on the approach side (above) of the door they open
// - doors span the full local shaft width
// - turrets sit flush on the walls (left wall: angle 0, right wall: PI)
// ============================================================================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = (rng, min, max) => min + rng() * (max - min);
const rndInt = (rng, min, max) => Math.round(rnd(rng, min, max));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function shuffle(rng, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const DIFFICULTY_PRESETS = {
  easy: {
    label: "LEICHT",
    worldW: 640,
    depth: [560, 780],
    stepY: [110, 150],
    width: [210, 290],
    cavernWidth: [330, 420],
    meander: 80,
    cavernChance: 0.30,
    turrets: [1, 2],
    fuels: [2, 3],
    doors: [0, 0],
    gravity: [0.014, 0.019],
    fuel: [5200, 6000],
    minGap: 200,
    allowIslands: false,
    turretPairs: false
  },
  medium: {
    label: "MITTEL",
    worldW: 820,
    depth: [1050, 1450],
    stepY: [110, 160],
    width: [180, 250],
    cavernWidth: [300, 400],
    meander: 130,
    cavernChance: 0.32,
    turrets: [3, 5],
    fuels: [3, 4],
    doors: [0, 1],
    gravity: [0.021, 0.026],
    fuel: [5800, 6600],
    minGap: 175,
    allowIslands: true,
    turretPairs: false
  },
  hard: {
    label: "SCHWER",
    worldW: 1100,
    depth: [1900, 2700],
    stepY: [100, 160],
    width: [160, 230],
    cavernWidth: [290, 400],
    meander: 180,
    cavernChance: 0.36,
    turrets: [7, 11],
    fuels: [4, 6],
    doors: [1, 3],
    gravity: [0.026, 0.032],
    fuel: [7200, 8600],
    minGap: 155,
    allowIslands: true,
    turretPairs: true
  }
};

// Cave archetypes flavour the centerline so the 20 suggestions feel distinct
const ARCHETYPES = [
  { id: "SERPENTINE",    meanderMul: 1.00, cavernMul: 1.0, widthMul: 1.00, swing: "alternate" },
  { id: "ZICKZACK-MINE", meanderMul: 1.25, cavernMul: 0.7, widthMul: 0.95, swing: "alternate" },
  { id: "STURZ-SCHACHT", meanderMul: 0.35, cavernMul: 0.6, widthMul: 0.90, swing: "random" },
  { id: "HOEHLEN-KETTE", meanderMul: 0.80, cavernMul: 1.8, widthMul: 0.90, swing: "random" },
  { id: "GROSSE GROTTE", meanderMul: 0.70, cavernMul: 1.0, widthMul: 1.05, swing: "random", megaCavern: true },
  { id: "IRRGARTEN",     meanderMul: 1.10, cavernMul: 1.1, widthMul: 1.00, swing: "drift" }
];

const NAME_A = [
  "CRIMSON", "NEON", "OBSIDIAN", "EMERALD", "SOLAR", "PHANTOM", "VOID",
  "COBALT", "TITAN", "OMEGA", "DELTA", "HOLLOW", "FERAL", "STATIC",
  "BINARY", "PLASMA", "LUNAR", "RUSTED", "GAMMA", "SHADOW", "IRON", "AMBER"
];
const NAME_B = [
  "DESCENT", "CHASM", "SHAFT", "GROTTO", "MINES", "ABYSS", "CAVERN",
  "DEPTHS", "TRENCH", "PIT", "CATACOMB", "VAULT", "RIFT", "CORE",
  "LABYRINTH", "HOLLOWS", "FISSURE", "WELL", "GORGE", "CRYPT"
];

// Build one wall polyline from the centerline nodes. Node points keep the
// exact corridor gap; intermediate points only jitter OUTWARD (away from the
// corridor) so the guaranteed minimum gap is never violated.
function wallPoints(nodes, side, rng) {
  const pts = [];
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const ax = n.x + side * n.w / 2;
    pts.push([Math.round(ax), Math.round(n.y)]);
    const nx = nodes[i + 1];
    if (nx) {
      const bx = nx.x + side * nx.w / 2;
      const subs = 1 + Math.floor(rng() * 2);
      for (let s = 1; s <= subs; s++) {
        const t = s / (subs + 1);
        pts.push([
          Math.round(ax + (bx - ax) * t + side * rng() * 26),
          Math.round(n.y + (nx.y - n.y) * t + (rng() - 0.5) * 14)
        ]);
      }
    }
  }
  return pts;
}

export function generateLevel(difficulty, seed) {
  const cfg = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.medium;
  return generateFromConfig(cfg, seed);
}

export function generateFromConfig(cfg, seed) {
  const rng = mulberry32(seed);
  const arch = pick(rng, ARCHETYPES);

  const worldW = cfg.worldW;
  const margin = 60;
  const maxNodeW = worldW - 2 * margin - 30;
  const minGap = cfg.minGap;
  const baseWidth = () =>
    clamp(rnd(rng, cfg.width[0], cfg.width[1]) * arch.widthMul, minGap, maxNodeW);
  const cavernWidth = () =>
    clamp(rnd(rng, cfg.cavernWidth[0], cfg.cavernWidth[1]) * arch.widthMul, minGap, maxNodeW);

  // --- 1. Meandering centerline from the surface opening down to the target depth
  const targetDepth = rndInt(rng, cfg.depth[0], cfg.depth[1]);
  const nodes = [];
  let x = worldW / 2 + (rng() - 0.5) * worldW * 0.2;
  let y = 0;
  let dir = rng() < 0.5 ? -1 : 1;
  let drift = (rng() - 0.5) * 2;

  const firstW = baseWidth();
  x = clamp(x, firstW / 2 + margin, worldW - firstW / 2 - margin);
  nodes.push({ x, y: 0, w: firstW, cavern: false });

  // stop the walk early: the last step + pod chamber add ~280px, so the
  // final depth lands close to targetDepth instead of overshooting it
  while (y < targetDepth - 280) {
    const stepY = rnd(rng, cfg.stepY[0], cfg.stepY[1]);
    y += stepY;
    const m = cfg.meander * arch.meanderMul;
    let dx;
    if (arch.swing === "alternate") {
      dx = dir * rnd(rng, 0.55, 1.0) * m;
      dir = -dir;
    } else if (arch.swing === "drift") {
      drift = clamp(drift + (rng() - 0.5) * 1.2, -1, 1);
      dx = drift * m;
    } else {
      dx = (rng() * 2 - 1) * m;
    }
    // slope cap keeps the perpendicular gap from pinching on diagonals
    dx = clamp(dx, -stepY * 1.05, stepY * 1.05);
    x += dx;

    const isCavern = rng() < cfg.cavernChance * arch.cavernMul;
    const w = isCavern ? cavernWidth() : baseWidth();
    x = clamp(x, w / 2 + margin, worldW - w / 2 - margin);
    nodes.push({ x, y, w, cavern: isCavern });
  }

  // GROSSE GROTTE: blow one mid node up into a huge chamber
  if (arch.megaCavern && nodes.length > 5) {
    const n = nodes[Math.floor(nodes.length / 2)];
    n.w = clamp(n.w * 2.1, minGap, maxNodeW);
    n.cavern = true;
    n.x = clamp(n.x, n.w / 2 + margin, worldW - n.w / 2 - margin);
  }

  // --- 2. Pod chamber at the very bottom
  const chamberW = clamp(rnd(rng, cfg.cavernWidth[0], cfg.cavernWidth[1]) * 1.15, minGap + 60, maxNodeW);
  const chamberY = y + Math.max(150, rnd(rng, cfg.stepY[0], cfg.stepY[1]));
  const chamberX = clamp(nodes[nodes.length - 1].x, chamberW / 2 + margin, worldW - chamberW / 2 - margin);
  const chamber = { x: chamberX, y: chamberY, w: chamberW, cavern: true, chamber: true };
  nodes.push(chamber);
  const depth = Math.round(chamberY);

  // --- 3. Terrain polygons: left wall, right wall, floor slab, pedestal
  const polygons = [];
  const leftPts = wallPoints(nodes, -1, rng);
  const rightPts = wallPoints(nodes, +1, rng);
  polygons.push([[0, 0], ...leftPts, [0, depth]]);
  polygons.push([[worldW, 0], ...rightPts, [worldW, depth]]);
  polygons.push([[0, depth], [worldW, depth], [worldW, depth + 50], [0, depth + 50]]);

  const px = Math.round(chamber.x + (rng() - 0.5) * chamber.w * 0.25);
  polygons.push([
    [px - 42, depth - 15], [px + 42, depth - 15],
    [px + 30, depth], [px - 30, depth]
  ]);

  const interior = [];
  for (let i = 1; i < nodes.length - 1; i++) interior.push(i);

  // Floating rock islands inside very wide caverns (split corridor stays >= 120 per side)
  if (cfg.allowIslands) {
    for (const i of interior) {
      const n = nodes[i];
      if (!n.cavern || n.w < 350 || rng() > 0.55) continue;
      const iw = rnd(rng, 50, 80);
      const ih = rnd(rng, 18, 30);
      const ix = n.x + (rng() - 0.5) * 30;
      polygons.push([
        [Math.round(ix - iw / 2), Math.round(n.y)],
        [Math.round(ix), Math.round(n.y - ih / 2)],
        [Math.round(ix + iw / 2), Math.round(n.y)],
        [Math.round(ix), Math.round(n.y + ih / 2)]
      ]);
      n.island = true;
    }
  }

  // --- 4. Entities
  const entities = [];
  entities.push({ type: "pod", x: px, y: depth - 30 });

  let rx = px + (rng() < 0.5 ? -1 : 1) * rnd(rng, 70, 120);
  rx = clamp(rx, chamber.x - chamber.w / 2 + 35, chamber.x + chamber.w / 2 - 35);
  if (Math.abs(rx - px) < 55) rx = px + (rx >= px ? 55 : -55);
  entities.push({ type: "reactor", x: Math.round(rx), y: depth - 18 });

  // Doors: span the exact node gap, switch always above (approach side)
  const doorTarget = rndInt(rng, cfg.doors[0], cfg.doors[1]);
  const doorIdxs = [];
  for (const i of shuffle(rng, interior.filter(i => i >= 2))) {
    if (doorIdxs.length >= doorTarget) break;
    if (doorIdxs.every(d => Math.abs(d - i) >= 2)) doorIdxs.push(i);
  }
  doorIdxs.sort((a, b) => a - b);
  doorIdxs.forEach((ni, k) => {
    const n = nodes[ni];
    const prev = nodes[ni - 1];
    const id = "gen" + (k + 1);
    entities.push({
      type: "door",
      x: Math.round(n.x - n.w / 2), y: Math.round(n.y) - 3,
      w: Math.round(n.w), h: 6,
      trigger: id
    });
    const lo = Math.max(prev.x - prev.w / 2, n.x - n.w / 2) + 55;
    const hi = Math.min(prev.x + prev.w / 2, n.x + n.w / 2) - 55;
    let sx = (prev.x + n.x) / 2 + (rng() - 0.5) * 40;
    sx = lo < hi ? clamp(sx, lo, hi) : n.x;
    entities.push({
      type: "switch",
      x: Math.round(sx), y: Math.round(n.y - rnd(rng, 60, 100)),
      target: id
    });
  });

  // Turrets: flush on walls at chokepoints; hard caverns may get a pair
  const turretTarget = rndInt(rng, cfg.turrets[0], cfg.turrets[1]);
  let placed = 0;
  for (const i of shuffle(rng, interior.filter(i => !doorIdxs.includes(i)))) {
    if (placed >= turretTarget) break;
    const n = nodes[i];
    const pair = cfg.turretPairs && n.cavern && turretTarget - placed >= 2 && rng() < 0.5;
    const sides = pair ? [-1, 1] : [rng() < 0.5 ? -1 : 1];
    for (const side of sides) {
      entities.push({
        type: "turret",
        x: Math.round(n.x + side * (n.w / 2 - 7)),
        y: Math.round(n.y),
        angle: side === -1 ? 0 : Math.PI
      });
      placed++;
    }
  }

  // Fuel pods: prefer caverns, keep clear of wall margins and islands
  const fuelTarget = rndInt(rng, cfg.fuels[0], cfg.fuels[1]);
  const fuelOrder = shuffle(rng, interior.filter(i => nodes[i].cavern))
    .concat(shuffle(rng, interior.filter(i => !nodes[i].cavern)));
  for (let k = 0; k < fuelTarget && k < fuelOrder.length; k++) {
    const n = nodes[fuelOrder[k]];
    let fx = n.x + (rng() - 0.5) * (n.w - 110);
    if (n.island) fx = n.x + (fx < n.x ? -1 : 1) * Math.max(75, Math.abs(fx - n.x));
    fx = clamp(fx, n.x - n.w / 2 + 50, n.x + n.w / 2 - 50);
    entities.push({ type: "fuel", x: Math.round(fx), y: Math.round(n.y - rnd(rng, 0, 22)) });
  }

  // --- 5. Level header
  const level = {
    name: pick(rng, NAME_A) + " " + pick(rng, NAME_B),
    theme: pick(rng, ["c64", "inverted", "bbc"]),
    gravity: Math.round(rnd(rng, cfg.gravity[0], cfg.gravity[1]) * 1000) / 1000,
    fuel: Math.round(rnd(rng, cfg.fuel[0], cfg.fuel[1]) / 100) * 100,
    spawn: { x: Math.round(nodes[0].x), y: 60 },
    exitY: 45,
    polygons,
    entities
  };

  const meta = {
    archetype: arch.id,
    difficultyLabel: cfg.label,
    seed,
    depth,
    worldW,
    turrets: entities.filter(e => e.type === "turret").length,
    fuels: entities.filter(e => e.type === "fuel").length,
    doors: entities.filter(e => e.type === "door").length
  };

  return { level, meta };
}

export function generateLevelSuggestions(difficulty, count = 20) {
  const out = [];
  const base = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  for (let i = 0; i < count; i++) {
    out.push(generateLevel(difficulty, (base + i * 0x9E3779B9) >>> 0));
  }
  return out;
}

// ============================================================================
// Campaign generation: difficulty smoothly interpolated from easy to hard.
// t = 0 -> easy preset, t = 0.5 -> medium, t = 1 -> hard.
// ============================================================================

const lerp = (a, b, u) => a + (b - a) * u;
const lerpRange = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
const lerpRangeInt = (a, b, u) => [Math.round(lerp(a[0], b[0], u)), Math.round(lerp(a[1], b[1], u))];

export function campaignConfig(t) {
  const P = DIFFICULTY_PRESETS;
  const [a, b, u] = t < 0.5 ? [P.easy, P.medium, t * 2] : [P.medium, P.hard, (t - 0.5) * 2];
  return {
    label: t < 1 / 3 ? "LEICHT" : t < 2 / 3 ? "MITTEL" : "SCHWER",
    worldW: Math.round(lerp(a.worldW, b.worldW, u)),
    depth: lerpRangeInt(a.depth, b.depth, u),
    stepY: lerpRangeInt(a.stepY, b.stepY, u),
    width: lerpRangeInt(a.width, b.width, u),
    cavernWidth: lerpRangeInt(a.cavernWidth, b.cavernWidth, u),
    meander: lerp(a.meander, b.meander, u),
    cavernChance: lerp(a.cavernChance, b.cavernChance, u),
    turrets: lerpRangeInt(a.turrets, b.turrets, u),
    fuels: lerpRangeInt(a.fuels, b.fuels, u),
    doors: lerpRangeInt(a.doors, b.doors, u),
    gravity: lerpRange(a.gravity, b.gravity, u),
    fuel: lerpRangeInt(a.fuel, b.fuel, u),
    minGap: Math.round(lerp(a.minGap, b.minGap, u)),
    allowIslands: t > 0.3,
    turretPairs: t > 0.75
  };
}

// Deterministic campaign from a list of vetted seeds, ascending difficulty.
export function generateCampaign(seeds) {
  const themes = ["c64", "inverted", "bbc"];
  return seeds.map((seed, i) => {
    const t = seeds.length === 1 ? 0 : i / (seeds.length - 1);
    const cfg = campaignConfig(t);
    const { level } = generateFromConfig(cfg, seed);
    level.theme = themes[i % 3];
    level.difficulty = cfg.label;
    return level;
  });
}
