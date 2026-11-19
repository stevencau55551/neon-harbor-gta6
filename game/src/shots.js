// Screenshot staging: deterministic scenes for ?shot=start|play|chase|dock.
// Each scene runs the real simulation a few steps, then the renderer paints it.

export function stageShot(name, world, city) {
  const s = world.state;
  const p = s.player;
  if (name === 'start') {
    return { screen: 'title' };
  }
  if (name === 'play') {
    // Kai driving his yellow Runner downtown, morning traffic around him.
    const car = s.cars.find((c) => c.kind === 'owned');
    p.inCar = car;
    car.x = 1800;
    car.y = 1000;
    car.angle = 0;
    car.speed = 260;
    p.x = car.x;
    p.y = car.y;
    s.wanted = 0;
    s.missionIndex = 0;
    s.stepIndex = 0;
    const traffic = s.cars.filter((c) => c.kind === 'traffic');
    for (let i = 0; i < Math.min(5, traffic.length); i++) {
      const c = traffic[i];
      c.x = 1600 + i * 90;
      c.y = 1000 + (i % 2 === 0 ? -40 : 40);
      c.angle = 0;
      c.speed = 150;
    }
    world.step(1 / 60, { moveX: () => 0, moveY: () => 0, run: () => false, mouse: () => ({ x: 640, y: 360, down: false, clicked: false }) }, 0);
    s.toasts = [{ text: 'Welcome to Vela Bay. See Mara at the garage — follow the yellow marker.', until: s.time + 3.6 }];
    return { screen: 'play' };
  }
  if (name === 'chase') {
    // Three-star heat: VPD interceptors closing in on Kai's Runner, all on the
    // same road so the chase reads clearly. The player's car is armoured for the
    // staging run so the rams cannot wreck it before the paint.
    const idle = { moveX: () => 0, moveY: () => 0, run: () => false, mouse: () => ({ x: 640, y: 360, down: false, clicked: false }) };
    // Kai just stole the white Comet GT and is fleeing in it.
    const car = world.spawnTargetCar(1400, 1000);
    p.inCar = car;
    car.angle = 0;
    car.speed = 0;
    car.health = 99999;
    p.x = car.x;
    p.y = car.y;
    s.wanted = 3;
    s.lastCrimeAt = s.time;
    s.missionIndex = 1;
    s.stepIndex = 1;
    // Let the heat build so three VPD interceptors are on the street.
    for (let i = 0; i < 60 * 8; i++) world.step(1 / 60, idle, 0);
    const cops = world.state.cars.filter((c) => c.kind === 'police' && !c.dead);
    const spots = [
      { x: car.x - 280, y: car.y - 30, angle: 0 },
      { x: car.x - 420, y: car.y + 34, angle: 0 },
      { x: car.x + 320, y: car.y + 30, angle: Math.PI },
    ];
    cops.forEach((cop, i) => {
      const spot = spots[i % spots.length];
      cop.x = spot.x;
      cop.y = spot.y;
      cop.angle = spot.angle;
      cop.speed = 400;
      cop.health = 100;
    });
    car.speed = 300;
    car.health = 100;
    s.toasts = [];
    world.toast('Three stars — lose the cops, then reach the garage!');
    world.step(1 / 60, idle, 0);
    s.toasts = [{ text: 'Three stars — lose the cops, then reach the garage!', until: s.time + 3.6 }];
    return { screen: 'play' };
  }
  if (name === 'dock') {
    // Mission 3: the dockside fight, rivals closing in, pistol drawn.
    s.missionIndex = 2;
    s.stepIndex = 0;
    s.stepKills = 0;
    p.inCar = null;
    p.x = 2150;
    p.y = 2050;
    p.angle = Math.PI / 4;
    p.hasPistol = true;
    p.weapon = 'pistol';
    p.ammo = 24;
    s.wanted = 1;
    world.spawnRivals(3, 2250, 2100);
    // Spread the rivals out so all three read in the frame.
    const spread = [{ x: 2220, y: 2060 }, { x: 2330, y: 2140 }, { x: 2260, y: 2200 }];
    world.state.rivals.forEach((r, i) => {
      r.x = spread[i % spread.length].x;
      r.y = spread[i % spread.length].y;
    });
    s.toasts = [];
    world.toast('Deal with the rival crew at the docks (3)');
    world.step(1 / 60, { moveX: () => 0, moveY: () => 0, run: () => false, mouse: () => ({ x: 800, y: 300, down: false, clicked: false }) }, 0);
    s.toasts = [{ text: 'Deal with the rival crew at the docks (3)', until: s.time + 3.6 }];
    return { screen: 'play' };
  }
  return { screen: 'title' };
}

export const SHOT_NAMES = ['start', 'play', 'chase', 'dock'];
