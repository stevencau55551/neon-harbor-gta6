// Neon Harbor world: player, cars, pedestrians, police, wanted level, combat and
// the four-mission story chain. Fixed-step simulation; the renderer only paints.
import { WORLD, PLAYER, CAR, POLICE, WANTED, MISSIONS, GARAGE, HOSPITAL, GUNSHOP, PALETTE } from './config.js';
import { clamp, dist2, angleTo, angleDiff } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_SHOT = 1;
export const EVENT_HIT = 2;
export const EVENT_CRIME = 4;
export const EVENT_PICKUP = 8;
export const EVENT_MISSION = 16;
export const EVENT_WASTED = 32;
export const EVENT_BUSTED = 64;
export const EVENT_SIREN = 128;
export const EVENT_CAR_HIT = 256;

const CAR_MODELS = [
  { name: 'Comet GT', len: 56, color: '#e8e8e8' },
  { name: 'Vela Sedan', len: 54, color: '#4f8ef7' },
  { name: 'Harbor Taxi', len: 54, color: '#f2c94c' },
  { name: 'Dock Hauler', len: 62, color: '#3ddc84' },
  { name: 'Neon Coupe', len: 52, color: '#ff2e88' },
  { name: 'Bay Van', len: 60, color: '#b967ff' },
];

