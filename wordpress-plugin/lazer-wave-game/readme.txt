=== Lazer Wave Game ===
Contributors: nathancarlmitchell
Tags: game, rhythm, arcade, html5, embed
Requires at least: 6.1
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.10.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Play Lazer Wave, a neon rhythm arcade game, on your WordPress site.

== Description ==

Lasers flicker as a warning, then fire on the beat. Steer out of them. You are two sine waves trailing neon: hit on
the beat, when they meet, in its colour: Z for cyan, X for magenta. Every eight in a row raise your multiplier, with
no ceiling, and a run carries it from level to level. Charge the overdrive meter and spend it with Space to become a
laser, untouchable, for eight beats. At a gate, Space switches you to laser form: lock on, and hit the targets in
their colours while you dodge the lasers crossing your path.

Twenty-five levels in five acts climb the visible spectrum from Infrared to Ultraviolet, at 96 to 132 BPM, with lore
between them and a boss at the end of every act, a fight that goes round again until the boss falls. Every act has a
synth song of its own, and the lasers fire on its notes. A performance meter fills on every hit and drains on every
miss, and at empty the level is failed. Each cleared level is ranked from F to SS and keeps its best rank; a level
played on its own from the level select keeps its best score too, and a run keeps its best total. The level select
opens each level once the one before is beaten. Four difficulties, EASY to TRUE, picked as a run starts, set its
lives, shields, warnings, points and how fast the meter fills and drains, and each keeps records and unlocks of its
own. A level played from the level select has no lives: a death offers it again, as often as it takes.

The game runs in its own frame, so your theme can't restyle it and it can't clash with the rest of the page.

Add it with:

* the **Lazer Wave Game** block (in the Embeds category), or
* the shortcode `[lazer_wave]`

Shortcode options:

