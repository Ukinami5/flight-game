# SKYWARD CANYON

![make.fun bounty](https://make.fun/badge/best-flight-game-20261126-0057.svg) ![rank](https://make.fun/badge/best-flight-game-20261126-0057/Ukinami5/flight-game/rank.svg) ![reward](https://make.fun/badge/best-flight-game-20261126-0057/Ukinami5/flight-game/reward.svg)

Competition: [best-flight-game-20261126-0057 on make.fun](https://make.fun/c/best-flight-game-20261126-0057)

An original, offline 3D backcountry flight game. Eight illuminated gates, a winding alpine river, and one landing strip at golden hour. Built with procedural Three.js geometry, canvas instruments, and a small WebAudio synthesizer. No downloads or online services are used by the game.

## Play

Open `game/index.html` directly in a desktop browser, or run `node serve.ts --port 8123` and open the local server. The title screen starts a flight with Enter or the takeoff button. Cockpit view is the default.

- W / S: increase / decrease throttle.
- Down / Up arrow: pull up / lower the nose.
- Left / Right arrow or A / D: bank left / right.
- Q / E: rudder left / right. B: wheel brake.
- C: cockpit / chase camera. M: sound on / off.
- P or Escape: pause / resume. R: restart.
- Drag the scene to steer with the mouse (optional).

Depart north along runway 36. Set full power and rotate around 70 knots. Fly through all eight numbered gates in order; each is worth 250 points, a speed bonus, and 16 extra seconds. The next gate pulses. Missed gates can be approached again from either direction.

After the last gate, turn back to the airfield at the southern end of the valley. Either runway direction is accepted. Touch down within the asphalt strip below 95 knots, with a descent under 6.5 m/s and nearly level wings. Below 55 knots in the air, the aircraft stalls and drops its nose. Reduce power early and use small pitch corrections on final. A safe landing adds 1000 points plus a remaining-time bonus.

## Source and offline build

The source is split by responsibility under `game/src/`. Three.js is vendored under `game/vendor/`. HTTP play loads `src/main.js` as an ES module. Direct `file://` play loads `src/offline.js`, a deterministic classic-script build of exactly the same sources. This avoids the ES-module CORS restriction browsers impose on local files and does not use `eval` or dynamic code generation.

After source changes, regenerate that bundle with:

```
node build-offline.mjs
```

`main.ts` and `serve.ts` are the supplied starter programs. The only change to `main.ts` is a hand-in status line on stderr; the supplied make.fun library is unmodified.

## Reproducible shot mode

Add `?shot=cover&seed=1` to the game URL. Supported shots are `cover`, `cockpit`, `rings`, `chase`, and `title`. Each builds a seeded world, advances exactly 90 fixed simulation steps, freezes, sets `window.__shotReady = true`, and sets the document title to `SHOT-READY`. Rendering time does not enter the simulation. Shot mode is isolated from normal play.

## Screenshots

`screenshots/` holds four browser renders of the game taken with the deterministic shot modes described above: `1-cover.jpg` (chase view over the valley), `2-cockpit.jpg` (cockpit on final approach), `3-rings.jpg` (about to thread a gate), `4-title.jpg` (the title screen).

## Local checks

```
node tools/check-simulation.mjs
node tools/check-loop.mjs
```

These checks exercise the real flight physics, procedural world, cockpit drawing calls, shipped offline bundle, ordered course progression, landing success/failures, state transitions, and every shot setup. They use a recording renderer and canvas stubs, so they do not replace a browser GPU render check.

