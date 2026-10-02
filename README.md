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

 - Lasers warn, then fire **on the beat**. Steer out of them. A warning is a thin, dim outline until its last beat, when
   it comes up to full and flickers, and the ground it will burn is hatched: what is left clear is safe. A burning
   laser's red core, with a hard white edge, is all that can hit; the glow outside it is forgiven. A laser that moves
   while it can hit wears a run of small white triangles inside it, rimmed dark, repeated along its length off its hot
   white line on the side it is going to (clear of it by a tenth of the laser's thickness, 3 px at least, so the wide
   bands' triangles sit further out than the thin rays'), tips out toward that edge, blinking on the beat, for as long
   as it can hit: a sweeper across, a pendulum through each
   burn of its swing, and the radar's ray and the spinning X's arms round the way they turn. (Fallers, closing walls
   and chasers do their moving in their warnings, and are still by the time they can hit.) One on a held note burns for as long as
   the note holds. Some drop in from the top of the screen: their outline warns from the start where they will land,
   and they land on it early and sit there, then fire from it on the beat. Some come as a pair closing on a note from
   above and below, a pincer: the gap between
   them is where the note is, and the place to be. A cage closes four at once, two across at the melody's note and two
   down at the bass's, low on the left and high on the right: get inside it. A corridor scrolls in from the right, a bar
   long, two walls with a gap between them that rides the melody, and burns the bar through: ride the gap. A mirror
   fires a note's laser and its reflection about the middle, and takes the middle on the beats the tune holds. A ripple
   runs four thin lasers on a note's sixteenths from its height to the next note's, quick as a scale. Crossfire's
   columns close in from both sides on the half beats and open out again: slip out before they meet. A sweeper wipes
   across the whole height over a bar with a hole at the note: be at its height as it comes by. A radar is a ray
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
   Every 8 in a row raises the multiplier by one, with no ceiling, and on a run the combo carries from each level into
   the next, so a long streak of perfect play is what a run plays for; x5, x6 and on pop up at the orb as it climbs.
   A missed or BAD beat, a press off the beat, the wrong colour (WRONG), a gate not passed or a laser that gets you
   resets it. The score in the corner is the run's total so far, or the level's own when it is played from the
   level select.
 - Shields to start, three on NORMAL. A laser takes one and breaks your combo; the last one ends the attempt. On a run
   your shields and your overdrive charge carry over into the next level; a new attempt at a level starts on the
   difficulty's count and empty.
 - **Overdrive:** hits charge the meter beside your shields (16 PERFECTs fill it; a GREAT counts three quarters, a
   GOOD half, a BAD a quarter), and a chime in the song's key says when it is full, with a ring round your orb
   throbbing on the beat until it is spent, then shrinking as the overdrive runs out. Full, press SPACE: it starts on the
   next beat (the one you press it on, if the press is inside its window, or else the one after) and lasts eight
   beats, and for one beat more the lasers still can't hurt you, room to come back out of it. OPTIONS → **OVERDRIVE**
   set to AUTO spends it the moment it fills, from the next beat, with no press; MANUAL, the default, leaves it to
   SPACE. You become a laser:
   lasers can't hurt you, hits score double, and flying through a laser as it fires absorbs it for a bonus. The
   colours still count.
 - **Wave / laser:** from level 3 on, every level switches to laser form for a few bars. A **gate** (a white line)
   sweeps in: press SPACE, or either colour's key, as it reaches you, on the beat, to switch; one gone by unpassed switches anyway and costs a
   shield. In laser form you lock to the left third of the screen, steer only up and down, and fire across it: each
   beat brings a target, and a hit counts only lined up with it (OFF TARGET otherwise) and in its colour. Lasers fire
   across your path, on a target's beat, between it and the next: hit it, hold the quarter beat the laser burns, then
   cross. In laser form, and in overdrive, a ring closes on your orb as each beat comes, in the coming beat's colour,
   and arrives on it: the cue the waves give in wave form, where they meet on the beat.
   Overdrive makes you untouchable and widens your beam. Another gate switches you back. On a gate's beat, and through
   the glide after the switch, nothing can hit you: the piece goes where the cursor is, through anything, so when the
   next bar opens on a corridor, put the cursor in its gap before the gate and the piece lands there.
 - Survive every bar to clear the level. There are **five acts of five levels**, climbing the visible spectrum from
   Infrared to Ultraviolet at 96 to 132 BPM, each level the same every attempt. New things come in one at a time: the
   melody's lasers, the fallers, laser form, the pincers and the cage in Act I, colours, walls and the corridor in Act II, beams down the screen, mirrors, ripples, the radar, crossfire, sweepers, marching columns and
   later warnings in Act III, colours on every beat, off-beats and segments, chords and pendulums, double taps and
   closing walls, chasers and stutters, rings, diagonals and the spinning X, two laser sections and two beams at once in
   Act IV, and
   fills and the shortest warnings in Act V. From the end of Act I the levels also deal combinations, two types in one
   bar, which is where their own patterns come from: a box from a pincer and a cage, a crosshair from a ring and a
   diagonal, a sweeper through a cage, walls closing round the melody, chasers between columns. A combination never
   burns the other's place to be: a corridor comes alone, and a cage never with a laser on its own note, which would
   run through the middle of its cell. Every type stays in the mix through the levels after the one that introduces it.
 - **Boss fights.** Each act's fifth level is a fight with the Array. In Red Giant its node stands at the right edge, where the
   targets come from, with a health bar in the progress stripe's slot. Every target struck lined up takes a point of
   its health, and so does every laser absorbed in overdrive: its own bars are the wave bars, to survive, and yours
   are the laser bars. At none it breaks up and the bar plays out as a pause, the beat stopped, the song's last chord
   ringing and nothing left in it to hit or miss, and the level ends there, cleared. It does not end
   before that: at its last bar with the boss still up, the level goes round again from the bar before its last laser
   section, as many times as it takes, the health bar counting the rounds, and every beat of every round counts in
   the rank; a death's results count how far the boss was worn down as how far the attempt got, so a boss at full
   health reads 0%. Brought down, the boss pays a bonus, 1,000 points an act
   (Red Giant 1,000, Lazer Wave 5,000, at the difficulty's rate) times your multiplier as it stands: the whole of it
   for a fight finished within the level's own bars, and less the longer it runs on, a round more halving it; the
   health bar says what it pays now,
   and the results list what it paid. Past the first round nothing is earned: hits, beats lived through and lasers
   absorbed score nothing, and the streak holds without climbing, though a miss still breaks it, so a fight drawn out
   gains nothing and its bonus only shrinks. Each fight has a signature:
   Interference has a node at each edge, and its second laser section faces left, the piece locked on the right and
   the targets coming from the left; Static Bloom's node is the radar's pivot in the middle of the screen, and its
   arm runs slower the more it is hurt; Overdrive's node follows your height, and its ports open only while overdrive
   runs, so the meter is the way to hurt it; and Lazer Wave is a mirror of you on the right, firing back on every other
   beat of its bars at the height you were at a bar ago.
 - Each act opens with its lore, typed out over its backdrop while its theme plays, and each new level with a card: its
   name and a line or two. A press brings the lore in at once and another goes on; a level's card starts the level by
   itself. A retry comes straight back to the level, and a death after its results. After the last level, an epilogue,
   then the finish.
   The time the story is up is left off the run's time.
 - **Level select:** LEVELS, under START, shows every level, an act a row, each in its colour. Level 1 is
   always open, and a level opens once the one before it has been beaten on the difficulty chosen, in a run or on its
   own; each difficulty has unlocks of its own. A locked one is a
   padlock. An open one shows its name, and its best rank and best score on the difficulty chosen, and the next one
   to beat says NEXT. A DIFFICULTY button beside BACK changes the difficulty there, and the bests shown with it.
   Pick one and it plays, with its act's story if it opens one, and its results end there: LEVELS on them, or QUIT,
   goes back to the select with its best rank and score recorded, rather than on to the next level. Only a run from
   START can set the best run. A level played from the select has no lives: a death offers it again from nothing, its
   points gone as the pause's RETRY's are, as often as it takes, and is never the game over.
 - **Practice:** PRACTICE on the start screen plays any level, or a pattern of your own, without lives and unrecorded.
   Two tabs over its tiles pick the section, and the screen comes back on the one last used. **LEVELS** has a tile for
   every one of the game's 25 levels, an act a row in their colours of the spectrum as on the level select, the bosses
   marked, all of them open: it plays the level picked whole, as a run does, its song, its lasers, its laser form and
   its boss, with the difficulty's box beside them. Its preview plays the whole level after its rest, round and round,
   naming the lasers each bar deals as it goes (and the bar and the beat), and under it go the level's name and place,
   its tempo, length, warnings and laser form, and every laser it deals, in order; a tile's tooltip says the same.
   **CUSTOM** puts the makings of any level together and plays them. Pick one laser
   type, or two dealt into the same bars, from a tile for each of the 27 (in the order the levels bring them in), and
   set the rest in boxes: the form (wave, laser, or switching between them by turns: two bars of each), laser form's
   targets and the lasers to dodge between them, the beats' colours, the song (an act's, with its backdrop), a tempo
   from 72 to 132 BPM, a warning of 2, 1.5 or 1 beats, 4, 8 or 16 bars, and the difficulty. Point at a tile or a box
   (or light it with a controller, or tap it) and a tooltip beside it says what it does. What the form makes no use
   of is greyed out and takes no press, its tooltip saying what would turn it on: TARGETS and DODGES in wave form, which
   has no targets, and the laser tiles in laser form, which deals only targets. A preview plays the
   pattern's first bars round and round as it is put together, with the game's own lasers and backdrop and a piece to
   show where you would be (lining up with the targets in laser form), says what each type picked does, and says so
   when a pair is one the levels never deal (a corridor with anything, a cage with a laser on its own note). PLAY plays
   it after the count-in and a bar's rest. In either section, it can't be lost: a laser that gets you, or a gate let
   by, is counted as a HIT rather than costing a shield, and the meter never fails you; it has no lives, and nothing it
   does is recorded. Under the preview, in both, four boxes set how it is practised (each washed in cyan while it is
   doing something):
   **OVERDRIVE** (OFF, the default: no meter at all; ON: it charges and SPACE spends it; AUTO: spent the moment it is
   full; the OVERDRIVE setting in OPTIONS doesn't count here), **AUTO TIMING** (every beat hit for you exactly on it,
   PERFECT, in the colour it wants, gates passed; you steer, and in laser form lining up with each target is still
   yours; Z and X do nothing, SPACE still spends overdrive), **RESTART ON HIT** (a laser that gets you, or a gate let
   by, starts the practice again from the top at once) and **LOOP** (the pattern goes round and round, BARS a round,
   or a level's every bar after its rest, with no end and no results, until you pause and QUIT; the HUD counts the
   rounds; greyed out on a boss level, which goes round by itself until its boss falls). All four are off to begin with.
   Its results show the rank (with what was practised under it), the beats, the timing scale, the points, the hits
   and the **session best**, with **AGAIN** and **PRACTICE**, back to the screen as it was left. The choices are
   remembered; the session bests are not. A session best is the most a setup (the level, or the pattern as dealt; the
   difficulty, OVERDRIVE, AUTO TIMING and LOOP) has scored since the page was opened, kept in memory only, so a reload clears
   them all. It climbs with the score once an attempt passes it, as an arcade's high score does, so a LOOP still
   going and an attempt cut short by RESTART ON HIT count too: the HUD shows it beside the hits (in a new best's
   colour while the attempt is beating it), the results say NEW BEST when that attempt set it, and the practice
   screen shows the best for whatever is set up, over the preview.
 - Every act has a backdrop and a song of its own, and every level a colour of the spectrum, from red at the first to
   violet at the last. The lasers follow the song: they fire on the melody's notes, as high on the screen as each note
   is high in the tune, laser form's targets trace the chorus, and each laser sounds the note it fires on. The song
   builds through its act, overdrive brightens it, and a clear resolves it on its last chord.
 - A cleared level is ranked F, D, C, B, A, S, S+ or SS on how its beats were hit: a PERFECT counts the beat, a GREAT
   three quarters of it, a GOOD half and a BAD a quarter, a press off the beat or in the wrong colour takes half back,
   and a lost shield costs 5%. S+ needs every beat hit clean (no BAD), nothing off the beat or WRONG, and no shield
   lost, and SS all of that with every beat PERFECT. That much (no miss, one combo through every beat, no hit) is
   **FLAWLESS**, and the results flare it under the title: the word in the waves' two colours meeting in white, a streak
   of light through it, stamped in and glinting. It is worth no points. Beside the rank, the level's
   beats are broken down: how many were PERFECT, GREAT, GOOD, BAD and MISS (gone by
   unhit, WRONG or OFF TARGET) and each one's share of them, under the longest combo against the beats (MAX COMBO
   26 / 72: the level's own, not the run's carried in), coloured as the rank it would be on the same scale, so a combo
   through 90% of the beats or more is printed as an S is; and so is its score: its points (on a boss level, with what the boss paid of them on a line of its own), then
   on a run the run's TOTAL with them and the most a run has scored (NEW BEST when that is this one), or, from the
   level select, the most the level has been cleared with on its own (NEW BEST when that is these). Over the columns, a scale from early to late shows where every press landed, in the colour
   of what it earned and brighter where more did, with the average marked over them.
 - Every level keeps its bests, on each difficulty: its best rank, and its best score from being played on its own,
   from the level select, since a run's levels, with the multiplier carried in, are on another scale and a run is
   measured by its total. Not its time, as a level lasts
   as long as its song whoever plays it; the run's time is still kept, since mistakes and retries lengthen it. The
   results set each against its best, and the level select's tiles and each level's card show them.
 - The results wait for you, the level's backdrop moving on behind them: **CONTINUE** adds the level's points to the total and goes on, **RETRY** plays the level
   again from nothing, and the total only ever keeps the attempt you continue from. The finish shows the run's total.
   The time the results are up is left off the run's time, as a pause is. A death plays out first, for 1.3 s, whatever
   is pressed: a flash and a ring of the laser's red burst from the hit, the laser that took the last shield whitens and
   bleeds its glow while the picture dims, the core splits into a cyan copy and a magenta copy flying apart along the
   laser as the waves lose phase and their trail scatters, and it fades to dark (skipped with the effects
   reduced or off). Then it has results of its own: how far the
   attempt got, the timing scale of where its presses landed (as a clear's), its beats so far and its points, and the
   lives left, with **TRY AGAIN**, which the life spent pays
   for, the points kept, and **QUIT**. While a level is unbeaten, the furthest an attempt has got through it is kept
   (on a boss level, how far the boss was worn down), and a death that gets further says **NEW BEST** under how far it got;
   one that doesn't says how far the best got. Out of lives it is **GAME OVER**, with **PLAY AGAIN** and **QUIT**.
   The lives are in the corner under the level's line: a small copy of your piece for each, its two waves meeting at
   its core, dim once spent. A death's results show them the same way, the one it spent going out. Lives belong to a
   run from START; the level select's levels have none (above).
 - **Performance:** a meter under your shields starts each attempt at 75%. Every beat hit fills it, a PERFECT by 3%, a
   GREAT by 2%, a GOOD by 1% and a BAD not at all, twice that in overdrive; every beat missed, gone by unhit, WRONG,
   OFF TARGET or a gate not passed, drains it by 4%. Empty, the track is failed, which costs what a death costs.
 - **Difficulty** decides what a run is. START opens the difficulty screen, a button a difficulty, each saying what it
   gives, and pressing one starts the run on it; the level select has a difficulty button of its own. The numbers are
   `DIFFICULTIES` in run.js:
   - EASY: 5 lives, 4 shields, warnings 25% longer, half points; performance fills 25% faster and drains 25% slower,
     and can never fail you.
   - NORMAL: 3 lives, 3 shields, warnings as written, points as scored; performance as written.
   - HARD: 2 lives, 2 shields, warnings 15% shorter, points x1.5; performance fills 20% slower and drains 25% faster.
   - TRUE: no lives, one shield, warnings 30% shorter, points x2; performance fills 35% slower and drains 50% faster.
   The timing windows (PERFECT 50 ms, GREAT 80 ms, GOOD 110 ms, BAD 160 ms) are the same on every difficulty.
   Records are kept per difficulty, and so are the level select's unlocks: a level beaten on one opens the next there only.
 - **The song:** each act has one, and a level plays it through: a kick on every beat with a snare on the second and
   fourth, a hat on the off-beats, opened on the bar's last, and a fill through every fourth bar's end; a bass, a pad,
   an arpeggio from the act's second level, reversing every other bar, and the act's melody in two four-bar phrases
   played turn and turn about, or its chorus in a laser section. Every fourth bar of a section the bass turns around,
   and from the act's third level the song lifts a tone for a level's last four bars. The lasers follow the tune, so
   the second phrase moves them too. A level builds: the pad joins on its third bar and the arpeggio on its fifth,
   the first phrase comes back an octave up on its second time round, the bar before a laser section is a breakdown of
   bass and drums alone, the arpeggio sits left and the lead right with the pad split either side, and from Act IV the
   hats run in sixteenths. The arpeggio has a figure for each level of its act, as written on the second, leaping
   octaves on the third, galloping in pairs on the fourth and an octave up on the fifth, and each act has a drum kit
   of its own, deep and soft in the infrared and tight and bright in the ultraviolet, with a clap on the snare from
   Act III. The pad's filter drifts, the lead doubles an octave up in a chorus, and the bass opens up through its
   turnaround.
 - **Music and sound:** OPTIONS → **MUSIC** sets how loud the song plays under the beat, and **SOUND FX** how loud the
   sound effects are (the lasers' zaps, your shots, the gates, the menus' clicks and the rest): 100%, 75%, 50%, 25% or
   OFF each. The beat track (the kick, the hat and the count-in) stays as it is under both, so there is always a beat
   to play to: MUSIC OFF is for playing to it alone. An act's theme follows MUSIC too. A press on MUSIC over a paused
   level plays a moment of the music at the new level, and one on SOUND FX clicks at its new level. The game comes on
   with its startup sequence as the title's laser comes up: the game's gun charging and firing, a whine climbing three
   octaves over a throbbing hum and crackles of static, two lock-on pips, and the shot landing as the laser reaches the
   title, a crack and a boom with the key's chord humming on after it; a browser that holds sound until the page has
   had a click, a key or a tap plays it at the first of those, with the laser starting over to match.
 - **Sound effects:** besides the beat, the lasers' zaps and your shots, the game's moments have sounds of their own,
   synthesized as the startup is and, where they have a pitch, in the act's key: a gate passed (two tones meeting in
   the beam the waves become, or parting again back to the wave), overdrive coming on (a shot, and the power surging
   up) and running out (the surge in reverse), a laser absorbed in it (a zap played backwards), the multiplier
   climbing (three quick blips, higher for each step), a boss level's siren over the count-in, its boss brought down (a
   big chord stab over a gated snare and its debris), a new best on the results (bells; for a FLAWLESS, the octave as
   its stamp lands), the game over (an arcade's tube switching off) and the run's finish (the stab after a swell drawn
   in backwards). All of them follow SOUND FX.
 - **Menu theme:** the start screen and every menu over it (the settings, the difficulty, the instructions, the level
   select and practice) play the game's own theme, a synthwave song in A minor at 100 BPM on the same synths and
   drums as the acts' songs. Its pad swells in under the startup sequence's chord as it rings (or comes in at the
   first press, where the browser held sound back until one, even with SOUND FX off). Its four-bar intro of pad and
   arpeggio plays once; then the verse with the hook, the chorus with the lead doubled an octave up, and a breakdown
   that rolls back in, round and round, about 48 seconds a time. MUSIC sets how loud it is, live, so a press on MUSIC
   from the start screen is heard in the theme itself, and MUSIC OFF stops it. It gives way to the timing test, whose
   beat is the point, and stops while the page is out of sight, coming back at the start of the section it was in; a
   run fades it out under the story, and the menus start it again from the top.
 - **Timing:** OPTIONS → **CALIBRATE** plays a steady beat to tap along to by ear, with whatever you play with. After
   4 warm-up taps it counts 16, shows where each landed, early or late, and suggests the TIMING OFFSET that puts them
   on the beat, with how steady they were; **USE** sets it. It measures what the game judges, so it takes in what the
   browser doesn't report of your speakers' or headphones' delay (a wireless headset's), your input's, and your own
   habit of tapping ahead or behind. Taps too scattered to trust, or too few, get no suggestion. The TIMING OFFSET
   button still steps by hand, from -100 to +100 ms; a calibrated offset can be anything within 300 ms either way.
   The whole level runs on the beat as it is heard: the lasers fire, the targets and gates arrive, the waves meet and
   the stripes pulse where your presses are judged, so the offset (and the audio's own delay) moves what you see as it
   moves what you are judged on: playing by eye and playing by ear agree.

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
	- The pause has RESUME, RETRY (the level again from its start: it costs the run the time, not a mistake) and QUIT
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
| `audio.js` | The synthesized beat track (kick, hat, count-in tick, laser zap, the piece's shot, the overdrive meter's chime when it fills, on Web Audio; the drums can play into a node and on a kit of their own, as the menu theme's do), when the startup sequence plays (its sound is `sfx.js`'s), the playlist (`TRACKS`, for recorded songs: empty, as the levels' songs are synthesized, `music.js`), sound effects, all but the beat track at the SOUND FX setting's level (`sfxLevel`) |
| `layout.js` | The palette (`COLORS`), the 1280x800 layout frame, band fitting for phones, the HUD transform, banners, resize handling |
| `waves.js` | `LEVELS` (the 25 levels: name and lore, bpm, bars, warning lead, phrases, colours, laser sections, and the curve they climb), the `PHRASES` that fill a bar, placing their beams on the tune's notes, the `COLOR_PATTERNS` that paint one, laser form's `TARGET_PHRASES` (`tune` traces the chorus), the seeded timeline, and what goes on screen: `Beam`, `Target`, `Gate` |
| `story.js` | The acts (`ACTS`: name, their band of the spectrum, backdrop and lore; five levels each) and the epilogue, and the story screens between levels: an act's intro, typed over its backdrop to its theme, a level's card, the epilogue before the finish |
| `music.js` | Each act's song as MIDI notes (`SONGS`: a key, the `CHORDS` of its bars, its melody, the laser sections' lead, bass and arpeggio lines, and its lead's voice), and the Web Audio synths that play it on the beat track's clock: bass, pad, arpeggio and lead, an echo, and a dip under every kick. It builds through its act, the laser sections play the chorus, overdrive opens the filters, a pause or a death cuts it, a clear rings out on the key's chord, and an act's intro plays its theme. The MUSIC setting (`musicLevel`) scales all of it, or at OFF plays none, and a change over a paused level plays a moment of Act I's theme to be heard (on the menus, the menu theme is playing to hear it in: `theme.js`). `songTune` tells the timeline where the tune's notes are, and `zapNote` which one a laser sounds |
| `sfx.js` | The synthesized sound effects, each a function of (context, time, output, argument) built from a small kit (`sfxKit`: enveloped gains, oscillators, noise, filters, panners, a ping-pong echo, a room, pulse waves) so it can be rendered offline as well as played (`playSfx`), at its own level (`SFX_LEVELS`, set by measurement against the sounds around it) times SOUND FX's: the startup sequence, the gate, overdrive's start and end, the absorb, the multiplier, the boss's siren and fall, the new best's bells, the game over and the finale |
| `theme.js` | The menu theme: its song (`THEME`, in the acts' songs' notation: sections of bars with their chords and their bass, arpeggio and lead lines, how bright and which drums), played on music.js's synths and audio.js's drums (on a kit and into a bus of its own) by a timer of its own, the intro once and the rest round and round; when it plays (`themeWanted`: the start screen and its menus, not the timing test, MUSIC on, the page in sight) and the hand-over from the startup sequence (`themeSync`, `themeStart`, `themeStop`) |
| `run.js` | Difficulties (lives, shields, warning times, points, the performance meter's rates, and the blurb the difficulty screen says them in), records per difficulty in localStorage (v3, for the 25 levels): best run and the most a run has scored, each level's best rank and the best score it has been cleared with on its own, furthest level, how far through each unbeaten level an attempt has got; which levels are beaten, and so open on the level select |
| `world.js` | `component`, the player piece's stepped movement, the `hazards` list and hit testing |
| `player.js` | The player's look: two sine waves drawn off its position history, drifting into a glowing trail, meeting on each beat, the coming beat's colour lit |
| `death.js` | The death animation: the picture of the hit, taken as the level stops, worked over for 1.3 s before the results in three overlapping movements (the prism split, burn-through, decoherence); it plays out whatever is pressed, and reduced effects skip it |
| `boss.js` | The bosses: the Array's node at the right edge, its health (a point a target), the health bar in the progress stripe's slot, the break-up and the level's end at the bar it falls in, the loop that deals the level's last bars again while it stands, and the bonus it pays brought down, less the longer the fight ran; a level's `boss` in `LEVELS` names its fight |
| `hud.js` | Score / deaths / act and level readout, the overdrive meter and the progress stripe |
| `fx.js` | The effects setting (auto / full / reduced / off, honouring reduced motion), `fxHash`, the CRT overlay |
| `sky.js` | Each level's colour, from its act's band of the spectrum, and each act's backdrop in it (`SKY_STYLES`: rising embers, a sun over a grid, an oscilloscope, a warp, an aurora), pulsing on the beat under the level and the story screens, still under the screens between levels. Moving at full effects, still when reduced, only the colour when off |
| `menu.js` | Start, difficulty, options, help and level select screens (the select: an act a row, a tile a level, locked until the one before is beaten on the difficulty chosen), settings persistence, hover flash, slogans, start-screen glitches |
| `practice.js` | The practice screen, in two sections: LEVELS, a tile for each of the game's levels, played whole (`practiceWave`); CUSTOM, a tile a laser type, the boxes for the rest, the level they describe (`practiceDef`, dealt in the song and seeds of the chosen act's middle level), the live preview (the game's own lasers and backdrop drawn onto a canvas of its own the size of the layout, the game's state swapped for the preview's while they step and draw, and put back), the aids (OVERDRIVE, AUTO TIMING, RESTART ON HIT, LOOP), the session's bests (in memory only, per setup: `practiceKey`), and PLAY. The rules of a practice level (counted hits, no lives, no records) live with the rest of the game's, under `practice` (loop.js, levels.js) |
| `titlelight.js` | The start screen's laser: a WebGL fragment shader on a screen-blended canvas over the game's, sweeping behind the title, with light-scattering rays the letters cut shadows through and their outlines burning where it passes. Only at full effects, and nothing at all without WebGL |
| `titleparticles.js` | The start screen's particles, which go on rising behind its menu screens (the difficulty screen, the level select, the options, the help and the timing test, behind whatever they draw), on a screen-blended canvas of their own: neon dust drifting up, big soft lights far behind it, a shooting star now and then, and sparks struck off the title's letters where the laser crosses behind them, the dust near the laser catching its light. They cut out everything the screen draws in front of its ground, read off the canvas (the title, the text, the buttons' frames and labels, the stripes), so they pass behind all of it and show through the buttons' insides. Moving at full effects, still when reduced, gone when off; the dust and stars without WebGL, the sparks only with the laser |
| `calibrate.js` | The timing test (OPTIONS → CALIBRATE): a 100 BPM beat handed to the audio clock as a level's beats are, taps from every input timed by the input's own moment, each measured against its nearest beat less the audio delay the browser reports, and the offset they ask for (their mean once slips are left out, in 5 ms steps, within 300 ms), offered only when they are steady enough. Nothing on its screen moves on the beat |
| `levels.js` | Level start / end flow (a run from START or from the level select, or a practice level, a new level through its act's story and its card, a death or a retry straight back), the death message, a cleared level's results (the beat breakdown, the rank, the score against its best, and the run's total) and their CONTINUE and RETRY, the pause's RETRY and QUIT, the epilogue and the finish screen |
| `input.js` | `ACTIONS` (key / mouse / touch / controller bindings), mouse & multi-touch steering, touch buttons, the controller (Gamepad API polling, stick steering, moving between a screen's buttons), the pause panel and the touch resume countdown |
| `loop.js` | Game state, the fixed 10ms step loop, the beat clock (`beatPos`): the step count less the audio's delay and the timing offset, the beat as it is heard, which every laser, target, gate, pulse and judgment keeps to (`judgePos` is the same clock; `beatOpen` says whether a beat can still be hit), the delay latched as a level starts and read again on a resume, and the beat track scheduled 150 ms ahead from a steady timer as well as from the steps, held while the browser has the audio asleep, hit judging, combo, shields, overdrive, and wave / laser form |

### Adding gameplay

- To check that a level always leaves somewhere to stand, serve the game, open the browser console, paste in
  `.claude/safegap.js` and run `validateAll([10], 1000)`: it plays the level with the real lasers over a grid of piece
  positions and reports any moment with nowhere safe to reach, and the tightest moment (the share of the screen a piece
  could stand on and reach at a hand speed of 1000 px/s). Reload afterwards: it disarms the level to run it.

- A new pattern is a function in `PHRASES` (waves.js) that fills one bar with `add(fireBeat, axis, pos, size, more)`,
  `more` being anything else the event carries (`{ hold }`, the beats a held note's beam burns for; `{ kind: "fall" }`
  for a faller); list its name in a level's `phrases`, alone or in a combination ("a+b" deals both into one bar). It is handed the bar's `tune` too (`songTune`, music.js):
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
- A dedicated timing-window text on the HUD, instead of the cyan / magenta judgement colours.
- Adjust the player's colour on a keypress in wave form.
- Online high scores on the WordPress site, which players post their own runs to: best run total per difficulty to
  start, each score carrying the game version so a scoring change can start fresh boards. The plugin keeps them in a
  table of its own behind two REST routes (`lazer-wave/v1/scores`: GET a board, POST a score), and the embed passes
  their address on the iframe's URL as it passes `ver`, so the game shows a HIGH SCORES screen and a SUBMIT SCORE
  button only where it finds one; a block / shortcode shows a board on any page. A browser game's score can always be
  forged, so: limits on what the levels reached could give (worked out by build.js), a run ticket from the server
  refused if it comes back sooner than the songs could have played, rate limits, names checked against WordPress's
  disallowed words, and an admin screen to hide or delete. Open: guests typing a name (the suggestion) or members
  only. Test on a local WordPress (WordPress Playground).

### Credits:

	Developed by Nathan Mitchell