* `aspect` - `16:10` (default, the game's own layout), `16:9` or `4:3`
* `align` - `wide` or `full`, if your theme supports wide and full alignment
* `controls` - `false` hides the bar with the hint, Fullscreen and "Open in a new window"

Example: `[lazer_wave align="wide"]`

Records and settings are saved in the player's browser, not on your site. Its OPTIONS have music and sound effect
volumes, OVERDRIVE, which can spend a full meter by itself, and CALIBRATE, which finds a player's timing offset as
they tap along to a beat.

== Installation ==

1. Plugins > Add New > Upload Plugin, and choose lazer-wave-game.zip.
2. Activate it.
3. Add the Lazer Wave Game block or the [lazer_wave] shortcode to a page.

== Frequently Asked Questions ==

= How do I play? =

Mouse: your piece follows the cursor. Z or the left button hits a cyan beat, X or the right button a magenta one.
Space or the middle button passes a gate (Z and X pass it too), and anywhere else spends a full overdrive meter. P or Esc to pause, H for help.
Touch: drag anywhere to steer, and tap the CYAN, MAGENTA and GATE / OVERDRIVE buttons. On a phone, use Fullscreen or
"Open in a new window". A controller works too: the left stick or the D-pad steers, LT, LB or X hit cyan, RT, RB or B
magenta, A or Y take the gates and overdrive, and START pauses.

= Hits feel early or late =

In the game's OPTIONS, CALIBRATE plays a beat to tap along to and suggests the timing offset that puts the taps on it.

= The keys scroll the page instead of playing =

Click the game first so it has the keyboard.

== Changelog ==

= 1.10.0 =
* PRACTICE on the start screen. LEVELS plays any of the game's 25 levels whole, its preview naming the lasers in each
  bar. CUSTOM puts a pattern together from the levels' makings: any laser or two, in wave form, laser form or both by
  turns, with the targets, colours, song, tempo, warning and length you choose, a live preview and a tooltip on
  everything. Overdrive (off, on or automatic), AUTO TIMING, RESTART ON HIT and LOOP set how it is practised. Nothing
  can be lost and nothing is recorded; the best score for each setup is kept until the page is closed.
* The start screen and its menus play the game's own theme song. MUSIC sets its volume, and turns it off.
* A new startup sound, and new sounds for passing a gate, overdrive starting and running out, absorbing a laser, the
  multiplier climbing, a boss level's siren, a boss brought down, a new best or FLAWLESS, the game over and the run's
  finish. SOUND FX sets their volume.
* Moving lasers wear small blinking triangles pointing the way they are moving, while they can hit.
* The try again screen shows where your presses landed, as a cleared level's results do.

= 1.9.0 =
* Lives are icons, a small copy of your piece for each, in the corner and on a death's results, where the life just
  spent goes out.
* A level played from the level select has no lives: a death offers it again from the start, as often as it takes,
  and is never the game over.
* The results set the level's longest combo against its beats (MAX COMBO 26 / 72), coloured as a rank on the same
  scale. The combo counted is the level's own, not the one a run carried in.
* FLAWLESS: a clear with no miss, one combo through every beat and no hit is flared under the title. It is worth no
  points.
* Level 15's second bar fired a laser through the middle of a cage on every beat, right in the cell the cage asks you
  into. It is a plain cage now, as are the same bars in levels 11, 12 and 23.
* The death animation plays out whatever is pressed, and the REACHED figure after it is a little smaller.
* The waves start as wide apart as they did before 1.8.0.
* Fixed: the menu particles threw an error on every frame while the game's frame had no size, as in a hidden tab.

= 1.8.0 =
* The multiplier has no ceiling: every eight in a row raise it by one, it pops up at your orb as it climbs, and on a
  run the combo carries from each level into the next. The score in the corner is the run's total, or the level's own
  when it is played from the level select.
* Records to match: a run keeps its best total, set against it as BEST RUN on every clear, and a level keeps its best
  score from being played on its own, from the level select.
* A boss's bonus is multiplied by your multiplier. Past a boss level's first round nothing is earned and the combo
  holds without climbing, so drawing a fight out never pays.
* START opens a difficulty screen, each difficulty saying what it gives, and picking one starts the run. LEVELS sits
  under START, and the level select has a difficulty button of its own. Each difficulty has its own unlocks.
* OPTIONS > OVERDRIVE: AUTO spends a full meter the moment it fills; MANUAL, the default, leaves it to Space.
* The start screen's particles rise behind every menu screen and show through the buttons.
* The whole level keeps to the beat as it is heard: the lasers, targets and gates arrive with the sound, the timing
  offset and the audio's delay moving all of them; and the beat keeps time through long sessions and long pauses.
* The waves start closer together and open out as a streak builds. How far a game over reached is printed in white.

= 1.7.0 =
* A boss level runs until its boss falls: with the boss still up at the level's end it goes round again from the bar
  before its last laser section, the health bar counting the rounds. Brought down, the boss pays a bonus, 1,000 points
  an act, the whole of it for a fight finished in the first round and less the longer it runs; the rest of that bar is
  a pause, with no beat to hit or miss.
* Lasers that read on a busy screen: a warning is thin and dim until its last beat, the ground about to burn is hatched
  so what is left clear is safe, and a burning laser's core has a hard edge with the glow faint outside it.
* Nothing can hit you on a gate's beat or through the glide after the switch, so a bar after a laser section can open
  on a corridor. Corridors are dealt on their own: a cage across one shut its gap.
* While a level is unbeaten the furthest an attempt has got is kept, and a death that gets further says NEW BEST; on a
  boss level that is how far the boss was worn down.
* A startup sequence as the game comes on.

= 1.6.0 =
* A boss at the end of every act: RED GIANT, INTERFERENCE, STATIC BLOOM, OVERDRIVE and LAZER WAVE, each with a fight
  of its own and its health in the progress stripe; the level ends on the bar the boss falls in.
* Levels two bars longer, mixing their laser types in new combinations; the sweeper takes a bar and leaves a soft
  hole; segments fade at their ends; a beat ring on the orb in laser form.
* A performance meter: from 75%, every hit fills it by what it earned, twice as fast in overdrive, every miss drains
  it, and at empty the level is failed (never on EASY). The timing windows are the same on every difficulty: PERFECT
  50 ms, GREAT 80, GOOD 110, BAD 160.
* An SS rank over S+: every beat PERFECT, nothing stray, no shield lost and the boss down.
* A gate takes Z or X as well as Space.
* The music: a second phrase, a lift at the end of a level, a drum kit for every act with a backbeat, fills and
  hats, an arpeggio whose figure changes through the act, a breakdown before the lasers, and a stereo spread.
* A startup sequence as the game comes on, or at the first press where the browser holds sound until one.

= 1.5.0 =
* A death animation: a flash and a ring of the laser's red, the laser that struck whitening, the core splitting into
  its two colours and the waves scattering; 1.3 s, or a press.
* Overdrive on the orb: a ring round it throbs when the meter is full and shrinks as the time runs out, and for one
  beat after it ends the lasers still can't hurt you.
* Results: a scale of where every press landed, in the colour of what it earned, with the average marked; the
  level's backdrop keeps moving behind them.
* The orb lights on every press, a miss and the count-in included, at half strength.
* The pause panel has RESUME, RETRY and QUIT. The HUD no longer counts mistakes, and is smaller on phones.
* A level played from the level select ends on its results, with LEVELS back to the select.
* The start screen shows the most a run has scored.
* Fallers land on their outline early and warn from it, and the lasers of laser form burn a quarter of a beat.
* A level no longer starts paused on phones and in embedded frames.

= 1.4.0 =
* Lives across the run: a death spends one and offers the level again with its points kept, on results of its own
  with TRY AGAIN and QUIT; the death after the last life is the game over, with PLAY AGAIN and QUIT.
* On CONTINUE your shields and your overdrive charge carry over into the next level.
* Four difficulties, EASY, NORMAL, HARD and TRUE: lives, shields, timing windows, warning times and points, and the
  button under START says what each gives. Records are kept per difficulty.
* Four timing windows: PERFECT, GREAT, GOOD and BAD. A BAD spends the beat but breaks the combo.
* Overdrive starts on the next beat, and a chime in the song's key says when the meter is full.
* New lasers through the acts: fallers and held-note burns, pincers, the cage, the corridor, mirrors, ripples,
  crossfire, sweepers, the radar, off-beats, segments, chords, pendulums, double taps, closing walls, chasers,
  stutters, rings, diagonals, fills and the spinning X.
* A lighter plugin: an unused siren sample is gone.

= 1.3.1 =
* The waves meet, and the stripes, the sky and the count-in pulse, on the beat as it is judged: the timing offset
  moves what you see as it moves what you are judged on, so playing by eye and by ear agree.

= 1.3.0 =
* A RESUME button on the pause panel, and Esc pauses as P does.
* A hit late in its window is judged before its beat is called missed, whatever the audio delay or timing offset.

= 1.2.0 =
* Five acts of five levels, from Infrared to Ultraviolet at 96 to 132 BPM, each act with its lore, its own backdrop and
  a colour of the spectrum for every level.
* A synth song for every act, and the lasers fire on its notes.
* A level select: each level opens once the one before it is beaten, and keeps its best rank and best score.
* Results after every level: its beats broken down, its rank, its score against its best and the run's total, with
  CONTINUE and RETRY.
* Controller support, and RETRY and QUIT on the pause panel.
* A laser sweeping behind the title, and particles behind the start screen.
* OPTIONS: MUSIC and SOUND FX volumes, and CALIBRATE, a tap-along test that finds the timing offset.
* Records start afresh, as the levels are new.

= 1.1.0 =
* Coloured beats: Z hits cyan, X hits magenta.
* Overdrive, spent with Space: two bars untouchable, double points, lasers absorbed.
* Laser form: gates switch it on and off; aim at targets and dodge the lasers crossing your path.
* A rank from F to S+ for every cleared level, and the best one kept.
* The game's files are versioned, so an update isn't hidden behind a cached copy.

= 1.0.0 =
* First release.

== Upgrade Notice ==

= 1.8.0 =
Unlocks are now kept per difficulty: a level cleared on one difficulty opens the next on that difficulty only. A
run's total, with its multiplier carried from level to level, is now a record of its own.

= 1.2.0 =
Twenty-five new levels in five acts, with music, a level select and new options. Records from 1.1.0 are not carried
over, as the levels are new.
