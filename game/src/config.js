// Neon Harbor — tuning, palette and mission data. All names, places and story are
// original fiction for this game; nothing here comes from any commercial game.
export const WORLD = { width: 3200, height: 2400, roadWidth: 76, blockGap: 400 };

export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  walkSpeed: 210,
  runSpeed: 330,
  health: 100,
  punchDamage: 12,
  punchRange: 46,
  punchCooldown: 0.38,
};

export const CAR = {
  length: 54,
  width: 26,
  accel: 420,
  brake: 700,
  reverseAccel: 220,
  maxSpeed: 460,
  maxReverse: 140,
  turnRate: 2.6,
  drag: 0.6,
  health: 100,
};

export const POLICE = { chaseSpeed: 430, ramDamage: 8, bustRange: 30, spawnGap: 3.5 };
export const WANTED = {
  decayDelay: 9,
  decayStep: 6,
  maxStars: 5,
  // police cars on the street per star level
  copsPerStar: [0, 1, 2, 3, 4, 5],
};

export const PALETTE = {
  grass: '#14301f',
  park: '#1d4a2a',
  road: '#23262e',
  roadLine: '#c9a227',
  sidewalk: '#3a3f4a',
  water: '#0b3d5c',
  waterDeep: '#082c44',
  building: ['#2e3440', '#3a2f4a', '#26343a', '#40342a', '#33283e', '#2a3a2e'],
  neon: ['#ff2e88', '#00e5ff', '#ffe600', '#7cff00', '#ff7a00', '#b967ff'],
  carColors: ['#d64545', '#4f8ef7', '#f2c94c', '#e8e8e8', '#3ddc84', '#ff7a00', '#b967ff', '#2bb3a3'],
  policeCar: '#1c2733',
  player: '#ffd166',
  ped: ['#f4a261', '#e76f51', '#8ecae6', '#ffb703', '#90be6d', '#f28482'],
  hud: '#eef1f5',
  muted: '#9aa3b2',
  star: '#ffd166',
  money: '#7cff9e',
  danger: '#ff4d5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SAVE_KEY = 'neon-harbor.save.v1';
export const BEST_KEY = 'neon-harbor.best.v1';

// Story: Kai Meridian, a former harbour courier, takes jobs from fixer Mara Voss
// to pay off his late brother's debt to the dock crew. Four linked jobs.
export const MISSIONS = [
  {
    id: 'm1',
    title: 'First Errand',
    brief: 'Mara Voss needs a package run. Pick it up at the garage, deliver it to the south docks.',
    reward: 150,
    steps: [
      { type: 'goto', text: 'Drive to Mara\u2019s garage (yellow marker)', x: 600, y: 600, r: 90 },
      { type: 'goto', text: 'Deliver the package to the south docks', x: 1400, y: 2100, r: 90 },
    ],
  },
  {
    id: 'm2',
    title: 'Hot Wheels',
    brief: 'A client wants the white Comet GT parked downtown. Take it to the garage. The crew will notice.',
    reward: 300,
    grantPistol: true,
    steps: [
      { type: 'steal', text: 'Steal the white Comet GT downtown', x: 1800, y: 1000, r: 110 },
      { type: 'deliverCar', text: 'Deliver the Comet GT to Mara\u2019s garage', x: 600, y: 600, r: 110 },
    ],
  },
  {
    id: 'm3',
    title: 'Dockside Trouble',
    brief: 'Rival crew is shaking down the dock workers. Clear them out and grab the crate they stole.',
    reward: 500,
    steps: [
      { type: 'clear', text: 'Deal with the rival crew at the docks (3)', x: 2200, y: 2100, r: 170, count: 3 },
      { type: 'goto', text: 'Collect the stolen crate', x: 2300, y: 2100, r: 80 },
    ],
  },
  {
    id: 'm4',
    title: 'Harbor Heist',
    brief: 'One last job: lift the night deposit from the Meridian Bank, then lose the heat at the hideout.',
    reward: 1000,
    steps: [
      { type: 'goto', text: 'Reach the Meridian Bank', x: 2600, y: 1400, r: 90 },
      { type: 'grab', text: 'Grab the deposit (stay in the circle)', x: 2600, y: 1400, r: 90, hold: 4 },
      { type: 'escape', text: 'Lose the cops, then reach the hideout', x: 300, y: 300, r: 110 },
    ],
  },
];

export const GARAGE = { x: 600, y: 600 };
export const HIDEOUT = { x: 300, y: 300 };
export const HOSPITAL = { x: 1000, y: 200 };
export const GUNSHOP = { x: 2200, y: 600 };
