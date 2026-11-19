// Neon Harbor renderer: top-down canvas, camera on the player, HUD with wanted
// stars, health, money, weapon, mission objective and a live minimap.
import { WORLD, PALETTE, FONT, MISSIONS, GUNSHOP, GARAGE, HIDEOUT, HOSPITAL } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const VIEW_W = 1280;
const VIEW_H = 720;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let ox = 0;
  let oy = 0;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
    ox = (canvas.width - VIEW_W * scale) / 2;
    oy = (canvas.height - VIEW_H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function drawCarShape(car, isPlayer) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const l = car.len;
    const w = car.width;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-l / 2 + 3, -w / 2 + 4, l, w);
    ctx.fillStyle = car.color;
    roundRect(-l / 2, -w / 2, l, w, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(-l * 0.18, -w / 2 + 3, l * 0.28, w - 6);
    ctx.fillStyle = '#10151d';
    ctx.fillRect(l / 2 - 12, -w / 2 + 3, 8, 6);
    ctx.fillRect(l / 2 - 12, w / 2 - 9, 8, 6);
    if (car.kind === 'police') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-l / 2 + 6, -w / 2 + 2, l - 12, 5);
      ctx.fillStyle = '#d21f2b';
      ctx.fillRect(-4, -w / 2 - 2, 8, 5);
      ctx.fillStyle = '#2456ff';
      ctx.fillRect(4, -w / 2 - 2, 8, 5);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('VPD', 0, 3);
    }
    if (isPlayer) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.strokeRect(-l / 2 - 3, -w / 2 - 3, l + 6, w + 6);
    }
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPed(ped) {
    ctx.save();
    ctx.translate(ped.x, ped.y);
    ctx.rotate(ped.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 3, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.state === 'down' ? '#5a2e2e' : ped.color;
    ctx.beginPath();
    ctx.arc(0, 0, ped.state === 'cop' ? 12 : 10, 0, Math.PI * 2);
    ctx.fill();
    if (ped.state === 'cop') {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(-8, -14, 16, 4);
    }
    if (ped.state === 'rival') {
      ctx.fillStyle = '#ff4d5e';
      ctx.fillRect(-3, -20, 6, 8);
    }
    ctx.restore();
  }

  function drawCity(city, cam) {
    // Ground.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x - 40, cam.y - 40, VIEW_W + 80, VIEW_H + 80);
    // Parks.
    for (const park of city.parks) {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    // Water / harbour.
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(cam.x - 40, city.waterY, VIEW_W + 80, VIEW_H);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(cam.x - 40, city.waterY, VIEW_W + 80, 60);
    ctx.fillStyle = '#7a5c2e';
    ctx.fillRect(cam.x - 40, city.waterY - 14, VIEW_W + 80, 14);
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const x of city.roadsV) ctx.fillRect(x - WORLD.roadWidth / 2, cam.y - 40, WORLD.roadWidth, VIEW_H + 80);
    for (const y of city.roadsH) ctx.fillRect(cam.x - 40, y - WORLD.roadWidth / 2, VIEW_W + 80, WORLD.roadWidth);
    // Centre dashes.
    ctx.strokeStyle = PALETTE.roadLine;
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 22]);
    for (const x of city.roadsV) {
      ctx.beginPath();
      ctx.moveTo(x, cam.y - 40);
      ctx.lineTo(x, cam.y + VIEW_H + 40);
      ctx.stroke();
    }
    for (const y of city.roadsH) {
      ctx.beginPath();
      ctx.moveTo(cam.x - 40, y);
      ctx.lineTo(cam.x + VIEW_W + 40, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Trees.
    for (const t of city.trees) {
      ctx.fillStyle = '#2f7a3d';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3a1e';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Buildings with neon signs.
    for (const b of city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 8);
      ctx.fillStyle = 'rgba(255,220,120,0.75)';
      for (let wy = b.y + 18; wy < b.y + b.h - 10; wy += 22) {
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 18) {
          ctx.fillRect(wx, wy, 7, 9);
        }
      }
      if (b.sign) {
        ctx.fillStyle = b.neon;
        ctx.fillRect(b.x + b.w / 2 - 14, b.y - 4, 28, 7);
      }
    }
  }

  function drawMarker(x, y, r, color, pulse) {
    const rr = r + Math.sin(pulse * 4) * 6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = color + '33';
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.fill();
    // Beacon beam.
    ctx.fillStyle = color + '55';
    ctx.fillRect(x - 3, y - 90, 6, 90);
    ctx.beginPath();
    ctx.moveTo(x, y - 110);
    ctx.lineTo(x - 10, y - 88);
    ctx.lineTo(x + 10, y - 88);
    ctx.closePath();
    ctx.fill();
  }

  function drawMinimap(city, world, cam) {
    const mw = 210;
    const mh = 158;
    const mx = VIEW_W - mw - 16;
    const my = 16;
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    ctx.fillStyle = 'rgba(10,14,20,0.82)';
    roundRect(mx - 6, my - 6, mw + 12, mh + 12, 8);
    ctx.fill();
    ctx.fillStyle = '#14301f';
    ctx.fillRect(mx, my, mw, mh);
    ctx.fillStyle = '#0b3d5c';
    ctx.fillRect(mx, my + city.waterY * sy, mw, mh - city.waterY * sy);
    ctx.fillStyle = '#3a3f4a';
    for (const x of city.roadsV) ctx.fillRect(mx + x * sx - 1, my, 2, mh);
    for (const y of city.roadsH) ctx.fillRect(mx, my + y * sy, mw, 2);
    const step = world.currentStep ? world.currentStep() : null;
    if (step) {
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.arc(mx + step.x * sx, my + step.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff4d5e';
    for (const car of world.state.cars) {
      if (car.kind === 'police' && !car.dead) {
        ctx.beginPath();
        ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const p = world.state.player;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx + p.x * sx, my + p.y * sy, 7, 0, Math.PI * 2);
    ctx.stroke();
    // Viewport rectangle.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(mx + cam.x * sx, my + cam.y * sy, VIEW_W * sx, VIEW_H * sy);
  }

  function drawHUD(world, screen) {
    const s = world.state;
    const p = s.player;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Wanted stars.
    ctx.font = 'bold 26px ' + FONT;
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < s.wanted ? '★' : '☆';
    ctx.fillStyle = s.wanted > 0 ? PALETTE.star : 'rgba(255,255,255,0.35)';
    ctx.fillText(stars, 18, 44);
    // Money.
    ctx.font = 'bold 24px ' + FONT;
    ctx.fillStyle = PALETTE.money;
    ctx.fillText('$' + s.money.toLocaleString('en-US'), 18, 76);
    // Health bar.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(16, 88, 190, 16, 6);
    ctx.fill();
    ctx.fillStyle = p.health > 30 ? '#3ddc84' : '#ff4d5e';
    roundRect(18, 90, 186 * Math.max(0, p.health / 100), 12, 5);
    ctx.fill();
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText('HP ' + Math.ceil(p.health), 20, 101);
    // Weapon.
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillStyle = PALETTE.hud;
    const weapon = p.inCar ? 'DRIVING — ' + p.inCar.model : p.weapon === 'pistol' ? `PISTOL · ${p.ammo} rounds` : 'FISTS';
    ctx.fillText(weapon, 18, 128);
    if (p.inCar) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      roundRect(16, 136, 150, 14, 6);
      ctx.fill();
      ctx.fillStyle = p.inCar.health > 30 ? '#4f8ef7' : '#ff4d5e';
      roundRect(18, 138, 146 * Math.max(0, p.inCar.health / 100), 10, 4);
      ctx.fill();
      ctx.font = '13px ' + FONT;
      ctx.fillStyle = PALETTE.hud;
      ctx.fillText(Math.round(Math.abs(p.inCar.speed) * 0.36) + ' km/h', 20, 148);
    }
    // Clock (below the minimap, so it never overlaps it).
    const hh = Math.floor(s.clock / 3600);
    const mm = Math.floor((s.clock % 3600) / 60);
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText(String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), VIEW_W - 250, 204);
    // Mission tracker.
    const mission = s.allMissionsDone ? null : MISSIONS[s.missionIndex];
    const step = world.currentStep ? world.currentStep() : null;
    if (mission && step) {
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillStyle = '#ffe600';
      ctx.fillText(`JOB ${s.missionIndex + 1}/4 — ${mission.title}`, 18, 182);
      ctx.font = '15px ' + FONT;
      ctx.fillStyle = PALETTE.hud;
      ctx.fillText(step.text, 18, 204);
      if (step.type === 'grab' && s.stepProgress > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        roundRect(16, 212, 220, 12, 6);
        ctx.fill();
        ctx.fillStyle = '#ffe600';
        roundRect(18, 214, 216 * (s.stepProgress / (step.hold || 3)), 8, 4);
        ctx.fill();
      }
      if (step.type === 'clear') {
        ctx.fillText(`Rivals left: ${step.count - s.stepKills}`, 18, 226);
      }
    } else if (s.allMissionsDone) {
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillStyle = PALETTE.money;
      ctx.fillText('ALL JOBS DONE — Vela Bay is yours.', 18, 182);
    }
    // Off-screen mission arrow: point at the marker when it is outside the view.
    if (step) {
      const cam = s.camera ?? { x: 0, y: 0 };
      const mx = step.x - cam.x;
      const my = step.y - cam.y;
      if (mx < 0 || mx > VIEW_W || my < 0 || my > VIEW_H) {
        // Keep the arrow clear of the HUD (stars, money, health, mission text).
        const cx = Math.max(40, Math.min(VIEW_W - 40, mx));
        const cy = Math.max(240, Math.min(VIEW_H - 40, my));
        const a = Math.atan2(my - cy, mx - cx);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillStyle = '#ffe600';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -11);
        ctx.lineTo(-10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.font = 'bold 13px ' + FONT;
        ctx.fillStyle = '#ffe600';
        ctx.fillText(Math.round(Math.hypot(step.x - p.x, step.y - p.y)) + 'm', cx + 20, cy + 5);
      }
    }
    // Toasts.
    ctx.font = '15px ' + FONT;
    let ty = VIEW_H - 90;
    for (const t of s.toasts) {
      const w = ctx.measureText(t.text).width + 24;
      ctx.fillStyle = 'rgba(10,14,20,0.8)';
      roundRect(18, ty - 20, w, 28, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.hud;
      ctx.fillText(t.text, 30, ty);
      ty -= 36;
    }
    // Controls hint.
    ctx.font = '13px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('WASD move / drive · E enter car · F punch · Click shoot · B buy ammo · P pause', 18, VIEW_H - 14);
    if (s.busted || s.wasted) {
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.font = 'bold 64px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = s.busted ? '#4f8ef7' : '#ff4d5e';
      ctx.fillText(s.busted ? 'BUSTED' : 'WASTED', VIEW_W / 2, VIEW_H / 2 - 10);
      ctx.font = '20px ' + FONT;
      ctx.fillStyle = PALETTE.hud;
      ctx.fillText('The VPD impounded your ride. You wake up at St. Mercy Hospital.', VIEW_W / 2, VIEW_H / 2 + 30);
      ctx.textAlign = 'left';
    }
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.font = 'bold 48px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.hud;
      ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 20);
      ctx.font = '18px ' + FONT;
      ctx.fillText('Press P or Esc to resume · progress auto-saves', VIEW_W / 2, VIEW_H / 2 + 16);
      ctx.textAlign = 'left';
    }
  }

  function drawTitle(world, best) {
    const s = world.state;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#0b1026');
    g.addColorStop(0.55, '#3b1155');
    g.addColorStop(1, '#0b3d5c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Skyline silhouette.
    ctx.fillStyle = '#0a0e18';
    const skyline = [120, 200, 150, 260, 180, 230, 300, 170, 210, 260, 140, 190];
    let x = 0;
    for (const h of skyline) {
      ctx.fillRect(x, VIEW_H - 190 - h, 110, h + 190);
      x += 108;
    }
    ctx.fillStyle = 'rgba(255,46,136,0.8)';
    ctx.fillRect(0, VIEW_H - 196, VIEW_W, 3);
    ctx.font = 'bold 92px ' + FONT;
    ctx.textAlign = 'center';
    const tg = ctx.createLinearGradient(VIEW_W / 2 - 320, 0, VIEW_W / 2 + 320, 0);
    tg.addColorStop(0, '#ff2e88');
    tg.addColorStop(0.5, '#ffe600');
    tg.addColorStop(1, '#00e5ff');
    ctx.fillStyle = tg;
    ctx.fillText('NEON HARBOR', VIEW_W / 2, 190);
    ctx.font = 'bold 24px ' + FONT;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText('An open-world crime story in Vela Bay', VIEW_W / 2, 232);
    ctx.font = '17px ' + FONT;
    ctx.fillStyle = '#c9d1de';
    const lines = [
      'Kai Meridian owes the dock crew. Mara Voss has four jobs that pay it off.',
      'Steal cars, outrun the VPD, and finish every job to own the harbour.',
      '',
      'WASD — move / drive    E — enter or steal a car    F — punch',
      'Mouse — aim, Click — shoot    B — buy ammo at Harbor Arms    P — pause',
      'Your progress saves automatically in this browser.',
    ];
    let y = 300;
    for (const line of lines) {
      ctx.fillText(line, VIEW_W / 2, y);
      y += 30;
    }
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillStyle = '#ffd166';
    ctx.fillText('Press SPACE or CLICK to start', VIEW_W / 2, 566);
    if (best && best.cashEarned > 0) {
      ctx.font = '15px ' + FONT;
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText(`Best run: $${best.cashEarned.toLocaleString('en-US')} earned · ${best.missionsDone} jobs done`, VIEW_W / 2, 602);
    }
    ctx.textAlign = 'left';
    void s;
  }

  function drawOver(world, best) {
    const s = world.state;
    ctx.fillStyle = 'rgba(8,10,16,0.88)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.font = 'bold 56px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#7cff9e';
    ctx.fillText('VELA BAY IS YOURS', VIEW_W / 2, 260);
    ctx.font = '20px ' + FONT;
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText(`All four jobs complete. Total earned: $${s.stats.cashEarned.toLocaleString('en-US')}`, VIEW_W / 2, 310);
    ctx.fillText(`Cars stolen: ${s.stats.carsStolen} · Crimes: ${s.stats.crimes}`, VIEW_W / 2, 344);
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillStyle = '#ffd166';
    ctx.fillText('Press SPACE to play again', VIEW_W / 2, 420);
    ctx.textAlign = 'left';
    void best;
  }

  function draw(world, city, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (screen === SCREEN_TITLE) {
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      drawTitle(world, best);
      return;
    }
    if (screen === SCREEN_OVER) {
      ctx.setTransform(scale, 0, 0, scale, ox, oy);
      drawOver(world, best);
      return;
    }
    const s = world.state;
    const cam = s.camera ?? { x: 0, y: 0 };
    ctx.setTransform(scale, 0, 0, scale, ox - cam.x * scale, oy - cam.y * scale);
    drawCity(city, cam);
    // Landmarks.
    ctx.font = 'bold 13px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe600';
    ctx.fillText('MARA\u2019S GARAGE', GARAGE.x, GARAGE.y - 60);
    ctx.fillStyle = '#00e5ff';
    ctx.fillText('HARBOR ARMS', GUNSHOP.x, GUNSHOP.y - 60);
    ctx.fillStyle = '#7cff9e';
    ctx.fillText('HIDEOUT', HIDEOUT.x, HIDEOUT.y - 60);
    ctx.fillStyle = '#ff8fa3';
    ctx.fillText('ST. MERCY HOSPITAL', HOSPITAL.x, HOSPITAL.y - 60);
    ctx.textAlign = 'left';
    // Mission marker.
    const step = world.currentStep ? world.currentStep() : null;
    if (step) drawMarker(step.x, step.y, step.r, '#ffe600', s.time);
    // Pickups.
    for (const pk of s.pickups) {
      ctx.fillStyle = pk.kind === 'cash' ? '#7cff9e' : pk.kind === 'health' ? '#ff8fa3' : '#ffe600';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10151d';
      ctx.font = 'bold 11px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + 4);
      ctx.textAlign = 'left';
    }
    // Bullets.
    ctx.fillStyle = '#ffe600';
    for (const b of s.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cars (wrecked cars drawn dimmed).
    for (const car of s.cars) {
      if (car.dead) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        drawCarShape(car, false);
        ctx.restore();
        continue;
      }
      drawCarShape(car, car === s.player.inCar);
    }
    for (const ped of s.peds) drawPed(ped);
    // Player on foot.
    const p = s.player;
    if (!p.inCar) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(2, 4, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10151d';
      ctx.beginPath();
      ctx.arc(7, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // HUD in screen space.
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    drawHUD(world, screen);
    drawMinimap(city, world, cam);
  }

  return { draw, resize };
}
