// Prism Drift: every tunable number and the whole palette in one place, so the
// rest of the game reads as rules, not magic numbers.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const COLORS = [
  { name: 'AMBER', main: '#ffb02e', glow: '#ffcf6b', dark: '#7a4d00' },
  { name: 'CYAN', main: '#2ee6ff', glow: '#8ff2ff', dark: '#00596b' },
  { name: 'MAGENTA', main: '#ff4fd8', glow: '#ff9cec', dark: '#6b004f' },
];

export const PALETTE = {
  backgroundTop: '#0b0620',
  backgroundMid: '#1a0b33',
  backgroundBottom: '#2d1150',
  hudText: '#f4f0ff',
  hudDim: '#b9a8e8',
  heart: '#ff5d7a',
  asteroid: '#9aa0b5',
  asteroidDark: '#5d6378',
  powerShield: '#7dff9b',
  powerSlow: '#8fb7ff',
  powerNova: '#ffe95d',
  danger: '#ff4d5e',
};

export const SHIP = {
  radius: 20,
  accel: 2600,
  maxSpeed: 560,
  drag: 3.2,
  startX: FIELD.width / 2,
  startY: FIELD.height - 130,
};

export const ORB = { radius: 15, baseSpeed: 110, speedPerWave: 16, sway: 42 };

export const ASTEROID = { minRadius: 18, maxRadius: 34, baseSpeed: 130, speedPerWave: 14 };

export const RULES = {
  lives: 3,
  maxLives: 4,
  waveSeconds: 25,
  baseSpawnInterval: 0.55,
  minSpawnInterval: 0.22,
  asteroidChance: 0.12,
  asteroidChancePerWave: 0.04,
  powerupEverySeconds: 14,
  comboStep: 5,
  maxMultiplier: 8,
  basePoints: 10,
  slowSeconds: 6,
  slowFactor: 0.5,
  shakeOnHit: 14,
  shakeOnWrong: 9,
};

export const BEST_KEY = 'prism-drift-best';
