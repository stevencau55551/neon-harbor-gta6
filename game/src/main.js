// Neon Harbor boot and main loop. Fixed 1/60 s steps; screens title / play /
// paused / over. ?seed=N fixes the city; ?shot=start|play|chase|dock stages a
// scene for screenshots and sets window.__shotReady when painted.
import { STEP, BEST_KEY, SAVE_KEY } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createWorld, EVENT_SHOT, EVENT_HIT, EVENT_CRIME, EVENT_PICKUP, EVENT_MISSION, EVENT_WASTED, EVENT_BUSTED, EVENT_SIREN, EVENT_CAR_HIT } from './world.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const city = createCity(createRandom(seed));
const world = createWorld(city, createRandom(seed + 7));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return JSON.parse(window.localStorage.getItem(BEST_KEY) ?? 'null') || { cashEarned: 0, missionsDone: 0 };
  } catch {
    return { cashEarned: 0, missionsDone: 0 };
  }
}

function saveBest() {
  try {
    const best = readBest();
    const cur = world.state.stats;
    if (cur.cashEarned > best.cashEarned) {
      window.localStorage.setItem(BEST_KEY, JSON.stringify({ cashEarned: cur.cashEarned, missionsDone: cur.missionsDone }));
    }
  } catch {
    // Storage can be off; best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, city);
  let painted = 0;
  function paint() {
    renderer.draw(world, city, scene.screen, readBest());
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let overlayUntil = 0;
  let hadSave = false;
  try {
    hadSave = !!window.localStorage.getItem(SAVE_KEY);
  } catch {
    hadSave = false;
  }

  function announce(message) {
    status.textContent = message;
  }

  function startGame(fresh) {
    if (fresh) {
      world.reset();
    } else if (hadSave) {
      world.reset();
      if (world.load()) {
        world.toast('Save loaded — welcome back to Vela Bay.');
      }
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startMusic();
    announce('Playing Neon Harbor. Follow the yellow marker.');
  }

  function handleEvents(events) {
    if (events & EVENT_SHOT) audio.shot();
    if (events & EVENT_HIT) audio.punch();
    if (events & EVENT_CRIME) audio.crime();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_MISSION) {
      audio.mission();
      world.save();
      saveBest();
    }
    if (events & EVENT_SIREN) audio.siren();
    if (events & EVENT_CAR_HIT) audio.crash();
    if (events & EVENT_WASTED) {
      overlayUntil = world.state.time + 2.5;
      announce('Wasted. You wake up at St. Mercy Hospital.');
      world.save();
    }
    if (events & EVENT_BUSTED) {
      overlayUntil = world.state.time + 2.5;
      announce('Busted. The VPD impounded your ride.');
      world.save();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame(screen === SCREEN_TITLE ? !hadSave : true);
      hadSave = false;
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      world.save();
      announce('Paused.');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (screen === SCREEN_PLAY) {
      // Actions are edge-triggered: take them once per frame and hand them to the
      // first simulation step only, so a key press never fires twice.
      const stepActions = actions;
      let first = true;
      while (accumulator >= STEP) {
        const events = world.step(STEP, input, first ? stepActions : 0);
        first = false;
        handleEvents(events);
        accumulator -= STEP;
        if (world.state.allMissionsDone) {
          screen = SCREEN_OVER;
          saveBest();
          world.save();
          break;
        }
      }
      if (world.state.time > overlayUntil && (world.state.busted || world.state.wasted)) {
        world.state.busted = false;
        world.state.wasted = false;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, city, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      world.save();
      announce('Paused.');
    }
  });

  announce('Neon Harbor. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
