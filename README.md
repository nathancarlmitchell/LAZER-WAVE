# Lazer Wave

## An HTML / JS rhythm arcade game (in development)

Built on the Focus Break engine: plain scripts, no build step, opens straight off disk or served.

### Running

Open `index.html`, or serve the folder (`node .claude/serve.js`, then http://localhost:8123/).

For WordPress, `node wordpress-plugin/build.js` copies the game into the plugin and builds
`wordpress-plugin/dist/lazer-wave-game.zip` (Plugins > Add New > Upload Plugin; then the Lazer Wave Game block or the
`[lazer_wave]` shortcode) and `lazer-wave-theme.zip`, a theme to match. Raise the plugin's version in
`lazer-wave-game.php` for each release: it is what makes sites fetch the new game files rather than cached ones.

### How to play:

 - Lasers flicker as a warning, then fire **on the beat**. Steer out of them. One on a held note burns for as long as
   the note holds. Some fall from the top of the screen instead of flickering in place: the fall is the warning, and
   they fire where they land. Some come as a pair closing on a note from above and below, a pincer: the gap between
   them is where the note is, and the place to be. A cage closes four at once, two across at the melody's note and two
   down at the bass's, low on the left and high on the right: get inside it. A corridor scrolls in from the right, a bar
   long, two walls with a gap between them that rides the melody, and burns the bar through: ride the gap. A mirror
   fires a note's laser and its reflection about the middle, and takes the middle on the beats the tune holds. A ripple
   runs four thin lasers on a note's sixteenths from its height to the next note's, quick as a scale. Crossfire's
   columns close in from both sides on the half beats and open out again: slip out before they meet. A sweeper wipes
   across the whole height over two beats with a hole at the note: be at its height as it comes by. A radar is a ray
   from the middle that comes round once a bar, its pivot burning too: keep ahead of it, round the middle. Later still:
   lasers on the off-beats; segments, on the bass's half of the screen only; a chord's notes all at once; a pendulum
   swinging the bar through and firing on every beat; double taps, a short burn on the beat and again on its "and";
   walls sliding in from the edges to fire either side of the bass's column; chasers, which hunt your height until
   half a beat before they fire; stutters, on and off in sixteenths for a beat; rings, safe inside or out; diagonals,
   leaning the way the melody goes; the spinning X, two lasers crossing at the melody's point and turning about it the
   bar through, half way round, its outline already turning through its warning to show which way: stay in your wedge
   and turn with it; and fills of thin lasers on a bar's last beat.
 - You are two sine waves trailing neon. The gap between them closes as each beat comes, and they meet on it: hit
   **on the beat**, when they meet, **in its colour**. A laser's colour is its beat's: **Z** for cyan, **X** for
   magenta. The wave of the coming beat's colour stays lit (cyan on top, magenta below) and the other dims. A beat with
   no laser takes either key, and the first act has no colours at all. PERFECT 100, GREAT 75, GOOD 50, BAD 25, times
   your multiplier and the difficulty's.
   Every 8 in a row raises the multiplier, up to x4. A missed or BAD beat, a press off the beat, or the wrong colour
   (WRONG) resets it.
 - Shields to start, three on NORMAL. A laser takes one and breaks your combo; the last one ends the attempt. On a run
   your shields and your overdrive charge carry over into the next level; a new attempt at a level starts on the
   difficulty's count and empty.
 - **Overdrive:** hits charge the meter beside your shields (16 PERFECTs fill it; a GREAT counts three quarters, a
   GOOD half, a BAD a quarter), and a chime in the song's key says when it is full. Full, press SPACE: it starts on the
   next beat (the one you press it on, if the press is inside its window, or else the one after) and lasts eight
   beats. You become a laser: lasers can't hurt you, hits score double, and flying through a laser as it fires absorbs
   it for a bonus. The colours still count.
 - **Wave / laser:** from level 3 on, every level switches to laser form for a few bars. A **gate** (a white line)
   sweeps in: press SPACE as it reaches you, on the beat, to switch; one gone by unpassed switches anyway and costs a
   shield. In laser form you lock to the left third of the screen, steer only up and down, and fire across it: each
   beat brings a target, and a hit counts only lined up with it (OFF TARGET otherwise) and in its colour. Lasers fire
   across your path, on a target's beat, between it and the next: hit it, hold while the laser burns, then cross.
   Overdrive makes you untouchable and widens your beam. Another gate switches you back.
 - Survive every bar to clear the level. There are **five acts of five levels**, climbing the visible spectrum from
   Infrared to Ultraviolet at 96 to 132 BPM, each level the same every attempt. New things come in one at a time: the
   melody's lasers, the fallers, laser form, the pincers and the cage in Act I, colours, walls and the corridor in Act II, beams down the screen, mirrors, ripples, the radar, crossfire, sweepers, marching columns and
   later warnings in Act III, colours on every beat, off-beats and segments, chords and pendulums, double taps and
   closing walls, chasers and stutters, rings, diagonals and the spinning X, two laser sections and two beams at once in
   Act IV, and
   fills and the shortest warnings in Act V.
 - Each act opens with its lore, typed out over its backdrop while its theme plays, and each new level with a card: its
   name and a line or two. A press brings the lore in at once and another goes on; a level's card starts the level by
   itself. A retry comes straight back to the level, and a death after its results. After the last level, an epilogue,
   then the finish.
   The time the story is up is left off the run's time.
 - **Level select:** LEVELS on the start screen shows every level, an act a row, each in its colour. Level 1 is
   always open, and a level opens once the one before it has been beaten, on any difficulty; a locked one is a
   padlock. An open one shows its name, and its best rank and best score on the difficulty chosen, and the next one
   to beat says NEXT.
   Pick one and the run starts there, with its act's story if it opens one. Only a run from Level 1 can set the best
   run, and playing again from the finish starts the run from where it began.
 - Every act has a backdrop and a song of its own, and every level a colour of the spectrum, from red at the first to
   violet at the last. The lasers follow the song: they fire on the melody's notes, as high on the screen as each note
   is high in the tune, laser form's targets trace the chorus, and each laser sounds the note it fires on. The song
   builds through its act, overdrive brightens it, and a clear resolves it on its last chord.
 - A cleared level is ranked F, D, C, B, A, S or S+ on how its beats were hit: a PERFECT counts the beat, a GREAT
   three quarters of it, a GOOD half and a BAD a quarter, a press off the beat or in the wrong colour takes half back,
   and a lost shield costs 5%. S+ needs every beat hit clean (no BAD), nothing off the beat or WRONG, and no shield
   lost. Beside the rank, the level's beats are broken down: how many were PERFECT, GREAT, GOOD, BAD and MISS (gone by
   unhit, WRONG or OFF TARGET), each one's share of them, and the longest
   combo; and so is its score: its points, the most it has been cleared with (NEW BEST when that is these), and the
   run's TOTAL with them.
 - Every level keeps its bests, on each difficulty: its best rank and its best score. Not its time, as a level lasts
   as long as its song whoever plays it; the run's time is still kept, since mistakes and retries lengthen it. The
   results set each against its best, and the level select's tiles and each level's card show them.
 - The results wait for you: **CONTINUE** adds the level's points to the total and goes on, **RETRY** plays the level
   again from nothing, and the total only ever keeps the attempt you continue from. The finish shows the run's total.
   The time the results are up is left off the run's time, as a pause is. A death has results of its own: how far the
   attempt got, its beats so far and its points, and the lives left, with **TRY AGAIN**, which the life spent pays
   for, the points kept, and **QUIT**. Out of lives it is **GAME OVER**, with **PLAY AGAIN** and **QUIT**.
 - **Difficulty**, the button under START, decides what a run is, and the button says what it gives. The numbers are
   `DIFFICULTIES` in run.js:
   - EASY: 5 lives, 4 shields, timing windows 30% wider, warnings 25% longer, half points.
   - NORMAL: 3 lives, 3 shields, the windows (PERFECT 50 ms, GREAT 80 ms, GOOD 110 ms, BAD 160 ms) and the warnings
     as written, points as scored.
   - HARD: 2 lives, 2 shields, windows 20% tighter, warnings 15% shorter, points x1.5.
   - TRUE: no lives, one shield, windows 35% tighter, warnings 30% shorter, points x2.
   Records are kept per difficulty, and a level beaten on any of them opens the next on all.
 - **Music and sound:** OPTIONS → **MUSIC** sets how loud the song plays under the beat, and **SOUND FX** how loud the
   sound effects are (the lasers' zaps, your shots, the gates, the menus' clicks and the rest): 100%, 75%, 50%, 25% or
   OFF each. The beat track (the kick, the hat and the count-in) stays as it is under both, so there is always a beat
   to play to: MUSIC OFF is for playing to it alone. An act's theme follows MUSIC too. A press on MUSIC plays a moment
   of the music at the new level, and one on SOUND FX clicks at its new level.
 - **Timing:** OPTIONS → **CALIBRATE** plays a steady beat to tap along to by ear, with whatever you play with. After
   4 warm-up taps it counts 16, shows where each landed, early or late, and suggests the TIMING OFFSET that puts them
   on the beat, with how steady they were; **USE** sets it. It measures what the game judges, so it takes in what the
   browser doesn't report of your speakers' or headphones' delay (a wireless headset's), your input's, and your own
   habit of tapping ahead or behind. Taps too scattered to trust, or too few, get no suggestion. The TIMING OFFSET
   button still steps by hand, from -100 to +100 ms; a calibrated offset can be anything within 300 ms either way.
   The waves meet, and the stripes, the sky and the count-in pulse, on the beat as it is judged, so the offset moves
   what you see as it moves what you are judged on: playing by eye and playing by ear agree.

