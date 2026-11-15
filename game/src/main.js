// main.js — the entry point of Ember & Anvil.
// One job: wire input, state, stages and rendering into a game loop.
// It also exposes window.__ember for play-testing and drives the
// deterministic ?shot= scenes used for the screenshots.
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config.js';
import { createGame, startRun, tickPlay, finishOrder, buyUpgrade, leaveShop, restartToTitle } from './state.js';
import { currentOrderType } from './state.js';
import { createStages, updateHeat, lockHeat, updateHammer, strikeHammer, updateQuench, stopQuench, resetStagesForOrder } from './stages.js';
import { createSoundBank } from './audio.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const state = createGame();
const stages = createStages();
state.stages = stages; // the renderer reads the live stage values
const sounds = createSoundBank();
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const isShot = shotName !== null;
let pointerPumping = false;

function spawnEmber() {
  if (state.embers.length > 46) return;
  state.embers.push({
    x: 120 + Math.random() * 180,
    y: 400,
    vx: (Math.random() - 0.5) * 14,
    vy: -24 - Math.random() * 40,
    life: 1,
    size: 1.5 + Math.random() * 2.5,
    color: Math.random() < 0.5 ? '#ffb347' : '#ff7a1a',
  });
}

function updateEmbers(dt) {
  for (const e of state.embers) {
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.life -= dt * 0.55;
  }
  state.embers = state.embers.filter((e) => e.life > 0 && e.y > 150);
  if (Math.random() < dt * 22) spawnEmber();
}

// --- Stage actions: one function per player action, shared by keys/buttons.
function doHeatLock() {
  if (state.screen !== 'play' || state.stage !== 'heat' || state.result) return;
  const score = lockHeat(stages, state, currentOrderType(state));
  if (score === null) return;
  sounds.clang(score / 100);
  state.stage = 'hammer';
}

function doStrike() {
  if (state.screen !== 'play' || state.stage !== 'hammer' || state.result) return;
  const res = strikeHammer(stages, state);
  if (!res) return;
  sounds.clang(res.score / 100);
  if (res.done) state.stage = 'quench';
}

function doQuenchStop() {
  if (state.screen !== 'play' || state.stage !== 'quench' || state.result) return;
  const res = stopQuench(stages, state, currentOrderType(state));
  if (!res) return;
  sounds.hiss();
  const result = finishOrder(state);
  if (result.ruined) sounds.ruin();
  else {
    sounds.coin();
    if (result.quality >= 85) sounds.dayClear();
    if (state.order && state.order.type === 'Crown') sounds.fanfare();
  }
  if (state.hearts <= 0 && result.ruined) {
    // finishLose runs when the result banner expires; keep the banner first.
  }
}

function handleAction(action) {
  sounds.unlock();
  if (action.kind === 'key') {
    if (action.key === 'm') {
      state.muted = sounds.toggleMute();
      return;
    }
    if (action.key === 'p' && state.screen === 'play') {
      state.paused = !state.paused;
      return;
    }
    if (action.key === 'r' && (state.screen === 'win' || state.screen === 'lose')) {
      restartToTitle(state);
      return;
    }
    if (state.screen === 'title' && (action.key === 'enter' || action.key === 'space')) {
      sounds.click();
      startRun(state);
      resetStagesForOrder(stages);
      return;
    }
    if (state.screen === 'shop' && action.key === 'enter') {
      sounds.click();
      leaveShop(state);
      resetStagesForOrder(stages);
      return;
    }
    if (state.screen === 'shop' && ['1', '2', '3', '4'].includes(action.key)) {
      const ids = ['hammer', 'bellows', 'tongs', 'heart'];
      if (buyUpgrade(state, ids[Number(action.key) - 1])) sounds.coin();
      else sounds.click();
      return;
    }
    if (state.screen !== 'play' || state.paused || state.result) return;
    if (action.key === 'enter' && state.stage === 'heat') doHeatLock();
    else if (action.key === 'space') {
      if (state.stage === 'hammer') doStrike();
      else if (state.stage === 'quench') doQuenchStop();
    }
    return;
  }
  if (action.kind === 'pointerDown') pointerPumping = true;
  if (action.kind === 'pointerUp') pointerPumping = false;
  if (action.kind === 'tap') {
    if (state.screen !== 'play' || state.paused || state.result) return;
    if (state.stage === 'hammer') doStrike();
    else if (state.stage === 'quench') doQuenchStop();
    return;
  }
  if (action.kind !== 'button') return;
  const id = action.id;
  if (id === 'start') {
    sounds.click();
    startRun(state);
    resetStagesForOrder(stages);
  } else if (id === 'lock') doHeatLock();
  else if (id === 'strike') doStrike();
  else if (id === 'quench') doQuenchStop();
  else if (id.startsWith('shop-')) {
    const ids = ['hammer', 'bellows', 'tongs', 'heart'];
    if (buyUpgrade(state, ids[Number(id.slice(5)) - 1])) sounds.coin();
    else sounds.click();
  } else if (id === 'continue') {
    sounds.click();
    leaveShop(state);
    resetStagesForOrder(stages);
  } else if (id === 'restart') {
    sounds.click();
    restartToTitle(state);
  }
}

