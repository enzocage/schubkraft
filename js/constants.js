export const STATE_TITLE = "TITLE";
export const STATE_PLAYING = "PLAYING";
export const STATE_LEVEL_COMPLETE = "LEVEL_COMPLETE";
export const STATE_GAME_OVER = "GAME_OVER";
export const STATE_EDITOR = "EDITOR";
export const STATE_HIGHSCORE = "HIGHSCORE";

export const THEMES = {
  c64: {
    terrain: "#c02840", hatch: 4, objects: "#7CFC00", hud: "#7CFC00", bg: "#000000", filled: false,
    edge: "#ff6090",
    raster: ["#4a1020", "#7a1a30", "#c02840", "#e84060", "#ff7090", "#e84060", "#c02840", "#7a1a30"]
  },
  inverted: {
    terrain: "#20d050", hatch: 3, objects: "#FFFFFF", hud: "#FFFFFF", bg: "#000000", filled: true, fillColor: "#20d050",
    edge: "#80ffa0",
    raster: ["#0a3010", "#105a1a", "#20d050", "#40e070", "#80ffa0", "#40e070", "#20d050", "#105a1a"]
  },
  bbc: {
    terrain: "#ff4020", hatch: 2, objects: "#7CFC00", hud: "#7CFC00", bg: "#000000", filled: false,
    edge: "#ff9070",
    raster: ["#3a0a00", "#7a1a08", "#c03018", "#ff4020", "#ff8060", "#ff4020", "#c03018", "#7a1a08"]
  }
};

export const TITLE_MENU_ITEMS = ["SPIELEN", "KAMPAGNE SELECT", "LEVEL EDITOR", "HIGHSCORES"];

// ============================================================================
// CAMPAIGN — loaded at startup from the /levels folder (plain level JSON).
// levels/manifest.json lists the playable files in campaign order; any level
// dropped into the folder and added to the manifest appears automatically in
// KAMPAGNE SELECT. Custom levels saved from the KI generator are appended
// from localStorage. Regenerate the 15 originals: node tools/export-campaign.mjs
// ============================================================================
export const CAMPAIGN = [];

export const CUSTOM_LEVELS_KEY = "schubkraft_custom_levels";

export async function loadCampaignLevels() {
  CAMPAIGN.length = 0;
  try {
    const manifest = await (await fetch("levels/manifest.json?ts=" + Date.now())).json();
    const loaded = await Promise.all(
      manifest.map(f => fetch("levels/" + f).then(r => r.json()))
    );
    CAMPAIGN.push(...loaded);
  } catch (err) {
    console.error("Kampagnen-Level konnten nicht geladen werden:", err);
  }
  // Custom levels saved from the KI generator (browser can't write to disk,
  // so accepted levels persist in localStorage and join the campaign here)
  try {
    const customs = JSON.parse(localStorage.getItem(CUSTOM_LEVELS_KEY) || "[]");
    for (const lvl of customs) {
      lvl.custom = true;
      CAMPAIGN.push(lvl);
    }
  } catch (err) {}
  return CAMPAIGN;
}

export const state = {
  gameState: STATE_TITLE,
  lastGameState: STATE_TITLE,
  paused: false,
  activeCampaignIdx: 0,
  activeLevel: null,
  score: 0,
  lives: 3,
  reactorTimer: 0,
  screenShake: 0,
  flashTimer: 0,
  transitionTimer: 0,
  transitionVariant: 0,
  textPromptTimer: 0,
  textPromptMessage: "",
  musicTitleTimer: 0,
  musicTitleMessage: "",
  stars: [],
  highscores: [
    { name: "SBY", score: 15000 },
    { name: "JCH", score: 9800 },
    { name: "THR", score: 6500 },
    { name: "C64", score: 3000 },
    { name: "PIL", score: 1200 }
  ],
  hsNewName: "AAA",
  hsNameIndex: 0,
  titleMenuIndex: 0,
  useBloom: true,
  rotateMoon: 0,
  musicEnabled: true,
  musicVolume: 1.00,
  sfxEnabled: true,

  ship: {
    x: 0, y: 0,
    oldX: 0, oldY: 0,
    vx: 0, vy: 0,
    angle: -Math.PI / 2,
    visualAngle: -Math.PI / 2,
    fuel: 1000,
    shieldActive: false,
    alive: true,
    respawnTimer: 0,
    tractorBeamActive: false,
    tractorTarget: null
  },

  pod: {
    x: 0, y: 0,
    oldX: 0, oldY: 0,
    vx: 0, vy: 0,
    attached: false,
    alive: true
  },

  entities: [],
  projectiles: [],
  particles: [],
  shockwaves: [],
  debris: [],
  scorePopups: [],
  shipTrail: [],
  levelIntroTimer: 0,
  levelIntroName: "",
  stateEnterTime: 0,
  cam: { x: 0, y: 0 },
  collisionGrid: {},
  bakedTerrainCanvas: null,

  keys: { rotateLeft: false, rotateRight: false, thrust: false, fire: false, shield: false, shieldReal: false, wHoldTime: 0 },
  lastFireTime: 0,
  touchState: {
    leftActive: false, leftStartX: 0, leftCurrentX: 0,
    rightThrust: false, rightFire: false, rightShield: false
  },

  editorCam: { x: 320, y: 400 },
  editorMode: "poly",
  snapToGrid: true,
  editorGridSize: 8,
  editorScale: 1.0,
  editorPanning: false,
  editorPanStartCam: { x: 0, y: 0 },
  editorPanStartMouse: { x: 0, y: 0 },
  editorSelectedEntity: null,
  activePolygon: [],
  selectedEntityPreset: "fuel",

  editorHistory: [],
  editorRedoHistory: [],
  editorLevelCopy: null,
  editorShowGridDots: true,
  editorSelectedPoly: null,
  editorHoveredPoly: null,
  editorDraggingPoly: null,
  editorLastMousePos: { x: 0, y: 0 }
};

export const MP3_PLAYLIST = [
  "enzo_cage_stone_statue.mp3",
  "enzo_cage_inner_switch.mp3",
  "enzo_cage_convergence.mp3",
  "enzo_cage_silence.mp3",
  "enzo_cage_hypnos.mp3",
  "enzo_cage_1984_koyaanisquatsi.mp3",
  "enzo_cage_ion.mp3",
  "enzo_cage_ohm.mp3",
  "enzo_cage_tsing_yi.mp3",
  "enzo_cage_spellbound.mp3",
  "enzo_cage_private_traps.mp3",
  "enzo_cage_equilibrium.mp3",
  "enzo_cage_neon.mp3",
  "enzo_cage_mea.mp3",
  "enzo_cage_in_der_nacht.mp3",
  "enzo_cage_true_peace.mp3",
  "enzo_cage_quecksilber.mp3"
];