### Controls:

	- Mouse: your piece follows the cursor.  Touch: drag anywhere to steer (relative, like a trackpad).
	- Z or LEFT MOUSE BUTTON = hit a cyan beat.  X or RIGHT MOUSE BUTTON = hit a magenta beat.  Touch: the CYAN and
	  MAGENTA buttons.
	- SPACE or MIDDLE MOUSE BUTTON = on a gate, switch between wave and laser; anywhere else, OVERDRIVE once its meter
	  is full (the beat nearest the press decides).  Touch: the white button, which says GATE or OVERDRIVE.
	- L = the level select, from the start screen.  P or ESCAPE = PAUSE, and again to resume.  H = instructions, from the start screen or a pause.  After a level, ENTER or SPACE = CONTINUE and
	  R = RETRY (or click or tap them).  After a death, ENTER, SPACE or R = TRY AGAIN and Q = QUIT; at the game over,
	  ENTER, SPACE or R = PLAY AGAIN.  After the final level, click or press R to play again.
	- On a story screen: a click, ENTER, SPACE, ESCAPE or Z / X (a tap; A or START on a controller) brings the lore in,
	  then goes on.
	- The pause has RESUME, HELP, RETRY (the level again from its start: it costs the run the time, not a mistake) and QUIT
	  (back to the start screen, the run abandoned). RESUME goes on at once with a controller; with the mouse or a finger
	  it counts 3-2-1 first, time to put the cursor back on the piece or the thumbs down. P or ESCAPE, H, R and Q press
	  them at the keyboard.
	- CALIBRATE: Z, X, SPACE or a mouse button taps (a click on BACK is BACK); a finger taps as it comes down; on a
	  controller, A or any hit button taps and B backs out. On its suggestion, ENTER uses it and R goes again.
	- Controller (a standard-mapped gamepad, named as on an Xbox pad): the left stick or the D-pad steers; LT, LB or X
	  hit cyan; RT, RB or B hit magenta; A or Y is the gate and overdrive; START pauses. On any screen the stick or
	  D-pad moves between the buttons, A presses the one lit, B backs out, and START starts, resumes or carries on.
	  Most browsers only let sound start after a click or a key press, not a controller's, so click the page once first.
	- Phones and tablets always play in landscape.

