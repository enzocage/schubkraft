export const STATE_TITLE = "TITLE";
export const STATE_PLAYING = "PLAYING";
export const STATE_LEVEL_COMPLETE = "LEVEL_COMPLETE";
export const STATE_GAME_OVER = "GAME_OVER";
export const STATE_EDITOR = "EDITOR";
export const STATE_HIGHSCORE = "HIGHSCORE";

export const THEMES = {
  c64: {
    terrain: "#8B4A52", hatch: 3, objects: "#7CFC00", hud: "#7CFC00", bg: "#000000", filled: false,
    edge: "#ff96a4",
    raster: ["#3a1d22", "#5a2e35", "#8B4A52", "#b35f6b", "#d98a94", "#b35f6b", "#8B4A52", "#5a2e35"]
  },
  inverted: {
    terrain: "#3CB043", hatch: 2, objects: "#FFFFFF", hud: "#FFFFFF", bg: "#000000", filled: true, fillColor: "#3CB043",
    edge: "#a6ffae",
    raster: ["#16451a", "#1f6326", "#2e8a35", "#3CB043", "#5ed967", "#3CB043", "#2e8a35", "#1f6326"]
  },
  bbc: {
    terrain: "#E03020", hatch: 0, objects: "#7CFC00", hud: "#7CFC00", bg: "#000000", filled: false,
    edge: "#ff8a70",
    raster: ["#4a100a", "#7a1c10", "#a82618", "#E03020", "#ff6a4a", "#E03020", "#a82618", "#7a1c10"]
  }
};

export const TITLE_MENU_ITEMS = ["SPIELEN", "KAMPAGNE SELECT", "LEVEL EDITOR", "HIGHSCORES"];

