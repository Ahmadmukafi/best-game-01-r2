// shots.js — deterministic screenshot scenes for Ember & Anvil.
// One job: given ?shot=<scene> in the page URL, put the game into a fixed,
// good-looking state for that scene. No wall clock, no randomness here:
// the same URL always renders the same frame, so the screenshots are real
// renders of the game's own code and reproducible.
import { startRun } from './state.js';

export function applyShot(state, stages, name) {
  const scene = name || 'title';
  if (scene === 'title') {
    state.screen = 'title';
    state.best = 342;
    return;
  }
  if (scene === 'win') {
    startRun(state);
    state.screen = 'win';
    state.day = 5;
    state.gold = 486;
    state.totalEarned = 486;
    state.ordersDelivered = 12;
    state.ordersRuined = 1;
    state.bestQuality = 96;
    state.bestCombo = 5;
    state.best = 486;
    return;
  }
  if (scene === 'lose') {
    startRun(state);
    state.screen = 'lose';
    state.day = 3;
    state.hearts = 0;
    state.gold = 118;
    state.totalEarned = 118;
    state.ordersDelivered = 5;
    state.ordersRuined = 3;
    state.bestQuality = 71;
    state.bestCombo = 2;
    state.best = 342;
    return;
  }
  if (scene === 'shop') {
    startRun(state);
    state.screen = 'shop';
    state.day = 2;
    state.gold = 212;
    state.hearts = 3;
    state.combo = 2;
    state.ordersDelivered = 2;
    state.bestQuality = 91;
    state.totalEarned = 212;
    state.upgrades.hammer = true;
    return;
  }
  // 'play': mid-order, hammer stage, a marker sweeping near the weak spot.
  startRun(state);
  state.screen = 'play';
  state.day = 2;
  state.gold = 145;
  state.hearts = 3;
  state.combo = 3;
  state.dayTimeLeft = 62;
  state.ordersDoneToday = 1;
  state.ordersDelivered = 3;
  state.bestQuality = 88;
  state.totalEarned = 145;
  // Rebuild the current order as a Sword with a fixed weak spot.
  state.order = {
    type: 'Sword',
    customer: 'Sergeant Kess',
    spotCenter: 58,
    strikes: 1,
    strikeScores: [92],
  };
  state.stage = 'hammer';
  state.stageScores = { heat: 91, hammer: 0, quench: 0 };
  stages.heat = { temp: 78, locked: true };
  stages.hammer = { pos: 54, dir: 1, cooldownMs: 0 };
  stages.quench = { pos: 0, dir: 1, stopped: false };
}
