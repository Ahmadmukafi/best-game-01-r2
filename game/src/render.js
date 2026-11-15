// render.js — every pixel of Ember & Anvil is drawn here on one canvas.
// One job: draw the forge, the HUD, the stage panels and every screen.
// It registers the clickable buttons with the input layer each frame.
import { CANVAS_WIDTH, CANVAS_HEIGHT, ORDER_TYPES, UPGRADES, PALETTE, MAX_HEARTS } from './config.js';
import { orderQuota, currentOrderType } from './state.js';
import { inHeatBand, hammerSpotWidth, quenchBandWidth } from './stages.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function heart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 20, s / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 11, -4, 0, 6);
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.red : '#3a2a22';
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
}

// A small vector icon for each order type, drawn on the anvil.
function drawOrderIcon(ctx, icon, cx, cy, s, glow) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.strokeStyle = glow ? '#ffd34d' : '#c8ccd2';
  ctx.fillStyle = glow ? '#ffb347' : '#8d97a3';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const u = s / 2;
  if (icon === 'horseshoe') {
    ctx.beginPath();
    ctx.arc(0, -u * 0.1, u * 0.8, Math.PI * 0.15, Math.PI * 0.85, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -u * 0.1, u * 0.55, Math.PI * 0.2, Math.PI * 0.8, false);
    ctx.stroke();
  } else if (icon === 'dagger' || icon === 'sword') {
    const len = icon === 'sword' ? u * 1.5 : u * 1.1;
    ctx.beginPath();
    ctx.moveTo(0, -len);
    ctx.lineTo(u * 0.28, -u * 0.2);
    ctx.lineTo(0, u * 0.1);
    ctx.lineTo(-u * 0.28, -u * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeRect(-u * 0.45, u * 0.1, u * 0.9, u * 0.18);
    ctx.fillRect(-u * 0.12, u * 0.28, u * 0.24, u * 0.7);
  } else if (icon === 'shield') {
    ctx.beginPath();
    ctx.moveTo(0, -u);
    ctx.lineTo(u * 0.85, -u * 0.6);
    ctx.lineTo(u * 0.7, u * 0.3);
    ctx.quadraticCurveTo(u * 0.4, u * 0.9, 0, u);
    ctx.quadraticCurveTo(-u * 0.4, u * 0.9, -u * 0.7, u * 0.3);
    ctx.lineTo(-u * 0.85, -u * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.55);
    ctx.lineTo(0, u * 0.55);
    ctx.stroke();
  } else if (icon === 'breastplate') {
    rr(ctx, -u * 0.8, -u * 0.9, u * 1.6, u * 1.8, u * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#ffd34d';
    ctx.beginPath();
    ctx.moveTo(-u * 0.8, 0);
    ctx.lineTo(u * 0.8, 0);
    ctx.stroke();
  } else if (icon === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-u, u * 0.6);
    ctx.lineTo(-u, -u * 0.2);
    ctx.lineTo(-u * 0.5, u * 0.1);
    ctx.lineTo(0, -u * 0.8);
    ctx.lineTo(u * 0.5, u * 0.1);
    ctx.lineTo(u, -u * 0.2);
    ctx.lineTo(u, u * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(0, -u * 0.1, u * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawForge(ctx, state, t) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  g.addColorStop(0, PALETTE.bgTop);
  g.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // Brick wall.
  ctx.fillStyle = PALETTE.brick;
  for (let row = 0; row < 4; row++) {
    for (let col = -1; col < 12; col++) {
      const w = 118, h = 34, x = col * w + (row % 2 ? 59 : 0), y = 70 + row * 36;
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 200, CANVAS_WIDTH, 340);
  // Furnace, left, with a breathing glow.
  const flicker = 0.75 + 0.25 * Math.sin(t * 3.1) * Math.sin(t * 1.7);
  const fg = ctx.createRadialGradient(210, 330, 20, 210, 330, 190);
  fg.addColorStop(0, `rgba(255,150,40,${0.55 * flicker})`);
  fg.addColorStop(1, 'rgba(255,110,20,0)');
  ctx.fillStyle = fg;
  ctx.fillRect(20, 140, 380, 400);
  ctx.fillStyle = '#2b1a12';
  rr(ctx, 70, 180, 280, 300, 18);
  ctx.fill();
  ctx.fillStyle = '#120a07';
  rr(ctx, 110, 260, 200, 150, 12);
  ctx.fill();
  const cg = ctx.createRadialGradient(210, 335, 8, 210, 335, 95);
  cg.addColorStop(0, '#ffe08a');
  cg.addColorStop(0.5, '#ff7a1a');
  cg.addColorStop(1, '#7a1e00');
  ctx.fillStyle = cg;
  rr(ctx, 120, 270, 180, 130, 10);
  ctx.fill();
  text(ctx, 'FORGE', 210, 215, 26, PALETTE.cream, 'center');
  // Anvil, centre.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(520, 470, 240, 26);
  ctx.fillStyle = PALETTE.ironDark;
  rr(ctx, 500, 400, 280, 70, 10);
  ctx.fill();
  ctx.fillStyle = PALETTE.iron;
  rr(ctx, 490, 385, 300, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#aeb6c0';
  ctx.fillRect(490, 385, 300, 8);
  // Workpiece on the anvil.
  if (state.order) {
    const type = ORDER_TYPES[state.order.type];
    const heat = state.stages ? state.stages.heat.temp : 20;
    drawOrderIcon(ctx, type.icon, 640, 372, 74, heat > 55);
  }
  // Rising embers.
  for (const e of state.embers) {
    ctx.globalAlpha = Math.max(0, e.life);
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Wooden floor.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, 540, CANVAS_WIDTH, 180);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x < CANVAS_WIDTH; x += 90) ctx.fillRect(x, 540, 3, 180);
}

function drawHud(ctx, state) {
  ctx.fillStyle = 'rgba(12,7,4,0.92)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 64);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, 64, CANVAS_WIDTH, 3);
  text(ctx, 'EMBER & ANVIL', 24, 33, 26, PALETTE.gold);
  text(ctx, `DAY ${state.day} / 5`, 250, 33, 22, PALETTE.cream);
  text(ctx, `GOLD ${state.gold}`, 400, 33, 22, PALETTE.gold);
  for (let i = 0; i < MAX_HEARTS; i++) heart(ctx, 560 + i * 30, 32, 22, i < state.hearts);
  const comboMult = (1 + 0.2 * Math.min(state.combo, 5)).toFixed(1);
  text(ctx, `COMBO x${comboMult}`, 760, 33, 20, state.combo >= 3 ? PALETTE.emberBright : PALETTE.muted);
  // Quota pips.
  const quota = orderQuota(state);
  for (let i = 0; i < quota; i++) {
    ctx.beginPath();
    ctx.arc(920 + i * 28, 32, 10, 0, Math.PI * 2);
    ctx.fillStyle = i < state.ordersDoneToday ? PALETTE.green : '#3a2a22';
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  text(ctx, 'QUOTA', 890, 12, 11, PALETTE.muted);
  // Day timer bar.
  const frac = Math.max(0, state.dayTimeLeft / state.dayTimeTotal);
  ctx.fillStyle = '#3a2a22';
  rr(ctx, 1060, 22, 190, 20, 10);
  ctx.fill();
  ctx.fillStyle = frac > 0.3 ? PALETTE.blue : PALETTE.red;
  if (frac > 0) { rr(ctx, 1060, 22, 190 * frac, 20, 10); ctx.fill(); }
  text(ctx, `${Math.ceil(state.dayTimeLeft)}s`, 1155, 33, 16, '#fff', 'center');
}

function drawOrderBoard(ctx, state) {
  const x = 900, y = 90, w = 356, h = 200;
  ctx.fillStyle = 'rgba(29,19,13,0.94)';
  rr(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 12);
  ctx.stroke();
  text(ctx, 'ORDER BOARD', x + 18, y + 26, 18, PALETTE.gold);
  if (!state.order) {
    text(ctx, 'No order right now.', x + 18, y + 70, 18, PALETTE.cream);
    return;
  }
  const type = ORDER_TYPES[state.order.type];
  text(ctx, state.order.customer, x + 18, y + 58, 17, PALETTE.muted);
  text(ctx, `wants a ${type.label}`, x + 18, y + 86, 20, PALETTE.cream);
  drawOrderIcon(ctx, type.icon, x + 300, y + 90, 64, false);
  text(ctx, `Base pay ${type.basePay} gold`, x + 18, y + 118, 17, PALETTE.gold);
  const stageNames = ['1 Heat', '2 Hammer', '3 Quench'];
  const stageKeys = ['heat', 'hammer', 'quench'];
  stageKeys.forEach((k, i) => {
    const done = state.stageScores[k] > 0 || (k === 'heat' && state.stage === 'hammer') || (k === 'hammer' && state.stage === 'quench');
    const active = state.stage === k;
    ctx.fillStyle = active ? PALETTE.ember : done ? PALETTE.green : '#3a2a22';
    ctx.beginPath();
    ctx.arc(x + 30 + i * 110, y + 160, 12, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, stageNames[i], x + 48 + i * 110, y + 161, 15, active ? '#fff' : PALETTE.cream);
  });
}

function drawStagePanel(ctx, state, input) {
  const x = 40, y = 552, w = 1200, h = 148;
  ctx.fillStyle = 'rgba(29,19,13,0.96)';
  rr(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  rr(ctx, x, y, w, h, 14);
  ctx.stroke();
  const buttons = [];
  if (state.result) {
    const r = state.result;
    const title = r.ruined ? 'ORDER RUINED!' : `Quality ${r.quality} — ${r.label} done!`;
    text(ctx, title, 640, y + 42, 30, r.ruined ? PALETTE.red : PALETTE.green, 'center');
    const payLine = r.ruined
      ? 'Too cold, too wild — the piece cracked. -1 heart.'
      : `Paid ${r.pay} gold${r.tip > 0 ? ` + ${r.tip} tip!` : ''}${state.combo > 0 ? `  Combo x${(1 + 0.2 * Math.min(state.combo, 5)).toFixed(1)}` : ''}`;
    text(ctx, payLine, 640, y + 82, 20, PALETTE.cream, 'center');
    text(ctx, 'Next order coming…', 640, y + 116, 16, PALETTE.muted, 'center');
    input.setButtons(buttons);
    return buttons;
  }
  if (!state.order) { input.setButtons(buttons); return buttons; }
  const type = currentOrderType(state);
  const st = state.stages;
  if (state.stage === 'heat') {
    text(ctx, 'STAGE 1 — HEAT: hold SPACE (or mouse) to pump the bellows', 70, y + 30, 20, PALETTE.cream);
    text(ctx, 'Lock the temperature inside the green band with ENTER or the LOCK button.', 70, y + 56, 16, PALETTE.muted);
    const bx = 70, by = y + 78, bw = 760, bh = 34;
    ctx.fillStyle = '#120a07';
    rr(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.green;
    const bandW = ((86 - 62) / 100) * bw;
    ctx.fillRect(bx + (62 / 100) * bw, by, bandW, bh);
    const tw = (st.heat.temp / 100) * bw;
    const tg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    tg.addColorStop(0, '#3a6ea5');
    tg.addColorStop(0.6, '#ff7a1a');
    tg.addColorStop(1, '#ff2e00');
    ctx.fillStyle = tg;
    if (tw > 0) { rr(ctx, bx, by, Math.max(tw, 6), bh, 8); ctx.fill(); }
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx + tw - 2, by - 6, 4, bh + 12);
    text(ctx, `${Math.round(st.heat.temp)}°`, bx + bw + 18, by + 17, 22, '#fff');
    const lockBtn = { id: 'lock', x: 960, y: by - 8, w: 150, h: 50 };
    ctx.fillStyle = inHeatBand(st.heat.temp) ? PALETTE.green : PALETTE.wood;
    rr(ctx, lockBtn.x, lockBtn.y, lockBtn.w, lockBtn.h, 10);
    ctx.fill();
    text(ctx, 'LOCK  [Enter]', lockBtn.x + 75, lockBtn.y + 25, 18, '#fff', 'center');
    buttons.push(lockBtn);
  } else if (state.stage === 'hammer') {
    text(ctx, `STAGE 2 — HAMMER: press SPACE (or click) when the marker crosses the glowing weak spot`, 70, y + 30, 20, PALETTE.cream);
    text(ctx, `Strikes: ${state.order.strikes} / 3 — dead centre scores 100.`, 70, y + 56, 16, PALETTE.muted);
    const bx = 70, by = y + 78, bw = 760, bh = 34;
    ctx.fillStyle = '#120a07';
    rr(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    const spotW = hammerSpotWidth(state);
    ctx.fillStyle = 'rgba(255,211,77,0.85)';
    ctx.fillRect(bx + ((state.order.spotCenter - spotW / 2) / 100) * bw, by, (spotW / 100) * bw, bh);
    const mx = bx + (st.hammer.pos / 100) * bw;
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx - 3, by - 6, 6, bh + 12);
    const strikeBtn = { id: 'strike', x: 960, y: by - 8, w: 150, h: 50 };
    ctx.fillStyle = PALETTE.ember;
    rr(ctx, strikeBtn.x, strikeBtn.y, strikeBtn.w, strikeBtn.h, 10);
    ctx.fill();
    text(ctx, 'STRIKE [Space]', strikeBtn.x + 75, strikeBtn.y + 25, 18, '#fff', 'center');
    buttons.push(strikeBtn);
  } else if (state.stage === 'quench') {
    const bandW = quenchBandWidth(state, type);
    text(ctx, 'STAGE 3 — QUENCH: press SPACE (or click) to stop the needle in the blue band', 70, y + 30, 20, PALETTE.cream);
    text(ctx, 'Dead centre tempers it perfectly. Too far either way and the steel turns brittle.', 70, y + 56, 16, PALETTE.muted);
    const bx = 70, by = y + 78, bw = 760, bh = 34;
    ctx.fillStyle = '#120a07';
    rr(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.blue;
    ctx.fillRect(bx + ((50 - bandW / 2) / 100) * bw, by, (bandW / 100) * bw, bh);
    ctx.fillStyle = '#bfe6ff';
    ctx.fillRect(bx + ((50 - 4) / 100) * bw, by, (8 / 100) * bw, bh);
    const nx = bx + (st.quench.pos / 100) * bw;
    ctx.fillStyle = '#fff';
    ctx.fillRect(nx - 3, by - 6, 6, bh + 12);
    const qBtn = { id: 'quench', x: 960, y: by - 8, w: 150, h: 50 };
    ctx.fillStyle = PALETTE.blue;
    rr(ctx, qBtn.x, qBtn.y, qBtn.w, qBtn.h, 10);
    ctx.fill();
    text(ctx, 'STOP [Space]', qBtn.x + 75, qBtn.y + 25, 18, '#fff', 'center');
    buttons.push(qBtn);
  }
  if (state.banner && state.bannerTimer > 0) {
    text(ctx, state.banner, 640, y - 14, 18, PALETTE.emberBright, 'center');
  }
  input.setButtons(buttons);
  return buttons;
}

function drawTitle(ctx, state, input) {
  ctx.fillStyle = 'rgba(10,5,3,0.82)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const g = ctx.createRadialGradient(640, 300, 40, 640, 300, 420);
  g.addColorStop(0, 'rgba(255,122,26,0.35)');
  g.addColorStop(1, 'rgba(255,122,26,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawOrderIcon(ctx, 'crown', 640, 130, 110, true);
  text(ctx, 'EMBER & ANVIL', 640, 250, 64, PALETTE.gold, 'center');
  text(ctx, 'A forge-master arcade game', 640, 300, 24, PALETTE.cream, 'center');
  text(ctx, 'Five days. One forge. Forge every order — Horseshoe to the Crown of Embers.', 640, 340, 19, PALETTE.muted, 'center');
  text(ctx, 'Heat it. Hammer it. Quench it. Get paid for quality.', 640, 368, 19, PALETTE.muted, 'center');
  const btn = { id: 'start', x: 490, y: 410, w: 300, h: 64 };
  ctx.fillStyle = PALETTE.ember;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fill();
  text(ctx, 'START FORGING  [Enter]', 640, 442, 22, '#fff', 'center');
  text(ctx, 'SPACE pump / strike / stop  •  ENTER lock & continue  •  M mute  •  R restart', 640, 510, 17, PALETTE.cream, 'center');
  text(ctx, 'Tips at quality 85+. Combos multiply pay up to x2. Three hearts — spend them wisely.', 640, 540, 17, PALETTE.cream, 'center');
  if (state.best > 0) text(ctx, `Best earnings: ${state.best} gold`, 640, 580, 18, PALETTE.gold, 'center');
  text(ctx, 'An original game — its own art, sounds and names.', 640, 640, 15, PALETTE.muted, 'center');
  input.setButtons([btn]);
}

function drawShop(ctx, state, input) {
  ctx.fillStyle = 'rgba(10,5,3,0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  text(ctx, `DAY ${state.day} DONE — THE SHOP`, 640, 90, 40, PALETTE.gold, 'center');
  text(ctx, `Gold: ${state.gold}   •   Hearts: ${state.hearts}   •   Tomorrow: Day ${state.day + 1} of 5`, 640, 135, 20, PALETTE.cream, 'center');
  const buttons = [];
  UPGRADES.forEach((u, i) => {
    const x = 90 + i * 290, y = 190, w = 260, h = 250;
    const owned = state.upgrades[u.id];
    const afford = state.gold >= u.cost;
    ctx.fillStyle = owned ? '#1f2a1a' : 'rgba(29,19,13,0.97)';
    rr(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = owned ? PALETTE.green : PALETTE.panelEdge;
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 14);
    ctx.stroke();
    text(ctx, u.name, x + 20, y + 36, 21, PALETTE.cream);
    text(ctx, `${u.cost} gold`, x + 20, y + 70, 20, PALETTE.gold);
    const words = wrapText(u.desc, 30);
    words.forEach((line, j) => text(ctx, line, x + 20, y + 110 + j * 24, 16, PALETTE.muted));
    const btn = { id: `shop-${i + 1}`, x: x + 20, y: y + 180, w: 220, h: 46 };
    ctx.fillStyle = owned ? PALETTE.green : afford ? PALETTE.ember : '#4a3a30';
    rr(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fill();
    text(ctx, owned ? 'OWNED' : `BUY  [${i + 1}]`, btn.x + 110, btn.y + 23, 18, '#fff', 'center');
    buttons.push(btn);
  });
  const cont = { id: 'continue', x: 490, y: 500, w: 300, h: 60 };
  ctx.fillStyle = PALETTE.ember;
  rr(ctx, cont.x, cont.y, cont.w, cont.h, 12);
  ctx.fill();
  text(ctx, `START DAY ${state.day + 1}  [Enter]`, 640, 530, 20, '#fff', 'center');
  buttons.push(cont);
  text(ctx, 'Upgrades stay for the whole run. The Crown of Embers waits on day 5.', 640, 610, 16, PALETTE.muted, 'center');
  input.setButtons(buttons);
}

function drawEnd(ctx, state, input, won) {
  ctx.fillStyle = 'rgba(10,5,3,0.88)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (won) {
    drawOrderIcon(ctx, 'crown', 640, 120, 120, true);
    text(ctx, 'THE CROWN OF EMBERS!', 640, 250, 52, PALETTE.gold, 'center');
    text(ctx, 'Masterwork delivered. The forge sings your name, smith.', 640, 300, 22, PALETTE.cream, 'center');
  } else {
    text(ctx, 'THE FORGE GOES COLD', 640, 230, 52, PALETTE.red, 'center');
    text(ctx, 'Out of hearts — the orders go to another smith.', 640, 290, 22, PALETTE.cream, 'center');
  }
  const lines = [
    `Gold earned: ${state.totalEarned}`,
    `Orders delivered: ${state.ordersDelivered}   •   Ruined: ${state.ordersRuined}`,
    `Best quality: ${state.bestQuality}   •   Best combo: x${(1 + 0.2 * Math.min(state.bestCombo, 5)).toFixed(1)}`,
    `Days survived: ${Math.min(state.day, 5)} of 5   •   Best earnings: ${state.best} gold`,
  ];
  lines.forEach((line, i) => text(ctx, line, 640, 350 + i * 34, 21, PALETTE.cream, 'center'));
  const btn = { id: 'restart', x: 490, y: 520, w: 300, h: 60 };
  ctx.fillStyle = PALETTE.ember;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fill();
  text(ctx, 'FORGE AGAIN  [R]', 640, 550, 20, '#fff', 'center');
  input.setButtons([btn]);
}

function wrapText(s, maxChars) {
  const words = s.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) { lines.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export function render(ctx, state, input, t) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (state.screen === 'title') {
    drawForge(ctx, state, t);
    drawTitle(ctx, state, input);
    return;
  }
  drawForge(ctx, state, t);
  drawHud(ctx, state);
  if (state.screen === 'play') {
    drawOrderBoard(ctx, state);
    drawStagePanel(ctx, state, input);
  } else if (state.screen === 'shop') {
    drawShop(ctx, state, input);
  } else if (state.screen === 'win') {
    drawEnd(ctx, state, input, true);
  } else if (state.screen === 'lose') {
    drawEnd(ctx, state, input, false);
  }
  if (state.paused && state.screen === 'play') {
    ctx.fillStyle = 'rgba(10,5,3,0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    text(ctx, 'PAUSED — press P to continue', 640, 360, 32, PALETTE.cream, 'center');
  }
}
