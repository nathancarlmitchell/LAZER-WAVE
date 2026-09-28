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
   no laser takes either key, and the first act has no colours at all. PERFECT 100, GOOD 50, times your multiplier.
   Every 8 in a row raises the multiplier, up to x4. A missed beat, a press off the beat, or the wrong colour (WRONG)
   resets it.
 - Three shields per attempt. A laser takes one and breaks your combo; the last one restarts the level.
 - **Overdrive:** hits charge the meter beside your shields (16 PERFECTs fill it; a GOOD counts half). Full, press SPACE: it starts on
   the bar line (the one you press it on, or else the next) and lasts two bars. You become a laser: lasers can't hurt
   you, hits score double, and flying through a laser as it fires absorbs it for a bonus. The colours still count.
 - **Wave / laser:** from level 3 on, every level switches to laser form for a few bars. A **gate** (a white line)
   sweeps in: press SPACE as it reaches you, on the beat, to switch; one gone by unpassed switches anyway and costs a
   shield. In laser form you lock to the left third of the screen, steer only up and down, and fire across it: each
   beat brings a target, and a hit counts only lined up with it (OFF TARGET otherwise) and in its colour. Lasers fire
   across your path, on a target's beat, between it and the next: hit it, hold while the laser burns, then cross.
   Overdrive makes you untouchable and widens your beam. Another gate switches you back.
 - Survive every bar to clear the level. There are **five acts of five levels**, climbing the visible spectrum from
   Infrared to Ultraviolet at 96 to 132 BPM, each level the same every attempt. New things come in one at a time: the
   melody's lasers and laser form in Act I, colours and walls in Act II, beams down the screen, marching columns and
   later warnings in Act III, colours on every beat, two laser sections and two beams at once in Act IV, and the
   shortest warnings in Act V.
 - Each act opens with its lore, typed out over its backdrop while its theme plays, and each new level with a card: its
   name and a line or two. A press brings the lore in at once and another goes on; a level's card starts the level by
   itself. A death or a retry comes straight back to the level. After the last level, an epilogue, then the finish.
   The time the story is up is left off the run's time.
 - **Level select:** LEVELS on the start screen shows every level, an act a row, each in its colour. Level 1 is
   always open, and a level opens once the one before it has been beaten, on either difficulty; a locked one is a
   padlock. An open one shows its name, and its best rank and best score on the difficulty chosen, and the next one
   to beat says NEXT.
   Pick one and the run starts there, with its act's story if it opens one. Only a run from Level 1 can set the best
   run, and playing again from the finish starts the run from where it began.
 - Every act has a backdrop and a song of its own, and every level a colour of the spectrum, from red at the first to
   violet at the last. The lasers follow the song: they fire on the melody's notes, as high on the screen as each note
   is high in the tune, laser form's targets trace the chorus, and each laser sounds the note it fires on. The song
   builds through its act, overdrive brightens it, and a clear resolves it on its last chord.
 - A cleared level is ranked F, D, C, B, A, S or S+ on how its beats were hit: a PERFECT counts the beat, a GOOD half
   of it, a press off the beat or in the wrong colour takes half back, and a lost shield costs 5%. S+ needs every beat
   hit, nothing off the beat or WRONG, and no shield lost. Beside the rank, the level's beats are broken down: how
   many were PERFECT, GOOD and MISS (gone by unhit, WRONG or OFF TARGET), each one's share of them, and the longest
   combo; and so is its score: its points, the most it has been cleared with (NEW BEST when that is these), and the
   run's TOTAL with them.
 - Every level keeps its bests, on each difficulty: its best rank and its best score. Not its time, as a level lasts
   as long as its song whoever plays it; the run's time is still kept, since mistakes and retries lengthen it. The
   results set each against its best, and the level select's tiles and each level's card show them.
 - The results wait for you: **CONTINUE** adds the level's points to the total and goes on, **RETRY** plays the level
   again from nothing, and the total only ever keeps the attempt you continue from. The finish shows the run's total.
   The time the results are up is left off the run's time, as a pause is.