### The engine, file by file

| File | What it holds |
|---|---|
| `audio.js` | The synthesized beat track (kick, hat, count-in tick, laser zap, the piece's shot and gate sweep, and the overdrive meter's chime when it fills, on Web Audio), the playlist (`TRACKS`, for recorded songs: empty, as the levels' songs are synthesized, `music.js`), sound effects, all but the beat track at the SOUND FX setting's level (`sfxLevel`) |
| `layout.js` | The palette (`COLORS`), the 1280x800 layout frame, band fitting for phones, the HUD transform, banners, resize handling |
| `waves.js` | `LEVELS` (the 25 levels: name and lore, bpm, bars, warning lead, phrases, colours, laser sections, and the curve they climb), the `PHRASES` that fill a bar, placing their beams on the tune's notes, the `COLOR_PATTERNS` that paint one, laser form's `TARGET_PHRASES` (`tune` traces the chorus), the seeded timeline, and what goes on screen: `Beam`, `Target`, `Gate` |
| `story.js` | The acts (`ACTS`: name, their band of the spectrum, backdrop and lore; five levels each) and the epilogue, and the story screens between levels: an act's intro, typed over its backdrop to its theme, a level's card, the epilogue before the finish |
| `music.js` | Each act's song as MIDI notes (`SONGS`: a key, the `CHORDS` of its bars, its melody, the laser sections' lead, bass and arpeggio lines, and its lead's voice), and the Web Audio synths that play it on the beat track's clock: bass, pad, arpeggio and lead, an echo, and a dip under every kick. It builds through its act, the laser sections play the chorus, overdrive opens the filters, a pause or a death cuts it, a clear rings out on the key's chord, and an act's intro plays its theme. The MUSIC setting (`musicLevel`) scales all of it, or at OFF plays none, and a change plays a moment of Act I's theme to be heard. `songTune` tells the timeline where the tune's notes are, and `zapNote` which one a laser sounds |
| `run.js` | Difficulties (lives, shields, timing windows, warning times, points, and the blurb the start screen says them in), records per difficulty in localStorage (v3, for the 25 levels): best run, each level's best rank and best score, furthest level; which levels are beaten, and so open on the level select |
| `world.js` | `component`, the player piece's stepped movement, the `hazards` list and hit testing |
| `player.js` | The player's look: two sine waves drawn off its position history, drifting into a glowing trail, meeting on each beat, the coming beat's colour lit |
| `hud.js` | Score / deaths / act and level readout, the overdrive meter and the progress stripe |
| `fx.js` | The effects setting (auto / full / reduced / off, honouring reduced motion), `fxHash`, the CRT overlay |
| `sky.js` | Each level's colour, from its act's band of the spectrum, and each act's backdrop in it (`SKY_STYLES`: rising embers, a sun over a grid, an oscilloscope, a warp, an aurora), pulsing on the beat under the level and the story screens, still under the screens between levels. Moving at full effects, still when reduced, only the colour when off |
| `menu.js` | Start, options, help and level select screens (the select: an act a row, a tile a level, locked until the one before is beaten), settings persistence, hover flash, slogans, start-screen glitches |
| `titlelight.js` | The start screen's laser: a WebGL fragment shader on a screen-blended canvas over the game's, sweeping behind the title, with light-scattering rays the letters cut shadows through and their outlines burning where it passes. Only at full effects, and nothing at all without WebGL |
| `titleparticles.js` | The start screen's particles, on a screen-blended canvas of their own: neon dust drifting up, big soft lights far behind it, a shooting star now and then, and sparks struck off the title's letters where the laser crosses behind them, the dust near the laser catching its light. They cut out everything the start screen draws in front of its ground (the title, the buttons, the text, the stripes), so they pass behind all of it. Moving at full effects, still when reduced, gone when off; the dust and stars without WebGL, the sparks only with the laser |
| `calibrate.js` | The timing test (OPTIONS → CALIBRATE): a 100 BPM beat handed to the audio clock as a level's beats are, taps from every input timed by the input's own moment, each measured against its nearest beat less the audio delay the browser reports, and the offset they ask for (their mean once slips are left out, in 5 ms steps, within 300 ms), offered only when they are steady enough. Nothing on its screen moves on the beat |
| `levels.js` | Level start / end flow (a run from START or from the level select, a new level through its act's story and its card, a death or a retry straight back), the death message, a cleared level's results (the beat breakdown, the rank, the score against its best, and the run's total) and their CONTINUE and RETRY, the pause's RETRY and QUIT, the epilogue and the finish screen |
| `input.js` | `ACTIONS` (key / mouse / touch / controller bindings), mouse & multi-touch steering, touch buttons, the controller (Gamepad API polling, stick steering, moving between a screen's buttons), the pause panel and the touch resume countdown |
| `loop.js` | Game state, the fixed 10ms step loop, the beat clock (`beatPos`) and audio scheduling, the judging clock behind it (`judgePos`, `beatOpen`: a press less the audio's delay and the timing offset, which the misses, the lit wave and a target's or gate's stay all go by), hit judging, combo, shields, overdrive, and wave / laser form |

### Adding gameplay

- A new pattern is a function in `PHRASES` (waves.js) that fills one bar with `add(fireBeat, axis, pos, size, more)`,
  `more` being anything else the event carries (`{ hold }`, the beats a held note's beam burns for; `{ kind: "fall" }`
  for a faller); list its name in a level's `phrases`. It is handed the bar's `tune` too (`songTune`, music.js):
  `onset[i]`, the note the tune starts on beat i, or null, `hold[i]`, how many beats it is held, `sound[i]`, the note
  sounding on it, and `bass[i]`, the bass's note under it; `tuneBeam` and `tuneAt` put a note at its height on the
  screen, and `bassAt` the bass's across it, so the lasers follow the song.
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
  and `fit()`; `Beam` is the model (with `{ kind: "fall" }` or `{ kind: "slide", from, lead }` it moves to where it
  fires, with `{ kind: "chase" }` it hunts the piece's height, with `{ span }` it covers a stretch of the width), and
  `Corridor`, `Sweeper`, `Radar`, `Pendulum`, `Ring` and `Diagonal`, which draw and test themselves as shapes, the
  movers hitting across whatever they swept since the last step, the others.
  Read time from `beatPos`, not steps. One a press has to find on its beat (`Target`, `Gate`) stays while `beatOpen`
  says the beat can still be hit. Give it `absorb()` and overdrive can eat it.
- Add an action by adding an entry to `ACTIONS` in `input.js`; it gets keys, a mouse button, controller buttons, a touch button
  and a help line.
- An act's song is its entry in `SONGS` (music.js): its `key` as a MIDI note number (69 is A 440), the `chords` of its
  wave bars and the `melody` they play, the `leadChords` of its laser sections and the `lead` they play, and its
  `bass` and `arp`, all lines of steps, the arpeggio in sixteenths and the rest in eighths: a number is a note (the
  melody's and the lead's in semitones from the key, the bass's from the chord's root, the arpeggio's which of the
  chord's notes), `-` holds it and `.` rests; `waves` are its lead's two oscillators. The arpeggio joins on an act's
  `ARP_FROM`th level. A new part is a line and a synth beside `playArp`.

### Ideas flagged for later

- **Ride the wave** is the corridor now (Act II). What it could grow: lasers crossing the gap, and the next bar's path
  scrolling in behind it in place of the flat tail.
- Real music: give `TRACKS` a bpm and offset and drive `beatPos` from the track (`trackBeat`, audio.js) instead of the
  step count.
- Near-miss bonus for passing close to a burning beam.

Backlog (asked for, not yet done):

- Refine the timing windows, in ms (PERFECT 50, GREAT 80, GOOD 110, BAD 160 on NORMAL now).
- Discard the timing-window adjustment by difficulty: the same windows on every difficulty (the `window` lever in
  `DIFFICULTIES`, run.js).
- Keep the background animation running on the score card (the results screens draw the level's backdrop still and
  dimmed).
- A dedicated timing-window text on the HUD, instead of the cyan / magenta judgement colours.
- Show the player's keypress circle even on a MISS.
- Show the player's keypress circle during the count-in (presses there are free now: hitBeat ignores them).

### Credits:

	Developed by Nathan Mitchell