// ============================================================================
// CAMPAIGN — redesigned for guaranteed solvability:
// - every shaft keeps a gap of at least ~140px so ship + towed pod fit through
// - switches always sit on the approach side (above) of the door they open
// - doors span the full shaft width (no pointless bypasses)
// - inverted-gravity levels escape DOWNWARD (exitY near the bottom, the exit
//   check direction flips in physics.js)
// ============================================================================
export const CAMPAIGN = [
  {
    name: "FIRST DESCENT",
    theme: "c64",
    gravity: 0.018,
    fuel: 5000,
    spawn: { x: 320, y: 60 },
    exitY: 45,
    polygons: [
      [[0,0],[220,0],[200,150],[230,300],[200,450],[230,600],[200,750],[0,750]],
      [[640,0],[420,0],[440,150],[410,300],[440,450],[410,600],[440,750],[640,750]],
      [[280,700],[360,700],[345,715],[295,715]]
    ],
    entities: [
      { type: "pod", x: 320, y: 685 },
      { type: "fuel", x: 260, y: 420 },
      { type: "turret", x: 435, y: 295, angle: Math.PI },
      { type: "reactor", x: 390, y: 690 }
    ]
  },
  {
    name: "SERPENT SHAFT",
    theme: "c64",
    gravity: 0.021,
    fuel: 4800,
    spawn: { x: 320, y: 60 },
    exitY: 45,
    polygons: [
      [[0,0],[240,0],[160,150],[280,300],[160,450],[280,600],[200,780],[0,780]],
      [[640,0],[460,0],[380,150],[500,300],[380,450],[500,600],[420,780],[640,780]],
      [[280,730],[360,730],[345,745],[295,745]]
    ],
    entities: [
      { type: "pod", x: 320, y: 715 },
      { type: "fuel", x: 210, y: 160 },
      { type: "fuel", x: 340, y: 460 },
      { type: "turret", x: 285, y: 310, angle: 0 },
      { type: "turret", x: 375, y: 460, angle: Math.PI },
      { type: "reactor", x: 430, y: 700 }
    ]
  },
  {
    name: "EMERALD MINES",
    theme: "inverted",
    gravity: 0.022,
    fuel: 5200,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[210,0],[190,200],[210,400],[190,600],[210,780],[0,780]],
      [[640,0],[430,0],[450,200],[430,400],[450,600],[430,780],[640,780]],
      [[280,730],[360,730],[345,745],[295,745]]
    ],
    entities: [
      { type: "pod", x: 320, y: 715 },
      { type: "switch", x: 320, y: 370, target: "em1" },
      { type: "door", x: 195, y: 430, w: 240, h: 6, trigger: "em1" },
      { type: "fuel", x: 240, y: 520 },
      { type: "fuel", x: 400, y: 250 },
      { type: "turret", x: 200, y: 210, angle: 0 },
      { type: "turret", x: 445, y: 590, angle: Math.PI },
      { type: "reactor", x: 380, y: 650 }
    ]
  },
  {
    name: "BBC RUN",
    theme: "bbc",
    gravity: 0.024,
    fuel: 5200,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[230,0],[170,180],[260,360],[170,540],[250,720],[200,780],[0,780]],
      [[640,0],[450,0],[390,180],[480,360],[390,540],[470,720],[420,780],[640,780]],
      [[280,735],[360,735],[345,750],[295,750]]
    ],
    entities: [
      { type: "pod", x: 320, y: 720 },
      { type: "fuel", x: 320, y: 300 },
      { type: "fuel", x: 320, y: 560 },
      { type: "turret", x: 175, y: 190, angle: 0 },
      { type: "turret", x: 475, y: 365, angle: Math.PI },
      { type: "turret", x: 175, y: 545, angle: 0 },
      { type: "reactor", x: 390, y: 690 }
    ]
  },
  {
    name: "TWIN POCKETS",
    theme: "c64",
    gravity: 0.025,
    fuel: 5600,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[220,0],[190,160],[240,320],[140,480],[240,640],[190,800],[0,800]],
      [[640,0],[440,0],[470,160],[420,320],[520,480],[420,640],[470,800],[640,800]],
      [[280,750],[360,750],[345,765],[295,765]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "switch", x: 320, y: 440, target: "tp1" },
      { type: "door", x: 150, y: 500, w: 350, h: 6, trigger: "tp1" },
      { type: "fuel", x: 175, y: 470 },
      { type: "fuel", x: 480, y: 470 },
      { type: "turret", x: 245, y: 330, angle: 0 },
      { type: "turret", x: 415, y: 650, angle: Math.PI },
      { type: "reactor", x: 410, y: 710 }
    ]
  },
  {
    name: "SKYFALL",
    theme: "inverted",
    gravity: 0.022,
    invertedGravity: true,
    fuel: 5600,
    spawn: { x: 320, y: 680 },
    exitY: 720,
    polygons: [
      [[0,0],[210,0],[230,150],[190,300],[230,450],[200,600],[220,760],[0,760]],
      [[640,0],[430,0],[410,150],[450,300],[410,450],[440,600],[420,760],[640,760]],
      [[280,95],[360,95],[345,110],[295,110]]
    ],
    entities: [
      { type: "pod", x: 320, y: 125 },
      { type: "fuel", x: 250, y: 350 },
      { type: "fuel", x: 400, y: 500 },
      { type: "turret", x: 235, y: 460, angle: 0 },
      { type: "turret", x: 405, y: 160, angle: Math.PI },
      { type: "reactor", x: 320, y: 200 }
    ]
  },
  {
    name: "THE FORTRESS",
    theme: "c64",
    gravity: 0.027,
    fuel: 6000,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[210,0],[180,200],[220,400],[180,600],[220,800],[0,800]],
      [[640,0],[430,0],[460,200],[420,400],[460,600],[420,800],[640,800]],
      [[280,750],[360,750],[345,765],[295,765]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "fuel", x: 320, y: 300 },
      { type: "fuel", x: 320, y: 500 },
      { type: "turret", x: 185, y: 210, angle: 0 },
      { type: "turret", x: 455, y: 210, angle: Math.PI },
      { type: "turret", x: 185, y: 610, angle: 0 },
      { type: "turret", x: 455, y: 610, angle: Math.PI },
      { type: "reactor", x: 380, y: 720 }
    ]
  },
  {
    name: "DOUBLE LOCK",
    theme: "bbc",
    gravity: 0.026,
    fuel: 6400,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[215,0],[195,250],[215,500],[195,800],[0,800]],
      [[640,0],[425,0],[445,250],[425,500],[445,800],[640,800]],
      [[280,750],[360,750],[345,765],[295,765]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "switch", x: 320, y: 240, target: "dl1" },
      { type: "door", x: 190, y: 300, w: 260, h: 6, trigger: "dl1" },
      { type: "switch", x: 320, y: 500, target: "dl2" },
      { type: "door", x: 190, y: 560, w: 260, h: 6, trigger: "dl2" },
      { type: "fuel", x: 250, y: 400 },
      { type: "fuel", x: 390, y: 650 },
      { type: "turret", x: 200, y: 510, angle: 0 },
      { type: "turret", x: 440, y: 260, angle: Math.PI },
      { type: "reactor", x: 390, y: 700 }
    ]
  },
  {
    name: "DEEP HEAVY",
    theme: "inverted",
    gravity: 0.030,
    fuel: 7200,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[230,0],[200,200],[240,400],[200,600],[240,800],[0,800]],
      [[640,0],[410,0],[440,200],[400,400],[440,600],[400,800],[640,800]],
      [[280,750],[360,750],[345,765],[295,765]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "fuel", x: 320, y: 300 },
      { type: "fuel", x: 320, y: 520 },
      { type: "fuel", x: 290, y: 700 },
      { type: "turret", x: 205, y: 210, angle: 0 },
      { type: "turret", x: 395, y: 410, angle: Math.PI },
      { type: "turret", x: 435, y: 610, angle: Math.PI },
      { type: "reactor", x: 350, y: 700 }
    ]
  },
  {
    name: "PRESSURE DROP",
    theme: "bbc",
    gravity: 0.028,
    fuel: 6800,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[225,0],[245,180],[195,360],[245,540],[205,720],[225,800],[0,800]],
      [[640,0],[415,0],[395,180],[445,360],[395,540],[435,720],[415,800],[640,800]],
      [[280,750],[360,750],[345,765],[295,765]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "switch", x: 320, y: 330, target: "pd1" },
      { type: "door", x: 190, y: 400, w: 260, h: 6, trigger: "pd1" },
      { type: "fuel", x: 320, y: 250 },
      { type: "fuel", x: 320, y: 620 },
      { type: "turret", x: 250, y: 190, angle: 0 },
      { type: "turret", x: 390, y: 550, angle: Math.PI },
      { type: "turret", x: 210, y: 730, angle: 0 },
      { type: "reactor", x: 300, y: 690 }
    ]
  },
  {
    name: "ANTIGRAV CORE",
    theme: "c64",
    gravity: 0.024,
    invertedGravity: true,
    fuel: 6800,
    spawn: { x: 320, y: 690 },
    exitY: 725,
    polygons: [
      [[0,0],[220,0],[200,160],[240,320],[200,480],[240,640],[210,760],[0,760]],
      [[640,0],[420,0],[440,160],[400,320],[440,480],[400,640],[430,760],[640,760]],
      [[280,95],[360,95],[345,110],[295,110]]
    ],
    entities: [
      { type: "pod", x: 320, y: 125 },
      { type: "reactor", x: 320, y: 210 },
      { type: "turret", x: 245, y: 330, angle: 0 },
      { type: "turret", x: 395, y: 330, angle: Math.PI },
      { type: "turret", x: 245, y: 650, angle: 0 },
      { type: "fuel", x: 320, y: 420 },
      { type: "fuel", x: 250, y: 560 }
    ]
  },
  {
    name: "FINAL REDOUBT",
    theme: "c64",
    gravity: 0.032,
    fuel: 8000,
    spawn: { x: 320, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0],[240,0],[200,180],[250,360],[190,540],[250,720],[210,800],[0,800]],
      [[640,0],[400,0],[440,180],[390,360],[450,540],[390,720],[430,800],[640,800]],
      [[280,750],[360,750],[345,765],[295,765]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "switch", x: 320, y: 500, target: "fr1" },
      { type: "door", x: 185, y: 580, w: 270, h: 6, trigger: "fr1" },
      { type: "turret", x: 205, y: 190, angle: 0 },
      { type: "turret", x: 435, y: 190, angle: Math.PI },
      { type: "turret", x: 255, y: 370, angle: 0 },
      { type: "turret", x: 385, y: 370, angle: Math.PI },
      { type: "turret", x: 195, y: 550, angle: 0 },
      { type: "fuel", x: 320, y: 260 },
      { type: "fuel", x: 320, y: 460 },
      { type: "fuel", x: 320, y: 660 },
      { type: "reactor", x: 320, y: 775 }
    ]
  }
];

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
  textPromptTimer: 0,
  textPromptMessage: "",
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

  editorHoveredVertex: null,
  editorHoveredEntity: null,
  editorDraggingVertex: null,
  editorDraggingEntity: null,

  editorHistory: [],
  editorLevelCopy: null
};