export function createWorld(city, random) {
  const state = {
    time: 0,
    clock: 8 * 3600,
    money: 40,
    wanted: 0,
    lastCrimeAt: -999,
    lastDecayAt: 0,
    missionIndex: 0,
    stepIndex: 0,
    stepProgress: 0,
    stepKills: 0,
    missionDone: false,
    allMissionsDone: false,
    stats: { crimes: 0, carsStolen: 0, missionsDone: 0, cashEarned: 0 },
    toasts: [],
    player: null,
    cars: [],
    peds: [],
    bullets: [],
    pickups: [],
    targetCar: null,
    rivals: [],
    policeTimer: 0,
    trafficTimer: 0,
    pedTimer: 0,
    busted: false,
    wasted: false,
  };

  function toast(text, ms = 3600) {
    state.toasts.push({ text, until: state.time + ms / 1000 });
    if (state.toasts.length > 3) state.toasts.shift();
  }

  function makeCar(x, y, angle, kind, model) {
    const m = model ?? random.pick(CAR_MODELS);
    return {
      x, y, angle, speed: 0, health: CAR.health,
      kind, model: m.name, color: kind === 'police' ? PALETTE.policeCar : m.color,
      len: m.len, width: CAR.width, driver: kind !== 'parked', dead: false,
      turnTarget: angle, cruise: random.range(120, 190), stuck: 0,
    };
  }

  function spawnPlayerCar() {
    const car = makeCar(GARAGE.x + 60, GARAGE.y + 40, -Math.PI / 2, 'owned');
    car.color = '#ffd166';
    car.model = 'Kai\u2019s Runner';
    state.cars.push(car);
    return car;
  }

  function newPlayer() {
    return {
      x: GARAGE.x, y: GARAGE.y + 90, angle: -Math.PI / 2, health: PLAYER.health,
      weapon: 'fists', ammo: 0, hasPistol: false, inCar: null,
      punchCd: 0, shootCd: 0, hurtCd: 0, run: false, moving: false,
    };
  }

  function reset() {
    state.time = 0;
    state.money = 40;
    state.wanted = 0;
    state.missionIndex = 0;
    state.stepIndex = 0;
    state.stepProgress = 0;
    state.stepKills = 0;
    state.missionDone = false;
    state.allMissionsDone = false;
    state.stats = { crimes: 0, carsStolen: 0, missionsDone: 0, cashEarned: 0 };
    state.toasts = [];
    state.cars = [];
    state.peds = [];
    state.bullets = [];
    state.pickups = [];
    state.targetCar = null;
    state.rivals = [];
    state.busted = false;
    state.wasted = false;
    state.player = newPlayer();
    spawnPlayerCar();
    for (let i = 0; i < 10; i++) spawnTraffic();
    for (let i = 0; i < 16; i++) spawnPed();
    toast('Welcome to Vela Bay. See Mara at the garage — follow the yellow marker.');
  }

  function addWanted(n) {
    state.wanted = clamp(state.wanted + n, 0, WANTED.maxStars);
    state.lastCrimeAt = state.time;
    state.stats.crimes += 1;
    return EVENT_CRIME;
  }

  function spawnTraffic() {
    const p = city.randomRoadPoint();
    const angle = p.along === 'v' ? (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (random.chance(0.5) ? 0 : Math.PI);
    const car = makeCar(p.x, p.y, angle, 'traffic');
    car.speed = car.cruise;
    state.cars.push(car);
  }

  function spawnPed() {
    const p = city.randomRoadPoint();
    state.peds.push({
      x: p.x + random.range(-40, 40), y: p.y + random.range(-40, 40),
      angle: random.range(0, Math.PI * 2), speed: random.range(28, 55),
      health: 30, state: 'walk', color: random.pick(PALETTE.ped),
      timer: random.range(2, 6), fleeX: 0, fleeY: 0,
    });
  }

  function spawnPoliceCar() {
    const p = state.player;
    const edge = city.randomRoadPoint();
    const car = makeCar(edge.x, edge.y, angleTo(edge.x, edge.y, p.x, p.y), 'police');
    car.color = PALETTE.policeCar;
    car.model = 'VPD Interceptor';
    car.cruise = POLICE.chaseSpeed;
    state.cars.push(car);
    return car;
  }

  function spawnFootCop() {
    const p = state.player;
    const a = random.range(0, Math.PI * 2);
    state.peds.push({
      x: clamp(p.x + Math.cos(a) * 420, 60, WORLD.width - 60),
      y: clamp(p.y + Math.sin(a) * 420, 60, WORLD.height - 60),
      angle: 0, speed: 265, health: 60, state: 'cop',
      color: '#1c2733', timer: 0, fleeX: 0, fleeY: 0,
    });
  }

  function spawnRivals(n, x, y) {
    state.rivals = [];
    for (let i = 0; i < n; i++) {
      const rival = {
        x: x + random.range(-90, 90), y: y + random.range(-90, 90),
        angle: 0, speed: 150, health: 60, state: 'rival',
        color: '#c1121f', timer: random.range(1, 2), shootCd: random.range(0.5, 1.5),
        fleeX: 0, fleeY: 0,
      };
      // Rivals live in the pedestrian list (drawn, updated, hittable) and are
      // also tracked here so the clear step can count them.
      state.rivals.push(rival);
      state.peds.push(rival);
    }
  }

  function spawnTargetCar(x, y) {
    const car = makeCar(x, y, 0, 'parked', CAR_MODELS[0]);
    car.driver = false;
    state.cars.push(car);
    state.targetCar = car;
    return car;
  }

  function dropPickup(x, y, kind) {
    state.pickups.push({ x, y, kind, t: 0 });
  }

  function damagePlayer(amount, events) {
    const p = state.player;
    if (p.hurtCd > 0 || p.health <= 0) return events;
    p.health -= amount;
    p.hurtCd = 0.5;
    if (p.health <= 0) {
      p.health = 0;
      return events | EVENT_WASTED;
    }
    return events | EVENT_HIT;
  }

  function respawn(kind) {
    const p = state.player;
    const lost = Math.floor(state.money * 0.2);
    state.money -= lost;
    state.wanted = 0;
    state.busted = kind === 'busted';
    state.wasted = kind === 'wasted';
    p.health = PLAYER.health;
    p.x = HOSPITAL.x;
    p.y = HOSPITAL.y;
    p.angle = Math.PI / 2;
    if (p.inCar) {
      p.inCar.dead = true;
      p.inCar = null;
    }
    p.ammo = Math.floor(p.ammo / 2);
    toast(kind === 'busted' ? `Busted! The VPD took $${lost} and your ride.` : `Wasted! Hospital bill: $${lost}.`);
  }

  function currentStep() {
    if (state.allMissionsDone) return null;
    return MISSIONS[state.missionIndex].steps[state.stepIndex];
  }

  function completeStep(events) {
    const mission = MISSIONS[state.missionIndex];
    state.stepIndex += 1;
    state.stepProgress = 0;
    state.stepKills = 0;
    if (state.stepIndex >= mission.steps.length) {
      state.money += mission.reward;
      state.stats.cashEarned += mission.reward;
      state.stats.missionsDone += 1;
      if (mission.grantPistol && !state.player.hasPistol) {
        state.player.hasPistol = true;
        state.player.weapon = 'pistol';
        state.player.ammo += 24;
        toast(`Mission complete: ${mission.title} — $${mission.reward}. Mara gave you a pistol.`);
      } else {
        toast(`Mission complete: ${mission.title} — $${mission.reward}.`);
      }
      state.missionIndex += 1;
      state.stepIndex = 0;
      if (state.missionIndex >= MISSIONS.length) {
        state.allMissionsDone = true;
        state.missionDone = true;
        toast('All jobs done. Vela Bay is yours, Kai.');
      } else {
        toast(`New job: ${MISSIONS[state.missionIndex].title} — ${MISSIONS[state.missionIndex].brief}`);
      }
      return events | EVENT_MISSION;
    }
    return events;
  }

  function updateMission(dt, events) {
    const step = currentStep();
    if (!step) return events;
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    if (step.type === 'goto' || step.type === 'deliverCar') {
      // A reloaded save mid-delivery has no target car yet: put the Comet back
      // where the player left off so the job can always finish.
      if (step.type === 'deliverCar' && !state.targetCar) spawnTargetCar(px, py);
      if (step.type === 'deliverCar' && (!p.inCar || p.inCar !== state.targetCar)) return events;
      if (dist2(px, py, step.x, step.y) < step.r * step.r) return completeStep(events);
    } else if (step.type === 'steal') {
      if (!state.targetCar) spawnTargetCar(step.x, step.y);
      if (p.inCar === state.targetCar) {
        state.stats.carsStolen += 1;
        events |= addWanted(2);
        toast('The Comet GT is yours — get it to the garage!');
        return completeStep(events);
      }
    } else if (step.type === 'clear') {
      if (state.rivals.length === 0 && state.stepKills === 0) spawnRivals(step.count, step.x, step.y);
      if (state.stepKills >= step.count) return completeStep(events);
    } else if (step.type === 'grab') {
      if (dist2(px, py, step.x, step.y) < step.r * step.r) {
        state.stepProgress += dt;
        if (state.stepProgress >= (step.hold || 3)) {
          events |= addWanted(2);
          return completeStep(events);
        }
      } else {
        state.stepProgress = 0;
      }
    } else if (step.type === 'escape') {
      if (state.wanted === 0 && dist2(px, py, step.x, step.y) < step.r * step.r) return completeStep(events);
    }
    return events;
  }

  function updatePlayer(dt, input, actions, events) {
    const p = state.player;
    p.punchCd = Math.max(0, p.punchCd - dt);
    p.shootCd = Math.max(0, p.shootCd - dt);
    p.hurtCd = Math.max(0, p.hurtCd - dt);
    const mx = input.moveX();
    const my = input.moveY();

    if (p.inCar) {
      const car = p.inCar;
      // Driving: W/S throttle, A/D steer.
      if (my < 0) car.speed += CAR.accel * dt;
      else if (my > 0) car.speed -= CAR.brake * dt;
      else {
        car.speed -= car.speed * CAR.drag * dt;
        if (Math.abs(car.speed) < 4) car.speed = 0;
      }
      car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
      const steer = mx * CAR.turnRate * clamp(Math.abs(car.speed) / 160, 0, 1) * (car.speed < 0 ? -1 : 1);
      car.angle += steer * dt;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      const probe = { x: nx, y: ny };
      city.collideCircle(probe, CAR.width * 0.62);
      if (city.inWater(probe.x, probe.y)) {
        car.speed *= -0.4;
      } else {
        car.x = probe.x;
        car.y = probe.y;
      }
      car.x = clamp(car.x, 30, WORLD.width - 30);
      car.y = clamp(car.y, 30, WORLD.height - 30);
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      if (actions & 4) {
        // E: get out.
        p.inCar = null;
        p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
        p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
        car.speed = 0;
      }
      return events;
    }

    // On foot.
    const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    let vx = mx;
    let vy = my;
    const len = Math.hypot(vx, vy);
    p.moving = len > 0;
    if (len > 0) {
      vx = (vx / len) * speed;
      vy = (vy / len) * speed;
      p.angle = Math.atan2(vy, vx);
      const probe = { x: p.x + vx * dt, y: p.y + vy * dt };
      city.collideCircle(probe, PLAYER.radius);
      if (!city.inWater(probe.x, probe.y)) {
        p.x = clamp(probe.x, 20, WORLD.width - 20);
        p.y = clamp(probe.y, 20, WORLD.height - 20);
      }
    }

    if (actions & 4) {
      // E: enter the nearest car.
      let best = null;
      let bestD = 80 * 80;
      for (const car of state.cars) {
        if (car.dead) continue;
        const d = dist2(p.x, p.y, car.x, car.y);
        if (d < bestD) {
          bestD = d;
          best = car;
        }
      }
      if (best) {
        if (best.kind === 'traffic' && best.driver) {
          best.driver = false;
          events |= addWanted(1);
          state.stats.carsStolen += 1;
          toast('Carjacked! The driver ran — and someone called the cops.');
          // The evicted driver becomes a fleeing pedestrian.
          state.peds.push({
            x: best.x + 30, y: best.y, angle: 0, speed: 200, health: 30,
            state: 'flee', color: '#e76f51', timer: 4, fleeX: best.x + 200, fleeY: best.y,
          });
        }
        p.inCar = best;
        best.speed = 0;
      }
    }

    if ((actions & 8) && p.punchCd <= 0) {
      p.punchCd = PLAYER.punchCooldown;
      events |= punch(p);
    }
    if ((actions & 16) && p.weapon === 'pistol' && p.shootCd <= 0 && p.ammo > 0) {
      p.shootCd = 0.22;
      p.ammo -= 1;
      events |= shoot(p, input);
    } else if ((actions & 16) && p.weapon === 'pistol' && p.ammo <= 0) {
      toast('Out of ammo — buy more at Harbor Arms (B near the shop).');
    }

    // Gun shop: B near the shop buys ammo.
    if ((actions & 32) && dist2(p.x, p.y, GUNSHOP.x, GUNSHOP.y) < 120 * 120) {
      if (state.money >= 50) {
        state.money -= 50;
        p.hasPistol = true;
        p.weapon = 'pistol';
        p.ammo += 30;
        toast('Harbor Arms: pistol + 30 rounds for $50.');
        events |= EVENT_PICKUP;
      } else {
        toast('Harbor Arms: ammo costs $50. You are short.');
      }
    }
    return events;
  }

  function punch(p) {
    let events = EVENT_NONE;
    const tx = p.x + Math.cos(p.angle) * PLAYER.punchRange;
    const ty = p.y + Math.sin(p.angle) * PLAYER.punchRange;
    for (const ped of state.peds) {
      if ((ped.state === 'rival' || ped.state === 'cop') && dist2(tx, ty, ped.x, ped.y) < 40 * 40) {
        ped.health -= PLAYER.punchDamage;
        events |= EVENT_HIT;
        if (ped.health <= 0) killPed(ped);
      }
    }
    return events;
  }

  function shoot(p, input) {
    const m = input.mouse();
    // Aim from screen centre toward the mouse: the camera centres on the player,
    // so the world-space aim is player position + mouse offset from screen centre.
    const cam = state.camera;
    const wx = cam ? cam.x + m.x : p.x + m.x - 640;
    const wy = cam ? cam.y + m.y : p.y + m.y - 360;
    const a = angleTo(p.x, p.y, wx, wy);
    p.angle = a;
    state.bullets.push({
      x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22,
      vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.6, from: 'player', damage: 34,
    });
    return EVENT_SHOT;
  }

  function killPed(ped) {
    ped.state = 'down';
    ped.health = 0;
    // Rivals count toward the current clear step; the fallen drop cash or first aid.
    if (state.rivals.includes(ped)) state.stepKills += 1;
    if (Math.random() < 0.6) dropPickup(ped.x, ped.y, Math.random() < 0.5 ? 'cash' : 'health');
  }

  function updateBullets(dt, events) {
    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      if (b.from === 'player') {
        for (const ped of state.peds) {
          if (ped.state === 'down') continue;
          if (ped.state === 'walk' || ped.state === 'flee') continue;
          if (dist2(b.x, b.y, ped.x, ped.y) < 18 * 18) {
            ped.health -= b.damage;
            b.life = 0;
            events |= EVENT_HIT;
            if (ped.health <= 0) killPed(ped);
            break;
          }
        }
        if (b.life > 0) {
          for (const car of state.cars) {
            if (car.dead || car === state.player.inCar) continue;
            if (dist2(b.x, b.y, car.x, car.y) < 30 * 30) {
              car.health -= b.damage;
              b.life = 0;
              events |= EVENT_HIT;
              if (car.health <= 0) {
                car.dead = true;
                events |= addWanted(1);
              }
              break;
            }
          }
        }
      } else {
        const p = state.player;
        if (!p.inCar && dist2(b.x, b.y, p.x, p.y) < 18 * 18) {
          b.life = 0;
          events = damagePlayer(9, events);
        } else if (p.inCar && dist2(b.x, b.y, p.inCar.x, p.inCar.y) < 32 * 32) {
          b.life = 0;
          p.inCar.health -= 9;
          events |= EVENT_HIT;
          if (p.inCar.health <= 0) {
            p.inCar.dead = true;
            p.inCar = null;
            events |= EVENT_CAR_HIT;
          }
        }
      }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);
    return events;
  }

  function updateTraffic(dt) {
    const p = state.player;
    for (const car of state.cars) {
      if (car.dead || car.kind !== 'traffic') continue;
      // Cruise along the current road; at intersections sometimes turn.
      const onV = city.roadsV.some((rx) => Math.abs(car.x - rx) < 40);
      const onH = city.roadsH.some((ry) => Math.abs(car.y - ry) < 40);
      if (onV && onH && random.chance(dt * 0.5)) {
        car.angle = random.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      }
      // Slow down for the car ahead.
      let slow = false;
      for (const other of state.cars) {
        if (other === car || other.dead) continue;
        const d = dist2(car.x, car.y, other.x, other.y);
        if (d < 70 * 70) {
          const ahead = Math.cos(angleDiff(car.angle, angleTo(car.x, car.y, other.x, other.y)));
          if (ahead > 0.5) slow = true;
        }
      }
      const target = slow ? 0 : car.cruise;
      car.speed += clamp(target - car.speed, -260 * dt, 160 * dt);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      const probe = { x: car.x, y: car.y };
      if (city.collideCircle(probe, CAR.width * 0.62)) {
        car.angle += Math.PI / 2;
        car.x = probe.x;
        car.y = probe.y;
      }
      if (car.x < 40 || car.x > WORLD.width - 40 || car.y < 40 || car.y > WORLD.height - 40) {
        // Recycle far away from the player.
        const pt = city.randomRoadPoint();
        if (dist2(pt.x, pt.y, p.x, p.y) > 700 * 700) {
          car.x = pt.x;
          car.y = pt.y;
          car.angle = pt.along === 'v' ? (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (random.chance(0.5) ? 0 : Math.PI);
        }
      }
    }
    // Car-car bumps.
    for (let i = 0; i < state.cars.length; i++) {
      for (let j = i + 1; j < state.cars.length; j++) {
        const a = state.cars[i];
        const b = state.cars[j];
        if (a.dead || b.dead) continue;
        const d2 = dist2(a.x, a.y, b.x, b.y);
        if (d2 < 46 * 46 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = (46 - d) / 2;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          if (a === state.player.inCar || b === state.player.inCar) {
            const pc = a === state.player.inCar ? a : b;
            pc.health -= 2;
            if (pc.health <= 0) {
              pc.dead = true;
              state.player.inCar = null;
            }
          }
        }
      }
    }
  }

  function updatePolice(dt, events) {
    const p = state.player;
    state.policeTimer -= dt;
    const wantCars = WANTED.copsPerStar[state.wanted];
    const copCars = state.cars.filter((c) => c.kind === 'police' && !c.dead).length;
    const footCops = state.peds.filter((x) => x.state === 'cop').length;
    if (state.wanted > 0 && state.policeTimer <= 0) {
      state.policeTimer = POLICE.spawnGap;
      if (copCars < wantCars) {
        spawnPoliceCar();
        events |= EVENT_SIREN;
      } else if (state.wanted >= 2 && footCops < state.wanted - 1) {
        spawnFootCop();
      }
    }
    for (const car of state.cars) {
      if (car.dead || car.kind !== 'police') continue;
      const target = p.inCar ?? p;
      const want = angleTo(car.x, car.y, target.x, target.y);
      car.angle += clamp(angleDiff(car.angle, want), -3.2 * dt, 3.2 * dt);
      car.speed = clamp(car.speed + 320 * dt, 0, Math.min(POLICE.chaseSpeed + state.wanted * 6, 445));
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      const probe = { x: car.x, y: car.y };
      if (city.collideCircle(probe, CAR.width * 0.62)) {
        car.x = probe.x;
        car.y = probe.y;
        car.angle += 0.9;
        car.speed *= 0.6;
      }
      // Ram the player's car, or the player on foot.
      if (p.inCar && dist2(car.x, car.y, p.inCar.x, p.inCar.y) < 52 * 52) {
        p.inCar.health -= POLICE.ramDamage * dt * 1.5;
        events |= EVENT_CAR_HIT;
        if (p.inCar.health <= 0) {
          p.inCar.dead = true;
          p.inCar = null;
        }
      } else if (!p.inCar && dist2(car.x, car.y, p.x, p.y) < 40 * 40) {
        events = damagePlayer(14 * dt * 3, events);
      }
    }
    // Wanted decay: only when the heat is off and no cop is close.
    if (state.wanted > 0 && state.time - state.lastCrimeAt > WANTED.decayDelay) {
      const near = state.cars.some((c) => c.kind === 'police' && !c.dead && dist2(c.x, c.y, p.x, p.y) < 420 * 420)
        || state.peds.some((x) => x.state === 'cop' && dist2(x.x, x.y, p.x, p.y) < 420 * 420);
      if (!near && state.time - state.lastDecayAt > WANTED.decayStep) {
        state.wanted -= 1;
        state.lastDecayAt = state.time;
        if (state.wanted === 0) toast('You lost them. The heat is off.');
      }
    }
    return events;
  }

  function updatePeds(dt, events) {
    const p = state.player;
    state.pedTimer -= dt;
    if (state.pedTimer <= 0) {
      state.pedTimer = 2;
      if (state.peds.filter((x) => x.state === 'walk').length < 18) spawnPed();
    }
    for (const ped of state.peds) {
      if (ped.state === 'down') continue;
      if (ped.state === 'cop') {
        const a = angleTo(ped.x, ped.y, p.x, p.y);
        ped.angle = a;
        ped.x += Math.cos(a) * ped.speed * dt;
        ped.y += Math.sin(a) * ped.speed * dt;
        city.collideCircle(ped, 12);
        if (!p.inCar && dist2(ped.x, ped.y, p.x, p.y) < POLICE.bustRange * POLICE.bustRange) {
          if (p.health <= 30) {
            respawn('busted');
            return events | EVENT_BUSTED;
          }
          events = damagePlayer(10, events);
          ped.x -= Math.cos(a) * 30;
          ped.y -= Math.sin(a) * 30;
        }
        continue;
      }
      if (ped.state === 'rival') {
        ped.shootCd -= dt;
        const d = Math.sqrt(dist2(ped.x, ped.y, p.x, p.y));
        if (d < 420) {
          const a = angleTo(ped.x, ped.y, p.x, p.y);
          ped.angle = a;
          if (d > 160) {
            ped.x += Math.cos(a) * ped.speed * dt;
            ped.y += Math.sin(a) * ped.speed * dt;
          }
          if (ped.shootCd <= 0 && d < 380) {
            ped.shootCd = random.range(1.1, 1.9);
            state.bullets.push({
              x: ped.x + Math.cos(a) * 20, y: ped.y + Math.sin(a) * 20,
              vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.9, from: 'rival', damage: 9,
            });
            events |= EVENT_SHOT;
          }
        }
        continue;
      }
      if (ped.state === 'flee') {
        ped.timer -= dt;
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
        if (ped.timer <= 0) ped.state = 'walk';
        continue;
      }
      // Walking pedestrian: stroll, turn sometimes, flee from danger.
      ped.timer -= dt;
      const danger = state.cars.some((c) => !c.dead && Math.abs(c.speed) > 200 && dist2(c.x, c.y, ped.x, ped.y) < 120 * 120)
        || (state.wanted > 0 && dist2(p.x, p.y, ped.x, ped.y) < 130 * 130);
      if (danger) {
        ped.state = 'flee';
        ped.angle = angleTo(p.x, p.y, ped.x, ped.y);
        ped.timer = 2.5;
        continue;
      }
      if (ped.timer <= 0) {
        ped.timer = random.range(2, 6);
        ped.angle = random.range(0, Math.PI * 2);
      }
      const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
      const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
      const probe = { x: nx, y: ny };
      if (!city.collideCircle(probe, 10) && !city.inWater(probe.x, probe.y)) {
        ped.x = clamp(probe.x, 20, WORLD.width - 20);
        ped.y = clamp(probe.y, 20, WORLD.height - 20);
      } else {
        ped.angle += Math.PI / 2;
      }
      // Hit by a fast car.
      for (const car of state.cars) {
        if (car.dead || Math.abs(car.speed) < 120) continue;
        if (dist2(car.x, car.y, ped.x, ped.y) < 34 * 34) {
          if (ped.state === 'rival') {
            killPed(ped);
            events |= addWanted(1);
          } else {
            ped.state = 'down';
            ped.health = 0;
            events |= addWanted(1);
            dropPickup(ped.x, ped.y, 'cash');
          }
          toast('You hit a pedestrian! Someone called the cops.');
          break;
        }
      }
    }
    return events;
  }

  function updatePickups(dt, events) {
    const p = state.player;
    for (const pk of state.pickups) {
      pk.t += dt;
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      if (dist2(pk.x, pk.y, px, py) < 44 * 44) {
        pk.t = 999;
        if (pk.kind === 'cash') {
          const amount = random.int(15, 60);
          state.money += amount;
          state.stats.cashEarned += amount;
          toast(`Picked up $${amount}.`);
        } else if (pk.kind === 'health') {
          p.health = clamp(p.health + 35, 0, PLAYER.health);
          toast('First aid +35 HP.');
        } else if (pk.kind === 'ammo') {
          p.ammo += 18;
          toast('Ammo +18.');
        }
        events |= EVENT_PICKUP;
      }
    }
    state.pickups = state.pickups.filter((pk) => pk.t < 25);
    return events;
  }

  function step(dt, input, actions) {
    let events = EVENT_NONE;
    state.time += dt;
    state.clock = (8 * 3600 + state.time * 60) % 86400;
    state.camera = state.camera ?? { x: 0, y: 0 };
    events = updatePlayer(dt, input, actions, events);
    if (state.player.health <= 0) {
      respawn('wasted');
      return EVENT_WASTED;
    }
    updateTraffic(dt);
    events = updatePolice(dt, events);
    events = updatePeds(dt, events);
    events = updateBullets(dt, events);
    events = updatePickups(dt, events);
    events = updateMission(dt, events);
    if (state.player.health <= 0) {
      respawn('wasted');
      events |= EVENT_WASTED;
    }
    // Camera follows the player (or their car).
    const p = state.player;
    state.camera.x = clamp(p.x - 640, 0, WORLD.width - 1280);
    state.camera.y = clamp(p.y - 360, 0, WORLD.height - 720);
    state.toasts = state.toasts.filter((t) => t.until > state.time);
    return events;
  }

  function save() {
    try {
      const data = {
        money: state.money,
        missionIndex: state.missionIndex,
        stepIndex: state.stepIndex,
        hasPistol: state.player.hasPistol,
        ammo: state.player.ammo,
        stats: state.stats,
      };
      window.localStorage.setItem('neon-harbor.save.v1', JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem('neon-harbor.save.v1');
      if (!raw) return false;
      const data = JSON.parse(raw);
      state.money = data.money ?? 40;
      state.missionIndex = data.missionIndex ?? 0;
      state.stepIndex = data.stepIndex ?? 0;
      state.player.hasPistol = !!data.hasPistol;
      state.player.ammo = data.ammo ?? 0;
      if (state.player.hasPistol) state.player.weapon = 'pistol';
      state.stats = data.stats ?? state.stats;
      return true;
    } catch {
      return false;
    }
  }

  reset();
  return { state, reset, step, save, load, currentStep, toast, spawnTargetCar, spawnRivals };
}
