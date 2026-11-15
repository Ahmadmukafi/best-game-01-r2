// stages.js — the three crafting stages: Heat, Hammer, Quench.
// One job: each stage's live values, its update step and its score.
// The game state holds the stage objects; render.js draws them.
import {
  HEAT_START, HEAT_RISE_PER_SECOND, HEAT_FALL_PER_SECOND, HEAT_BAND,
  HAMMER_STRIKES_NEEDED, HAMMER_SPOT_WIDTH, HAMMER_STRIKE_COOLDOWN_MS,
  QUENCH_BAND_CENTER, QUENCH_PERFECT_HALF, UPGRADE_EFFECTS,
} from './config.js';

export function createStages() {
  return {
    heat: { temp: HEAT_START, locked: false },
    hammer: { pos: 0, dir: 1, cooldownMs: 0 },
    quench: { pos: 0, dir: 1, stopped: false },
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function heatRiseRate(state) {
  return HEAT_RISE_PER_SECOND + (state.upgrades.bellows ? UPGRADE_EFFECTS.bellows.riseBonus : 0);
}

export function hammerSpotWidth(state) {
  return HAMMER_SPOT_WIDTH + (state.upgrades.hammer ? UPGRADE_EFFECTS.hammer.spotBonus : 0);
}

export function quenchBandWidth(state, type) {
  const base = type ? type.quenchWidth : 26;
  return base + (state.upgrades.tongs ? UPGRADE_EFFECTS.tongs.quenchBonus : 0);
}

// --- Heat: hold to pump the bellows, ENTER/click to lock in the green band.
export function updateHeat(stages, state, dt, pumping) {
  const h = stages.heat;
  if (h.locked) return;
  if (pumping) h.temp += heatRiseRate(state) * dt;
  else h.temp -= HEAT_FALL_PER_SECOND * dt;
  h.temp = clamp(h.temp, 0, 100);
}

export function lockHeat(stages, state, type) {
  const h = stages.heat;
  if (h.locked) return null;
  h.locked = true;
  const ideal = type ? type.heatIdeal : 74;
  const score = Math.round(clamp(100 - Math.abs(h.temp - ideal) * 2.2, 0, 100));
  state.stageScores.heat = score;
  return score;
}

export function inHeatBand(temp) {
  return temp >= HEAT_BAND.low && temp <= HEAT_BAND.high;
}

// --- Hammer: the marker sweeps; strike when it crosses the weak spot.
export function updateHammer(stages, state, dt, type) {
  const m = stages.hammer;
  const speed = type ? type.hammerSpeed : 140;
  m.pos += m.dir * speed * dt;
  if (m.pos >= 100) { m.pos = 100; m.dir = -1; }
  if (m.pos <= 0) { m.pos = 0; m.dir = 1; }
  if (m.cooldownMs > 0) m.cooldownMs -= dt * 1000;
}

export function strikeHammer(stages, state) {
  const m = stages.hammer;
  if (m.cooldownMs > 0) return null;
  m.cooldownMs = HAMMER_STRIKE_COOLDOWN_MS;
  const order = state.order;
  const width = hammerSpotWidth(state);
  const dist = Math.abs(m.pos - order.spotCenter);
  const score = Math.round(clamp(100 - (dist / (width / 2)) * 55, 0, 100));
  order.strikes += 1;
  order.strikeScores.push(score);
  const done = order.strikes >= HAMMER_STRIKES_NEEDED;
  if (done) {
    const avg = order.strikeScores.reduce((a, b) => a + b, 0) / order.strikeScores.length;
    state.stageScores.hammer = Math.round(avg);
  }
  return { score, done, inSpot: dist <= width / 2 };
}

// --- Quench: the needle sweeps; stop it in the blue band.
export function updateQuench(stages, dt) {
  const q = stages.quench;
  if (q.stopped) return;
  q.pos += q.dir * 95 * dt;
  if (q.pos >= 100) { q.pos = 100; q.dir = -1; }
  if (q.pos <= 0) { q.pos = 0; q.dir = 1; }
}

export function stopQuench(stages, state, type) {
  const q = stages.quench;
  if (q.stopped) return null;
  q.stopped = true;
  const width = quenchBandWidth(state, type);
  const dist = Math.abs(q.pos - QUENCH_BAND_CENTER);
  let score;
  if (dist <= QUENCH_PERFECT_HALF) score = 100;
  else score = Math.round(clamp(100 - ((dist - QUENCH_PERFECT_HALF) / (width / 2)) * 70, 0, 100));
  state.stageScores.quench = score;
  return { score, perfect: dist <= QUENCH_PERFECT_HALF };
}

export function resetStagesForOrder(stages) {
  stages.heat = { temp: HEAT_START, locked: false };
  stages.hammer = { pos: 0, dir: 1, cooldownMs: 0 };
  stages.quench = { pos: 0, dir: 1, stopped: false };
}
