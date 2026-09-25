# Lazer Wave

## An HTML / JS rhythm arcade game (in development)

Built on the Focus Break engine: plain scripts, no build step, opens straight off disk or served.

### Running

Open `index.html`, or serve the folder (`node .claude/serve.js`, then http://localhost:8123/).

### How to play:

 - Lasers flicker as a warning, then fire **on the beat**. Steer out of them.
 - You are two sine waves trailing neon. The gap between them closes as each beat comes, and they meet on it: hit
   **on the beat**, when they meet, **in its colour**. A laser's colour is its beat's: **Z** for cyan, **X** for
   magenta. The wave of the coming beat's colour stays lit (cyan on top, magenta below) and the other dims. A beat with
   no laser takes either key, and Level 1 has no colours at all. PERFECT 100, GOOD 50, times your multiplier.
   Every 8 in a row raises the multiplier, up to x4. A missed beat, a press off the beat, or the wrong colour (WRONG)
   resets it.
 - Three shields per attempt. A laser takes one and breaks your combo; the last one restarts the level.
 - **Overdrive:** hits charge the meter beside your shields (16 PERFECTs fill it; a GOOD counts half). Full, press SPACE: it starts on
   the bar line (the one you press it on, or else the next) and lasts two bars. You become a laser: lasers can't hurt
   you, hits score double, and flying through a laser as it fires absorbs it for a bonus. The colours still count.
 - **Wave / laser:** every level switches to laser form for a few bars. A **gate** (a white line) sweeps in: press
   SPACE as it reaches you, on the beat, to switch; one gone by unpassed switches anyway and costs a shield. In laser
   form you lock to the left third of the screen, steer only up and down, and fire across it: each beat brings a
   target, and a hit counts only lined up with it (OFF TARGET otherwise) and in its colour. Lasers fire across your
   path, on a target's beat, between it and the next: hit it, hold while the laser burns, then cross. Overdrive makes
   you untouchable and widens your beam. Another gate switches you back.
 - Survive every bar to clear the level. Five levels, 100 to 132 BPM, each the same every attempt.
 - A cleared level is ranked F, D, C, B, A, S or S+ on how its beats were hit: a PERFECT counts the beat, a GOOD half
   of it, a press off the beat or in the wrong colour takes half back, and a lost shield costs 5%. S+ needs every beat
   hit, nothing off the beat or WRONG, and no shield lost.

### Controls:

	- Mouse: your piece follows the cursor.  Touch: drag anywhere to steer (relative, like a trackpad).
	- Z or LEFT MOUSE BUTTON = hit a cyan beat.  X or RIGHT MOUSE BUTTON = hit a magenta beat.  Touch: the CYAN and
	  MAGENTA buttons.
	- SPACE or MIDDLE MOUSE BUTTON = on a gate, switch between wave and laser; anywhere else, OVERDRIVE once its meter
	  is full (the beat nearest the press decides).  Touch: the white button, which says GATE or OVERDRIVE.
	- P = PAUSE.  H = instructions, from the start screen or a pause.  After the final level, click or press R to play again.
	- Phones and tablets always play in landscape.

### The engine, file by file

| File | What it holds |
|---|---|
| `audio.js` | The synthesized beat track (kick, hat, count-in tick, laser zap, and the piece's shot and gate sweep, on Web Audio), the playlist (`TRACKS`, empty until the game has its own music), sound effects |
| `layout.js` | The palette (`COLORS`), the 1280x800 layout frame, band fitting for phones, the HUD transform, banners, resize handling |
| `waves.js` | `LEVELS` (bpm, bars, warning lead, phrases, colours, laser sections), the `PHRASES` that fill a bar, the `COLOR_PATTERNS` that paint one, laser form's `TARGET_PHRASES`, the seeded timeline, and what goes on screen: `Beam`, `Target`, `Gate` |
| `run.js` | Difficulties (lives), records per difficulty in localStorage: best run, per-level splits and best ranks, furthest level |
| `world.js` | `component`, the player piece's stepped movement, the `hazards` list and hit testing |
| `player.js` | The player's look: two sine waves drawn off its position history, drifting into a glowing trail, meeting on each beat, the coming beat's colour lit |
| `hud.js` | Score / deaths / level readout, the overdrive meter and the progress stripe |
| `fx.js` | The effects setting (auto / full / reduced / off, honouring reduced motion), `fxHash`, the CRT overlay |
| `menu.js` | Start, options and help screens, settings persistence, hover flash, slogans, start-screen glitches |
| `levels.js` | Level start / end flow, the between-level and death messages, the finish screen |
| `input.js` | `ACTIONS` (key / mouse / touch bindings), mouse & multi-touch steering, touch buttons, pause and resume countdown |
| `loop.js` | Game state, the fixed 10ms step loop, the beat clock (`beatPos`) and audio scheduling, hit judging, combo, shields, overdrive, and wave / laser form |

### Adding gameplay

- A new pattern is a function in `PHRASES` (waves.js) that fills one bar with `add(fireBeat, axis, pos, size)`; list
  its name in a level's `phrases`.
- A level's `colors` lists the `COLOR_PATTERNS` its bars are painted from (`solid`, `pairs`, `alt`), the knob for how
  hard the colours are to read; none makes it colourless. The colours come from a random stream of their own, so
  changing them never moves a beam.
- A level's `laser` lists its laser sections as `[first bar, bars]`; a gate opens and closes each. Their bars are drawn
  from its `targets`, names in `TARGET_PHRASES`, whose functions fill a bar with `add(fireBeat, "target", height, size)`.
  Laser form has a random stream of its own too, so adding or moving a section leaves the wave bars around it alone.
  Its `dodges` is how many lasers each laser bar fires across the path between targets; they only go where two
  targets are at least `DODGE_GAP` apart, keeping `DODGE_MARGIN` clear round each, and have a stream of their own.
- A new hazard is anything with `x, y, width, height, update()`, plus `step()` (return `false` when done), `hits(piece)`
  and `fit()`; `Beam` is the model. Read time from `beatPos`, not steps. Give it `absorb()` and overdrive can eat it.
- Add an action by adding an entry to `ACTIONS` in `input.js`; it gets keys, a mouse button, a touch button and a help line.

### Ideas flagged for later

- **Ride the wave:** a waveform line the piece rides, synced to the beat, with lasers crossing it. It fits the same
  way: a new hazard/track type and the phrases that place it, on the same beat clock and judging.
- Real music: give `TRACKS` a bpm and offset and drive `beatPos` from the song instead of the step count.
- Audio latency calibration: a setting that shifts judging (`pressBeat`) by the player's measured offset.
- Near-miss bonus for passing close to a burning beam.

### Credits:

	Developed by Nathan Mitchell
