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
  },
  {
    name: "VOLCANIC FISSURE",
    theme: "c64",
    gravity: 0.026,
    fuel: 4800,
    spawn: { x: 320, y: 100 },
    exitY: 80,
    polygons: [
      [[0,0], [180,0], [140,240], [100,420], [160,600], [200,800], [0,800]],
      [[640,0], [460,0], [500,240], [540,420], [480,600], [440,800], [640,800]],
      [[280,750], [360,750], [340,770], [300,770]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "reactor", x: 320, y: 750 },
      { type: "fuel", x: 150, y: 300 },
      { type: "turret", x: 180, y: 200, angle: 0 },
      { type: "turret", x: 460, y: 200, angle: Math.PI },
      { type: "turret", x: 120, y: 480, angle: 0 }
    ]
  },
  {
    name: "CHARYBDIS GATE",
    theme: "inverted",
    gravity: 0.028,
    fuel: 5200,
    spawn: { x: 200, y: 100 },
    exitY: 75,
    polygons: [
      [[0,0], [150,0], [120,200], [80,400], [140,600], [180,800], [0,800]],
      [[640,0], [450,0], [480,200], [400,400], [500,600], [460,800], [640,800]],
      [[250, 300], [390, 300], [350, 350], [290, 350]],
      [[280, 750], [360, 750], [340, 770], [300, 770]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "door", x: 130, y: 480, w: 280, h: 10, trigger: "switch2" },
      { type: "switch", x: 320, y: 330, target: "switch2" },
      { type: "reactor", x: 480, y: 720 },
      { type: "fuel", x: 320, y: 200 }
    ]
  },
  {
    name: "THE GAUNTLET",
    theme: "bbc",
    gravity: 0.030,
    fuel: 5600,
    spawn: { x: 320, y: 100 },
    exitY: 80,
    polygons: [
      [[0,0], [160,0], [120,220], [160,440], [100,660], [140,800], [0,800]],
      [[640,0], [480,0], [520,220], [480,440], [540,660], [500,800], [640,800]],
      [[260, 760], [380, 760], [350, 780], [290, 780]]
    ],
    entities: [
      { type: "pod", x: 320, y: 745 },
      { type: "turret", x: 140, y: 180, angle: 0 },
      { type: "turret", x: 500, y: 180, angle: Math.PI },
      { type: "turret", x: 180, y: 380, angle: 0 },
      { type: "turret", x: 460, y: 380, angle: Math.PI },
      { type: "turret", x: 120, y: 580, angle: 0 },
      { type: "turret", x: 520, y: 580, angle: Math.PI },
      { type: "reactor", x: 320, y: 765 },
      { type: "fuel", x: 320, y: 450 }
    ]
  },
  {
    name: "ANTI-GRAVITY ZONE",
    theme: "c64",
    gravity: 0.024,
    invertedGravity: true,
    fuel: 6000,
    spawn: { x: 320, y: 700 },
    exitY: 750,
    polygons: [
      [[0,0], [200,0], [140,200], [180,400], [120,600], [220,800], [0,800]],
      [[640,0], [440,0], [500,200], [460,400], [520,600], [420,800], [640,800]],
      [[280, 150], [360, 150], [340, 130], [300, 130]]
    ],
    entities: [
      { type: "pod", x: 320, y: 165 },
      { type: "reactor", x: 320, y: 90 },
      { type: "turret", x: 160, y: 300, angle: 0 },
      { type: "turret", x: 480, y: 500, angle: Math.PI },
      { type: "fuel", x: 250, y: 550 }
    ]
  },
  {
    name: "THE PIT OF SHADOWS",
    theme: "inverted",
    gravity: 0.032,
    fuel: 6400,
    spawn: { x: 160, y: 80 },
    exitY: 60,
    polygons: [
      [[0,0], [200,0], [160,300], [100,500], [80,800], [0,800]],
      [[640,0], [420,0], [480,300], [440,500], [380,800], [640,800]],
      [[180, 780], [300, 780], [280, 800], [200, 800]]
    ],
    entities: [
      { type: "pod", x: 240, y: 765 },
      { type: "reactor", x: 320, y: 760 },
      { type: "turret", x: 450, y: 250, angle: Math.PI },
      { type: "turret", x: 120, y: 450, angle: 0 },
      { type: "fuel", x: 130, y: 280 },
      { type: "fuel", x: 410, y: 480 }
    ]
  },
  {
    name: "SWITCHBACKS",
    theme: "bbc",
    gravity: 0.028,
    fuel: 5000,
    spawn: { x: 320, y: 80 },
    exitY: 60,
    polygons: [
      [[0,0], [180,0], [100,160], [240,320], [100,480], [180,640], [220,800], [0,800]],
      [[640,0], [460,0], [380,160], [540,320], [380,480], [460,640], [420,800], [640,800]],
      [[280, 760], [360, 760], [340, 780], [300, 780]]
    ],
    entities: [
      { type: "pod", x: 320, y: 745 },
      { type: "reactor", x: 320, y: 770 },
      { type: "door", x: 240, y: 320, w: 300, h: 10, trigger: "switch_s1" },
      { type: "switch", x: 150, y: 420, target: "switch_s1" },
      { type: "turret", x: 340, y: 140, angle: -Math.PI / 2 },
      { type: "turret", x: 300, y: 500, angle: Math.PI / 2 },
      { type: "fuel", x: 300, y: 240 }
    ]
  },
  {
    name: "TURRET FORTRESS",
    theme: "c64",
    gravity: 0.030,
    fuel: 6800,
    spawn: { x: 200, y: 100 },
    exitY: 70,
    polygons: [
      [[0,0], [140,0], [100,180], [60,360], [120,540], [80,720], [160,800], [0,800]],
      [[640,0], [500,0], [540,180], [460,360], [520,540], [440,720], [480,800], [640,800]],
      [[280, 770], [360, 770], [340, 790], [300, 790]]
    ],
    entities: [
      { type: "pod", x: 320, y: 755 },
      { type: "reactor", x: 320, y: 780 },
      { type: "turret", x: 120, y: 160, angle: 0 },
      { type: "turret", x: 520, y: 160, angle: Math.PI },
      { type: "turret", x: 80, y: 340, angle: 0 },
      { type: "turret", x: 480, y: 340, angle: Math.PI },
      { type: "turret", x: 140, y: 520, angle: 0 },
      { type: "turret", x: 500, y: 520, angle: Math.PI },
      { type: "turret", x: 100, y: 700, angle: 0 },
      { type: "turret", x: 420, y: 700, angle: Math.PI },
      { type: "fuel", x: 320, y: 450 },
      { type: "fuel", x: 320, y: 600 }
    ]
  },
  {
    name: "RESONANCE CORE",
    theme: "inverted",
    gravity: 0.026,
    fuel: 5800,
    spawn: { x: 320, y: 80 },
    exitY: 60,
    polygons: [
      [[0,0], [220,0], [140,200], [100,400], [160,600], [200,800], [0,800]],
      [[640,0], [420,0], [500,200], [540,400], [480,600], [440,800], [640,800]],
      [[260, 380], [380, 380], [360, 420], [280, 420]],
      [[280, 750], [360, 750], [340, 770], [300, 770]]
    ],
    entities: [
      { type: "pod", x: 320, y: 735 },
      { type: "reactor", x: 320, y: 755 },
      { type: "door", x: 140, y: 195, w: 360, h: 10, trigger: "sw1" },
      { type: "door", x: 160, y: 595, w: 320, h: 10, trigger: "sw2" },
      { type: "switch", x: 320, y: 400, target: "sw1" },
      { type: "switch", x: 320, y: 740, target: "sw2" },
      { type: "fuel", x: 200, y: 300 },
      { type: "fuel", x: 440, y: 500 }
    ]
  },
  {
    name: "HEAVY ELEMENT CAVERN",
    theme: "bbc",
    gravity: 0.035,
    fuel: 8000,
    spawn: { x: 180, y: 70 },
    exitY: 50,
    polygons: [
      [[0,0], [120,0], [100,150], [40,300], [100,500], [60,700], [160,800], [0,800]],
      [[640,0], [520,0], [560,150], [480,300], [540,500], [460,700], [480,800], [640,800]],
      [[260, 760], [380, 760], [360, 780], [280, 780]]
    ],
    entities: [
      { type: "pod", x: 320, y: 745 },
      { type: "reactor", x: 320, y: 770 },
      { type: "fuel", x: 120, y: 240 },
      { type: "fuel", x: 500, y: 440 },
      { type: "fuel", x: 120, y: 640 },
      { type: "turret", x: 500, y: 220, angle: Math.PI },
      { type: "turret", x: 80, y: 480, angle: 0 },
      { type: "turret", x: 500, y: 680, angle: Math.PI }
    ]
  },
  {
    name: "FINAL REDOUBT",
    theme: "c64",
    gravity: 0.032,
    fuel: 8500,
    spawn: { x: 320, y: 90 },
    exitY: 70,
    polygons: [
      [[0,0], [240,0], [160,180], [120,360], [180,540], [100,720], [200,800], [0,800]],
      [[640,0], [400,0], [480,180], [520,360], [460,540], [540,720], [440,800], [640,800]],
      [[280, 770], [360, 770], [340, 790], [300, 790]]
    ],
    entities: [
      { type: "pod", x: 320, y: 755 },
      { type: "reactor", x: 320, y: 780 },
      { type: "door", x: 160, y: 175, w: 320, h: 10, trigger: "final_sw" },
      { type: "switch", x: 320, y: 730, target: "final_sw" },
      { type: "turret", x: 180, y: 280, angle: 0 },
      { type: "turret", x: 460, y: 280, angle: Math.PI },
      { type: "turret", x: 140, y: 480, angle: 0 },
      { type: "turret", x: 500, y: 480, angle: Math.PI },
      { type: "turret", x: 120, y: 660, angle: 0 },
      { type: "turret", x: 520, y: 660, angle: Math.PI },
      { type: "fuel", x: 150, y: 420 },
      { type: "fuel", x: 490, y: 600 }
    ]
  }
];

export const state = {
  gameState: STATE_TITLE,
  paused: false,
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