### Controls:

	- Mouse: your piece follows the cursor.  Touch: drag anywhere to steer (relative, like a trackpad).
	- Z or LEFT MOUSE BUTTON = hit a cyan beat.  X or RIGHT MOUSE BUTTON = hit a magenta beat.  Touch: the CYAN and
	  MAGENTA buttons.
	- SPACE or MIDDLE MOUSE BUTTON = on a gate, switch between wave and laser; anywhere else, OVERDRIVE once its meter
	  is full (the beat nearest the press decides).  Touch: the white button, which says GATE or OVERDRIVE.
	- L = the level select, from the start screen.  P = PAUSE.  H = instructions, from the start screen or a pause.  After a level, ENTER or SPACE = CONTINUE and
	  R = RETRY (or click or tap them).  After the final level, click or press R to play again.
	- On a story screen: a click, ENTER, SPACE, ESCAPE or Z / X (a tap; A or START on a controller) brings the lore in,
	  then goes on.
	- The pause has HELP, RETRY (the level again from its start: it costs the run the time, not a mistake) and QUIT
	  (back to the start screen, the run abandoned). H, R and Q press them at the keyboard.
	- Controller (a standard-mapped gamepad, named as on an Xbox pad): the left stick or the D-pad steers; LT, LB or X
	  hit cyan; RT, RB or B hit magenta; A or Y is the gate and overdrive; START pauses. On any screen the stick or
	  D-pad moves between the buttons, A presses the one lit, B backs out, and START starts, resumes or carries on.
	  Most browsers only let sound start after a click or a key press, not a controller's, so click the page once first.
	- Phones and tablets always play in landscape.

### The engine, file by file

