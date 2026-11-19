// Vela Bay: a seeded grid city. Roads run on a 400 px grid; the blocks between
// them hold buildings, parks and plazas; the south edge is the harbour water.
import { WORLD, PALETTE } from './config.js';

export function createCity(random) {
  const roadsV = [];
  const roadsH = [];
  for (let x = 200; x <= WORLD.width - 200; x += WORLD.blockGap) roadsV.push(x);
  for (let y = 200; y <= WORLD.height - 400; y += WORLD.blockGap) roadsH.push(y);

  const buildings = [];
  const parks = [];
  const trees = [];
  const lamps = [];

  // Blocks are the cells between neighbouring roads.
  for (let i = 0; i < roadsV.length - 1; i++) {
    for (let j = 0; j < roadsH.length - 1; j++) {
      const x0 = roadsV[i] + WORLD.roadWidth / 2 + 14;
      const y0 = roadsH[j] + WORLD.roadWidth / 2 + 14;
      const x1 = roadsV[i + 1] - WORLD.roadWidth / 2 - 14;
      const y1 = roadsH[j + 1] - WORLD.roadWidth / 2 - 14;
      const w = x1 - x0;
      const h = y1 - y0;
      if (random.chance(0.16)) {
        parks.push({ x: x0, y: y0, w, h });
        const n = random.int(4, 9);
        for (let t = 0; t < n; t++) {
          trees.push({ x: random.range(x0 + 16, x1 - 16), y: random.range(y0 + 16, y1 - 16), r: random.range(7, 12) });
        }
        continue;
      }
      // 1-4 buildings per block, laid out in a small grid.
      const cols = random.chance(0.5) ? 2 : 1;
      const rows = random.chance(0.5) ? 2 : 1;
      const cw = w / cols;
      const ch = h / rows;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (random.chance(0.12)) continue;
          const bw = cw * random.range(0.55, 0.82);
          const bh = ch * random.range(0.55, 0.82);
          const bx = x0 + c * cw + (cw - bw) / 2;
          const by = y0 + r * ch + (ch - bh) / 2;
          buildings.push({
            x: bx,
            y: by,
            w: bw,
            h: bh,
            color: random.pick(PALETTE.building),
            neon: random.pick(PALETTE.neon),
            sign: random.chance(0.45),
            floors: random.int(1, 6),
          });
        }
      }
    }
  }

  // Street lamps along the roads.
  for (const x of roadsV) {
    for (const y of roadsH) {
      lamps.push({ x: x - WORLD.roadWidth / 2 - 8, y: y - WORLD.roadWidth / 2 - 8 });
    }
  }

  const waterY = WORLD.height - 120;

  function onRoad(x, y) {
    const rw = WORLD.roadWidth / 2;
    for (const rx of roadsV) if (Math.abs(x - rx) <= rw) return true;
    for (const ry of roadsH) if (Math.abs(y - ry) <= rw) return true;
    return false;
  }

  // Circle vs building AABBs: push the circle out, report whether it hit.
  function collideCircle(p, r) {
    let hit = false;
    for (const b of buildings) {
      const cx = Math.max(b.x, Math.min(p.x, b.x + b.w));
      const cy = Math.max(b.y, Math.min(p.y, b.y + b.h));
      const dx = p.x - cx;
      const dy = p.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        hit = true;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          p.x = cx + (dx / d) * r;
          p.y = cy + (dy / d) * r;
        } else {
          p.y = b.y - r;
        }
      }
    }
    return hit;
  }

  function inWater(x, y) {
    return y >= waterY;
  }

  function randomRoadPoint() {
    if (random.chance(0.5)) {
      const x = random.pick(roadsV);
      return { x: x + random.range(-20, 20), y: random.range(120, waterY - 120), along: 'v' };
    }
    const y = random.pick(roadsH);
    return { x: random.range(120, WORLD.width - 120), y: y + random.range(-20, 20), along: 'h' };
  }

  return {
    roadsV,
    roadsH,
    buildings,
    parks,
    trees,
    lamps,
    waterY,
    onRoad,
    collideCircle,
    inWater,
    randomRoadPoint,
  };
}
