# Lazer Wave

## An HTML / JS rhythm arcade game (in development)

Built on the Focus Break engine: plain scripts, no build step, opens straight off disk or served.

### Running

Open `index.html`, or serve the folder (`node .claude/serve.js`, then http://localhost:8123/).

### How to play:

 - Lasers flicker as a warning, then fire **on the beat**. Steer out of them.
 - You are two sine waves trailing neon. The gap between them closes as each beat comes, and they meet on it: tap HIT
   **on the beat**, when they meet. PERFECT 100, GOOD 50, times your multiplier.
   Every 8 in a row raises the multiplier, up to x4. A missed beat, or a press off the beat, resets it.
 - Three shields per attempt. A laser takes one and breaks your combo; the last one restarts the level.
 - Survive every bar to clear the level. Five levels, 100 to 132 BPM, each the same every attempt.

### Controls:

	- Mouse: your piece follows the cursor.  Touch: drag anywhere to steer (relative, like a trackpad).
	- SPACE, Z, X or LEFT MOUSE BUTTON = HIT.  Touch: the HIT button.
	- P = PAUSE.  H = instructions, from the start screen or a pause.  After the final level, click or press R to play again.
	- Phones and tablets always play in landscape.

### The engine, file by file

| File | What it holds |
|---|---|
| `audio.js` | The synthesized beat track (kick, hat, count-in tick, laser zap on Web Audio), the playlist (`TRACKS`, empty until the game has its own music), sound effects |
| `layout.js` | The palette (`COLORS`), the 1280x800 layout frame, band fitting for phones, the HUD transform, banners, resize handling |
| `waves.js` | `LEVELS` (bpm, bars, warning lead, phrases), the `PHRASES` that fill a bar, the seeded timeline, and `Beam` |
| `run.js` | Difficulties (lives), records per difficulty in localStorage: best run, per-level splits, furthest level |
| `world.js` | `component`, the player piece's stepped movement, the `hazards` list and hit testing |
| `player.js` | The player's look: two sine waves drawn off its position history, drifting into a glowing trail, meeting on each beat |
| `hud.js` | Score / deaths / level readout and the progress stripe |
| `fx.js` | The effects setting (auto / full / reduced / off, honouring reduced motion), `fxHash`, the CRT overlay |
| `menu.js` | Start, options and help screens, settings persistence, hover flash, slogans, start-screen glitches |
| `levels.js` | Level start / end flow, the between-level and death messages, the finish screen |
| `input.js` | `ACTIONS` (key / mouse / touch bindings), mouse & multi-touch steering, touch buttons, pause and resume countdown |
| `loop.js` | Game state, the fixed 10ms step loop, the beat clock (`beatPos`) and audio scheduling, hit judging, combo and shields |

### Adding gameplay

- A new pattern is a function in `PHRASES` (waves.js) that fills one bar with `add(fireBeat, axis, pos, size)`; list
  its name in a level's `phrases`.
- A new hazard is anything with `x, y, width, height, update()`, plus `step()` (return `false` when done), `hits(piece)`
  and `fit()`; `Beam` is the model. Read time from `beatPos`, not steps.
- Add an action by adding an entry to `ACTIONS` in `input.js`; it gets keys, a mouse button, a touch button and a help line.

### Ideas flagged for later

- **Ride the wave:** a waveform line the piece rides, synced to the beat, with lasers crossing it. It fits the same
  way: a new hazard/track type and the phrases that place it, on the same beat clock and judging.
- Real music: give `TRACKS` a bpm and offset and drive `beatPos` from the song instead of the step count.
- Audio latency calibration: a setting that shifts judging (`pressBeat`) by the player's measured offset.
- Near-miss bonus for passing close to a burning beam.

### Credits:

	Developed by Nathan Mitchell