| File | What it holds |
|---|---|
| `audio.js` | The synthesized beat track (kick, hat, count-in tick, laser zap, and the piece's shot and gate sweep, on Web Audio), the playlist (`TRACKS`, for recorded songs: empty, as the levels' songs are synthesized, `music.js`), sound effects |
| `layout.js` | The palette (`COLORS`), the 1280x800 layout frame, band fitting for phones, the HUD transform, banners, resize handling |
| `waves.js` | `LEVELS` (the 25 levels: name and lore, bpm, bars, warning lead, phrases, colours, laser sections, and the curve they climb), the `PHRASES` that fill a bar, placing their beams on the tune's notes, the `COLOR_PATTERNS` that paint one, laser form's `TARGET_PHRASES` (`tune` traces the chorus), the seeded timeline, and what goes on screen: `Beam`, `Target`, `Gate` |
| `story.js` | The acts (`ACTS`: name, their band of the spectrum, backdrop and lore; five levels each) and the epilogue, and the story screens between levels: an act's intro, typed over its backdrop to its theme, a level's card, the epilogue before the finish |
| `music.js` | Each act's song as MIDI notes (`SONGS`: a key, the `CHORDS` of its bars, its melody, the laser sections' lead, bass and arpeggio lines, and its lead's voice), and the Web Audio synths that play it on the beat track's clock: bass, pad, arpeggio and lead, an echo, and a dip under every kick. It builds through its act, the laser sections play the chorus, overdrive opens the filters, a pause or a death cuts it, a clear rings out on the key's chord, and an act's intro plays its theme. `songTune` tells the timeline where the tune's notes are, and `zapNote` which one a laser sounds |
| `run.js` | Difficulties (lives), records per difficulty in localStorage (v3, for the 25 levels): best run, each level's best rank and best score, furthest level; which levels are beaten, and so open on the level select |
| `world.js` | `component`, the player piece's stepped movement, the `hazards` list and hit testing |
| `player.js` | The player's look: two sine waves drawn off its position history, drifting into a glowing trail, meeting on each beat, the coming beat's colour lit |
| `hud.js` | Score / deaths / act and level readout, the overdrive meter and the progress stripe |
| `fx.js` | The effects setting (auto / full / reduced / off, honouring reduced motion), `fxHash`, the CRT overlay |
| `sky.js` | Each level's colour, from its act's band of the spectrum, and each act's backdrop in it (`SKY_STYLES`: rising embers, a sun over a grid, an oscilloscope, a warp, an aurora), pulsing on the beat under the level and the story screens, still under the screens between levels. Moving at full effects, still when reduced, only the colour when off |
| `menu.js` | Start, options, help and level select screens (the select: an act a row, a tile a level, locked until the one before is beaten), settings persistence, hover flash, slogans, start-screen glitches |
| `titlelight.js` | The start screen's laser: a WebGL fragment shader on a screen-blended canvas over the game's, sweeping behind the title, with light-scattering rays the letters cut shadows through and their outlines burning where it passes. Only at full effects, and nothing at all without WebGL |
| `levels.js` | Level start / end flow (a run from START or from the level select, a new level through its act's story and its card, a death or a retry straight back), the death message, a cleared level's results (the beat breakdown, the rank, the score against its best, and the run's total) and their CONTINUE and RETRY, the pause's RETRY and QUIT, the epilogue and the finish screen |
| `input.js` | `ACTIONS` (key / mouse / touch / controller bindings), mouse & multi-touch steering, touch buttons, the controller (Gamepad API polling, stick steering, moving between a screen's buttons), the pause panel and the touch resume countdown |
| `loop.js` | Game state, the fixed 10ms step loop, the beat clock (`beatPos`) and audio scheduling, hit judging, combo, shields, overdrive, and wave / laser form |

### Adding gameplay

- A new pattern is a function in `PHRASES` (waves.js) that fills one bar with `add(fireBeat, axis, pos, size)`; list
  its name in a level's `phrases`. It is handed the bar's `tune` too (`songTune`, music.js): `onset[i]`, the note the
  tune starts on beat i, or null, and `sound[i]`, the note sounding on it; `tuneBeam` and `tuneAt` put a note at its
  height on the screen, so the lasers follow the song.
- A level is an entry in `LEVELS` with its `name` and `lore` (a line or two for its card); every five of them are an
  act. An act is an entry in `ACTS` (story.js): its `name`, `jp`, the `band` of the spectrum its levels' colours run
  through (in nm), its `sky` (a style in `SKY_STYLES`, sky.js, which draws over the level's colour) and its `lore`; and
  a song in `SONGS`.
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
- Add an action by adding an entry to `ACTIONS` in `input.js`; it gets keys, a mouse button, controller buttons, a touch button
  and a help line.
- An act's song is its entry in `SONGS` (music.js): its `key` as a MIDI note number (69 is A 440), the `chords` of its
  wave bars and the `melody` they play, the `leadChords` of its laser sections and the `lead` they play, and its
  `bass` and `arp`, all lines of steps, the arpeggio in sixteenths and the rest in eighths: a number is a note (the
  melody's and the lead's in semitones from the key, the bass's from the chord's root, the arpeggio's which of the
  chord's notes), `-` holds it and `.` rests; `waves` are its lead's two oscillators. The arpeggio joins on an act's
  `ARP_FROM`th level. A new part is a line and a synth beside `playArp`.

### Ideas flagged for later

- **Ride the wave:** a waveform line the piece rides, synced to the beat, with lasers crossing it. It fits the same
  way: a new hazard/track type and the phrases that place it, on the same beat clock and judging.
- Real music: give `TRACKS` a bpm and offset and drive `beatPos` from the song instead of the step count.
- A MUSIC setting in OPTIONS scaling `MUSIC_VOLUME` (music.js), for playing to the beat alone.
- Audio latency calibration: a setting that shifts judging (`pressBeat`) by the player's measured offset.
- Near-miss bonus for passing close to a burning beam.

### Credits:

	Developed by Nathan Mitchell
