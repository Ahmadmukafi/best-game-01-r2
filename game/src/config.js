// config.js — every tunable number for Ember & Anvil lives here.
// One job: the game's tuning table. Nothing here draws or updates.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

export const ORDER_TYPES = {
  Horseshoe: { label: 'Horseshoe', basePay: 30, heatIdeal: 72, hammerSpeed: 120, quenchWidth: 30, icon: 'horseshoe' },
  Dagger: { label: 'Dagger', basePay: 45, heatIdeal: 74, hammerSpeed: 140, quenchWidth: 28, icon: 'dagger' },
  Sword: { label: 'Sword', basePay: 70, heatIdeal: 74, hammerSpeed: 155, quenchWidth: 26, icon: 'sword' },
  Shield: { label: 'Shield', basePay: 90, heatIdeal: 76, hammerSpeed: 170, quenchWidth: 24, icon: 'shield' },
  Breastplate: { label: 'Breastplate', basePay: 120, heatIdeal: 76, hammerSpeed: 185, quenchWidth: 22, icon: 'breastplate' },
  Crown: { label: 'Crown of Embers', basePay: 300, heatIdeal: 75, hammerSpeed: 200, quenchWidth: 20, icon: 'crown' },
};

export const CUSTOMERS = [
  'Mira the courier', 'Bram the farrier', 'Sergeant Kess', 'Old Tobin',
  'Lady Arwen', 'Captain Draal', 'Pip the tinker', 'Mother Ysolde',
  'Rook the ranger', 'Master Smith Anselm',
];

// Orders dealt per day. Day 5 is the Crown of Embers masterwork alone.
export const DAY_ORDERS = {
  1: ['Horseshoe', 'Horseshoe'],
  2: ['Dagger', 'Horseshoe', 'Sword'],
  3: ['Sword', 'Shield', 'Dagger'],
  4: ['Shield', 'Breastplate', 'Sword', 'Dagger'],
  5: ['Crown'],
};

export const DAY_TIME_SECONDS = { 1: 100, 2: 110, 3: 110, 4: 120, 5: 170 };
export const TOTAL_DAYS = 5;
export const START_HEARTS = 3;
export const MAX_HEARTS = 5;
export const MAX_COMBO = 6;
export const RUIN_QUALITY = 40; // below this the order is ruined
export const TIP_QUALITY = 85; // at or above this the customer tips
export const TIP_RATE = 0.25;

// Heat stage: temperature rises while the bellows are pumped.
export const HEAT_START = 20;
export const HEAT_RISE_PER_SECOND = 55;
export const HEAT_FALL_PER_SECOND = 26;
export const HEAT_BAND = { low: 62, high: 86 };

// Hammer stage: the marker sweeps; strike on the glowing weak spot.
export const HAMMER_STRIKES_NEEDED = 3;
export const HAMMER_SPOT_WIDTH = 14;
export const HAMMER_STRIKE_COOLDOWN_MS = 260;

// Quench stage: stop the needle in the blue band, dead centre for perfect.
export const QUENCH_BAND_CENTER = 50;
export const QUENCH_PERFECT_HALF = 4;

export const UPGRADES = [
  { id: 'hammer', name: 'Sturdy Hammer', cost: 60, desc: 'Weak spot +8 wide. Steadier strikes.' },
  { id: 'bellows', name: 'Great Bellows', cost: 60, desc: 'Bellows pump much faster. Heat climbs quickly.' },
  { id: 'tongs', name: 'Cool Tongs', cost: 60, desc: 'Quench band +10 wide. Easier perfect tempers.' },
  { id: 'heart', name: 'Warm Heart', cost: 80, desc: '+1 heart, up to 5. A second chance.' },
];

export const UPGRADE_EFFECTS = {
  hammer: { spotBonus: 8 },
  bellows: { riseBonus: 32 },
  tongs: { quenchBonus: 10 },
};

export const PALETTE = {
  bgTop: '#241610',
  bgBottom: '#120a07',
  brick: '#3a2118',
  brickLine: '#2a1710',
  wood: '#6b4423',
  woodDark: '#4a2d16',
  iron: '#8d97a3',
  ironDark: '#5a636e',
  ember: '#ff7a1a',
  emberBright: '#ffb347',
  gold: '#ffd34d',
  cream: '#f5e6c8',
  muted: '#c9a58a',
  red: '#e5484d',
  green: '#58c96b',
  blue: '#4db2ff',
  panel: '#1d130d',
  panelEdge: '#6b4423',
};
