[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/stevencau55551/neon-harbor-gta6/rank.svg)](https://make.fun/c/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/stevencau55551/neon-harbor-gta6/reward.svg)](https://make.fun/c/gta6-01)

# Neon Harbor

An original open-world crime game set in the fictional coastal city of **Vela Bay**, built for [make.fun's **Make GTA 6** competition](https://make.fun/c/gta6-01).

You play **Kai Meridian**, a former harbour courier who owes the dock crew. Fixer **Mara Voss** has four jobs that pay the debt off — if the VPD doesn't catch you first.

## How to play

Serve `game/` with any static server (or `node serve.ts`) and open it in desktop Chrome. No network, no build step.

- **WASD / arrows** — move on foot, drive when in a car
- **E** — enter a car, or steal one (the owner runs — and calls the cops)
- **F** — punch · **Mouse + Click** — aim and shoot (pistol)
- **B** — buy pistol ammo at Harbor Arms ($50)
- **Shift** — run · **P** / **Esc** — pause

## What's in the city

- A drivable grid city: downtown, suburbs, parks, and the south harbour docks
- Traffic that follows the roads, pedestrians who flee from danger
- A **wanted system** (0–5 stars): VPD interceptors and foot cops hunt you, and the heat only cools off once you've lost them
- **Four story jobs** with markers, a minimap and a tracker: a package run, a grand-theft-auto delivery, a dockside fight, and a bank heist getaway
- Combat on foot and from the car, car damage, busted / wasted, hospital respawns
- Money, cash pickups, first aid, a gun shop, and automatic saving in the browser
- Synthesised sound (WebAudio, no audio files): engine hum, sirens, gunshots, a harbour bassline

## Screenshots

The cover and scenes in `screenshots/` are renders of the game itself: the title screen, driving downtown, a three-star police chase, and the dockside fight.

## Tech

- `game/` — plain static files: `index.html` + ES modules under `src/`, no libraries, no network requests
- `main.ts` — the make.fun entrypoint: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — a tiny local static server for development

## License

MIT — see [LICENSE](LICENSE). All names, characters, places, story, art and sounds are original fiction created for this entry.
