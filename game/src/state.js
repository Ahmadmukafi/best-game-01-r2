// state.js — the whole game state of Ember & Anvil and how it moves.
// One job: days, orders, hearts, gold, combo, shop and win/lose.
// It knows nothing about drawing or sound; main.js calls into it.
import {
  DAY_ORDERS, DAY_TIME_SECONDS, TOTAL_DAYS, START_HEARTS, MAX_HEARTS,
  MAX_COMBO, RUIN_QUALITY, TIP_QUALITY, TIP_RATE, ORDER_TYPES, CUSTOMERS,
} from './config.js';

export function createGame() {
  const state = {
    screen: 'title', // title | play | shop | win | lose
    day: 1,
    gold: 0,
    hearts: START_HEARTS,
    combo: 0,
    bestCombo: 0,
    ordersDoneToday: 0,
    ordersDelivered: 0,
    ordersRuined: 0,
    bestQuality: 0,
    totalEarned: 0,
    dayTimeLeft: DAY_TIME_SECONDS[1],
    dayTimeTotal: DAY_TIME_SECONDS[1],
    // The current order, or null between orders.
    order: null,
    // Stage inside an order: 'heat' | 'hammer' | 'quench' | 'result'.
    stage: 'heat',
    stageScores: { heat: 0, hammer: 0, quench: 0 },
    result: null, // { quality, pay, tip, ruined, label } shown after an order
    resultTimer: 0,
    banner: '', // short message shown over the forge
    bannerTimer: 0,
    upgrades: { hammer: false, bellows: false, tongs: false, heart: false },
    muted: false,
    paused: false,
    stats: { startedAt: 0, playSeconds: 0 },
    // Cosmetic ember particles; render.js owns their motion.
    embers: [],
    best: 0,
  };
  try { state.best = Number(localStorage.getItem('ember-anvil-best') || 0) || 0; } catch (e) { state.best = 0; }
  return state;
}

export function orderQuota(state) {
  return DAY_ORDERS[state.day].length;
}

export function currentOrderType(state) {
  if (!state.order) return null;
  return ORDER_TYPES[state.order.type];
}

export function startRun(state) {
  const fresh = createGame();
  Object.assign(state, fresh);
  state.screen = 'play';
  state.stats.startedAt = Date.now();
  beginDay(state);
}

export function beginDay(state) {
  state.dayTimeTotal = DAY_TIME_SECONDS[state.day];
  state.dayTimeLeft = state.dayTimeTotal;
  state.ordersDoneToday = 0;
  nextOrder(state);
}

export function nextOrder(state) {
  const list = DAY_ORDERS[state.day];
  const idx = state.ordersDoneToday;
  if (idx >= list.length) {
    // Day complete: shop between days, or the win screen after day 5.
    state.order = null;
    if (state.day >= TOTAL_DAYS) {
      finishWin(state);
    } else {
      state.screen = 'shop';
    }
    return;
  }
  const type = list[idx];
  const customer = CUSTOMERS[(state.day * 3 + idx * 2 + state.ordersDelivered) % CUSTOMERS.length];
  state.order = {
    type,
    customer,
    // Weak spot for the hammer stage, placed per order.
    spotCenter: 28 + Math.random() * 44,
    strikes: 0,
    strikeScores: [],
  };
  state.stage = 'heat';
  state.stageScores = { heat: 0, hammer: 0, quench: 0 };
  state.result = null;
  state.screen = 'play';
}

function orderQuality(state) {
  const s = state.stageScores;
  return Math.round(s.heat * 0.3 + s.hammer * 0.4 + s.quench * 0.3);
}

export function finishOrder(state) {
  const quality = orderQuality(state);
  const type = ORDER_TYPES[state.order.type];
  const ruined = quality < RUIN_QUALITY;
  let pay = 0;
  let tip = 0;
  if (!ruined) {
    const comboMult = 1 + 0.2 * Math.min(state.combo, MAX_COMBO - 1);
    pay = Math.round(type.basePay * (quality / 100) * comboMult);
    if (quality >= TIP_QUALITY) tip = Math.round(pay * TIP_RATE);
    state.combo = Math.min(state.combo + (quality >= 70 ? 1 : 0), MAX_COMBO);
    if (quality < 70) state.combo = 0;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.gold += pay + tip;
    state.totalEarned += pay + tip;
    state.ordersDelivered += 1;
  } else {
    state.combo = 0;
    state.ordersRuined += 1;
    state.hearts -= 1;
  }
  state.bestQuality = Math.max(state.bestQuality, quality);
  state.result = { quality, pay, tip, ruined, label: type.label };
  state.stage = 'result';
  state.resultTimer = 1.6;
  state.ordersDoneToday += 1;
  return state.result;
}

// Called every frame while screen === 'play' and an order is active.
export function tickPlay(state, dt) {
  if (state.paused) return;
  state.stats.playSeconds += dt;
  state.dayTimeLeft -= dt;
  if (state.resultTimer > 0) {
    state.resultTimer -= dt;
    if (state.resultTimer <= 0) {
      state.result = null;
      if (state.hearts <= 0) { finishLose(state); return; }
      nextOrder(state);
    }
    return;
  }
  if (state.dayTimeLeft <= 0) {
    // The day's fire goes out with the quota unmet: lose a heart.
    state.dayTimeLeft = 0;
    state.hearts -= 1;
    state.combo = 0;
    state.banner = 'The day ends — the fire dies. -1 heart';
    state.bannerTimer = 2;
    if (state.hearts <= 0) { finishLose(state); return; }
    if (state.day >= TOTAL_DAYS) { finishLose(state); return; }
    // The shop sits between days; leaveShop() advances the day.
    state.screen = 'shop';
    return;
  }
  if (state.bannerTimer > 0) state.bannerTimer -= dt;
}

export function buyUpgrade(state, id) {
  const defs = { hammer: 60, bellows: 60, tongs: 60, heart: 80 };
  if (!defs[id] || state.upgrades[id]) return false;
  if (id === 'heart' && state.hearts >= MAX_HEARTS) return false;
  if (state.gold < defs[id]) return false;
  state.gold -= defs[id];
  state.upgrades[id] = true;
  if (id === 'heart') state.hearts = Math.min(state.hearts + 1, MAX_HEARTS);
  return true;
}

export function leaveShop(state) {
  state.day += 1;
  if (state.day > TOTAL_DAYS) { finishWin(state); return; }
  state.screen = 'play';
  beginDay(state);
}

export function finishWin(state) {
  state.screen = 'win';
  saveBest(state);
}

export function finishLose(state) {
  state.screen = 'lose';
  saveBest(state);
}

function saveBest(state) {
  const score = state.totalEarned;
  if (score > state.best) {
    state.best = score;
    try { localStorage.setItem('ember-anvil-best', String(score)); } catch (e) {}
  }
}

export function restartToTitle(state) {
  const fresh = createGame();
  const best = state.best;
  Object.assign(state, fresh);
  state.best = best;
  state.screen = 'title';
}
