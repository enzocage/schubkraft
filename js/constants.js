export const STATE_TITLE = "TITLE";
export const STATE_PLAYING = "PLAYING";
export const STATE_LEVEL_COMPLETE = "LEVEL_COMPLETE";
export const STATE_GAME_OVER = "GAME_OVER";
export const STATE_EDITOR = "EDITOR";
export const STATE_HIGHSCORE = "HIGHSCORE";

export const THEMES = {
  c64: { terrain: "#8B4A52", hatch: 3, objects: "#7CFC00", hud: "#7CFC00", bg: "#000000", filled: false },
  inverted: { terrain: "#3CB043", hatch: 2, objects: "#FFFFFF", hud: "#FFFFFF", bg: "#000000", filled: true, fillColor: "#3CB043" },
  bbc: { terrain: "#E03020", hatch: 0, objects: "#7CFC00", hud: "#7CFC00", bg: "#000000", filled: false }
};

export const TITLE_MENU_ITEMS = ["SPIELEN", "KAMPAGNE SELECT", "LEVEL EDITOR", "HIGHSCORES"];

export const CAMPAIGN = [
  {
    name: "VALLEY OF THE GIANTS",
    theme: "c64",
    gravity: 0.020,
    fuel: 4800,
    spawn: { x: 160, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0], [100,0], [90,90], [50,150], [30,280], [70,390], [130,440], [90,520], [180,620], [220,700], [0,700]],
      [[640,0], [450,0], [400,120], [440,240], [390,380], [550,490], [490,620], [540,680], [640,700]],
      [[240,160], [340,140], [360,200], [260,230]],
      [[250, 660], [350, 660], [330, 680], [270, 680]]
    ],
    entities: [
      { type: "pod", x: 300, y: 645 },
      { type: "fuel", x: 130, y: 485 },
      { type: "turret", x: 420, y: 350, angle: Math.PI },
      { type: "turret", x: 230, y: 220, angle: 0 },
      { type: "reactor", x: 500, y: 660 }
    ]
  },
  {
    name: "THE EMERALD SHAFT",
    theme: "inverted",
    gravity: 0.024,
    fuel: 4000,
    spawn: { x: 250, y: 80 },
    exitY: 60,
    polygons: [
      [[0,0], [160,0], [150,180], [80,240], [90,380], [180,480], [190,620], [260,650], [220,800], [0,800]],
      [[500,0], [330,0], [350,150], [420,320], [340,480], [400,600], [380,720], [500,800]],
      [[280, 500], [320, 500], [300, 540]],
      [[250, 760], [330, 760], [320, 780], [260, 780]]
    ],
    entities: [
      { type: "pod", x: 290, y: 745 },
      { type: "fuel", x: 120, y: 340 },
      { type: "fuel", x: 400, y: 240 },
      { type: "turret", x: 360, y: 155, angle: -Math.PI/2 },
      { type: "turret", x: 145, y: 195, angle: Math.PI/2 },
      { type: "door", x: 180, y: 450, w: 160, h: 10, trigger: "switch1" },
      { type: "switch", x: 300, y: 490, target: "switch1" },
      { type: "reactor", x: 440, y: 760 }
    ]
  },
  {
    name: "BBC VECTOR CORE",
    theme: "bbc",
    gravity: 0.026,
    fuel: 3600,
    spawn: { x: 320, y: 100 },
    exitY: 80,
    polygons: [
      [[0,0], [200,0], [150,150], [260,250], [100,380], [200,500], [300,450], [300,600], [200,750], [0,750]],
      [[640,0], [440,0], [490,140], [380, 260], [540,380], [440,500], [340,450], [350,600], [450,750], [640,750]],
      [[270, 700], [370, 700], [350, 720], [290, 720]]
    ],
    entities: [
      { type: "pod", x: 320, y: 685 },
      { type: "turret", x: 190, y: 120, angle: 0 },
      { type: "turret", x: 450, y: 120, angle: Math.PI },
      { type: "turret", x: 110, y: 350, angle: 0 },
      { type: "turret", x: 530, y: 350, angle: Math.PI },
      { type: "fuel", x: 250, y: 560 },
      { type: "reactor", x: 320, y: 720 }
    ]
  },
  {
    name: "THE CAVERN OF DOOM",
    theme: "bbc",
    gravity: 0.022,
    fuel: 4000,
    spawn: { x: 180, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0], [120,0], [100,100], [50,180], [30,300], [70,420], [150,480], [100,560], [200,660], [0,700]],
      [[640,0], [450,0], [410,130], [450,260], [400,400], [580,520], [500,650], [640,700]],
      [[250, 680], [350, 680], [330, 700], [270, 700]]
    ],
    entities: [
      { type: "pod", x: 300, y: 665 },
      { type: "fuel", x: 120, y: 520 },
      { type: "turret", x: 420, y: 370, angle: Math.PI },
      { type: "turret", x: 200, y: 240, angle: 0 },
      { type: "reactor", x: 520, y: 670 }
    ]
  },
  {
    name: "REACTOR LABYRINTH",
    theme: "c64",
    gravity: 0.025,
    fuel: 4400,
    spawn: { x: 320, y: 80 },
    exitY: 60,
    polygons: [
      [[0,0], [220,0], [180,180], [100,280], [140,420], [80,560], [180,720], [0,720]],
      [[640,0], [420,0], [460,180], [380,300], [500,450], [420,600], [460,720], [640,720]],
      [[260, 200], [380, 200], [350, 240], [290, 240]],
      [[280, 680], [360, 680], [340, 700], [300, 700]]
    ],
    entities: [
      { type: "pod", x: 320, y: 665 },
      { type: "fuel", x: 150, y: 490 },
      { type: "fuel", x: 450, y: 320 },
      { type: "turret", x: 380, y: 190, angle: -Math.PI / 2 },
      { type: "turret", x: 260, y: 190, angle: -Math.PI / 2 },
      { type: "door", x: 180, y: 460, w: 240, h: 10, trigger: "switch1" },
      { type: "switch", x: 300, y: 220, target: "switch1" },
      { type: "reactor", x: 440, y: 690 }
    ]
  },
  {
    name: "GRAVITY INVERSION",
    theme: "inverted",
    gravity: 0.022,
    invertedGravity: true,
    fuel: 4000,
    spawn: { x: 320, y: 700 },
    exitY: 750,
    polygons: [
      [[0,0], [200,0], [120,200], [180,400], [100,600], [220,800], [0,800]],
      [[640,0], [440,0], [480,200], [420,400], [540,600], [440,800], [640,800]],
      [[280, 150], [360, 150], [340, 130], [300, 130]]
    ],
    entities: [
      { type: "pod", x: 320, y: 165 },
      { type: "fuel", x: 150, y: 340 },
      { type: "fuel", x: 450, y: 520 },
      { type: "turret", x: 450, y: 180, angle: Math.PI },
      { type: "turret", x: 170, y: 450, angle: 0 },
      { type: "reactor", x: 320, y: 100 }
    ]
  },
  {
    name: "THE DEFENSE GRID",
    theme: "c64",
    gravity: 0.024,
    fuel: 4800,
    spawn: { x: 150, y: 80 },
    exitY: 60,
    polygons: [
      [[0,0], [140,0], [100,150], [60,300], [120,450], [40,600], [180,750], [0,750]],
      [[640,0], [480,0], [520,180], [440,350], [560,520], [420,680], [640,750]],
      [[260, 690], [380, 690], [360, 710], [280, 710]]
    ],
    entities: [
      { type: "pod", x: 320, y: 675 },
      { type: "turret", x: 420, y: 330, angle: Math.PI },
      { type: "turret", x: 220, y: 220, angle: 0 },
      { type: "turret", x: 140, y: 480, angle: 0 },
      { type: "turret", x: 500, y: 580, angle: Math.PI },
      { type: "fuel", x: 120, y: 400 },
      { type: "fuel", x: 480, y: 280 },
      { type: "reactor", x: 520, y: 700 }
    ]
  },
  {
    name: "CORE ESCAPE",
    theme: "bbc",
    gravity: 0.030,
    fuel: 6000,
    spawn: { x: 320, y: 100 },
    exitY: 80,
    polygons: [
      [[0,0], [220,0], [180,200], [280,400], [140,600], [240,800], [0,800]],
      [[640,0], [420,0], [460,200], [360,400], [500,600], [400,800], [640,800]],
      [[270, 720], [370, 720], [350, 740], [290, 740]]
    ],
    entities: [
      { type: "pod", x: 320, y: 705 },
      { type: "fuel", x: 220, y: 300 },
      { type: "fuel", x: 420, y: 500 },
      { type: "turret", x: 160, y: 180, angle: 0 },
      { type: "turret", x: 480, y: 180, angle: Math.PI },
      { type: "turret", x: 260, y: 380, angle: Math.PI },
      { type: "turret", x: 380, y: 580, angle: 0 },
      { type: "reactor", x: 320, y: 735 }
    ]
  }
];

export const state = {
  gameState: STATE_TITLE,
  activeCampaignIdx: 0,
  activeLevel: null,
  score: 0,
  lives: 3,
  reactorTimer: 0,
  screenShake: 0,
  flashTimer: 0,
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