const input = createInput(canvas, handleAction);

let currentOrder = null;

function frame(now) {
  const dt = Math.min(0.05, (now - frame.last) / 1000 || 0.016);
  frame.last = now;
  if (state.screen === 'play') {
    tickPlay(state, dt);
    // A new order means fresh stage hardware. The check runs AFTER
    // tickPlay because tickPlay is what creates the next order (when a
    // result banner expires) — resetting in the same frame leaves no
    // window where a fast keypress can lock the old stage values.
    if (state.order !== currentOrder) {
      currentOrder = state.order;
      if (state.order) resetStagesForOrder(stages);
    }
    if (!state.result) {
      if (state.stage === 'heat') updateHeat(stages, state, dt, input.isSpaceHeld() || pointerPumping);
      else if (state.stage === 'hammer') updateHammer(stages, state, dt, currentOrderType(state));
      else if (state.stage === 'quench') updateQuench(stages, dt);
    }
  }
  if (!isShot) updateEmbers(dt);
  render(ctx, state, input, now / 1000);
  if (isShot && !frame.shotReady) {
    frame.shotReady = true;
    window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
frame.last = performance.now();

// Deterministic screenshot scenes freeze the simulation: the frame still
// renders, but no stage or timer advances, so the shot is reproducible.
if (isShot) {
  applyShot(state, stages, shotName);
  state.embers = [
    { x: 150, y: 300, vx: 0, vy: 0, life: 0.9, size: 2.5, color: '#ffb347' },
    { x: 230, y: 260, vx: 0, vy: 0, life: 0.8, size: 2, color: '#ff7a1a' },
    { x: 290, y: 320, vx: 0, vy: 0, life: 0.9, size: 3, color: '#ffb347' },
    { x: 180, y: 350, vx: 0, vy: 0, life: 0.7, size: 2, color: '#ff7a1a' },
  ];
  // In shot mode the loop renders once with a frozen clock.
  render(ctx, state, input, 1.234);
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}

// Test hooks for scripted play-testing (never used by the game itself).
window.__ember = {
  state,
  stages,
  start: () => { startRun(state); resetStagesForOrder(stages); },
  heatLock: doHeatLock,
  strike: doStrike,
  quenchStop: doQuenchStop,
  buy: (id) => buyUpgrade(state, id),
  continue: () => { leaveShop(state); resetStagesForOrder(stages); },
  restart: () => restartToTitle(state),
  setHeat(temp) { stages.heat.temp = temp; },
  setHammerPos(pos) { stages.hammer.pos = pos; },
  setQuenchPos(pos) { stages.quench.pos = pos; },
  setTimer(seconds) { state.dayTimeLeft = seconds; },
  forceWin: () => { state.screen = 'win'; state.totalEarned = Math.max(state.totalEarned, 400); },
  forceLose: () => { state.screen = 'lose'; state.hearts = 0; },
};
