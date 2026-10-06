=== Lazer Wave Game ===
Contributors: nathancarlmitchell
Tags: game, rhythm, arcade, html5, embed
Requires at least: 6.1
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.15.1
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
own. A level played from the level select has no lives: a death offers it again, as often as it takes. BOSS RUSH
plays the five bosses back to back, with records of its own.

Online leaderboards: players post their own scores to your site, under a name they type, on boards kept per
difficulty for a full run's total, a boss rush's total and each of the 25 levels played on its own, each score with
its MAX COMBO. The game's HIGH SCORES screen shows them (GLOBAL), beside each player's own bests, kept in their
browser (LOCAL), and so can any page:

* the **Lazer Wave Leaderboard** block (in the Widgets category), or
* the shortcode `[lazer_wave_scores]`, with `board` (`run`, the default, `rush`, or `level-1` to `level-25`),
  `difficulty` (`easy`, `normal`, the default, `hard` or `true`), `limit` (how many, 10 by default) and `title`

Example: `[lazer_wave_scores board="level-15" difficulty="hard"]`

A score shows at once. Tools > Lazer Wave Scores lists the newest, to hide one from the boards or delete it.

The game runs in its own frame, so your theme can't restyle it and it can't clash with the rest of the page.

Add it with:

* the **Lazer Wave Game** block (in the Embeds category), or
* the shortcode `[lazer_wave]`

Shortcode options:

* `aspect` - `16:10` (default, the game's own layout), `16:9` or `4:3`
* `align` - `wide` or `full`, if your theme supports wide and full alignment
* `controls` - `false` hides the bar with the hint, Fullscreen and "Open in a new window"

Example: `[lazer_wave align="wide"]`

Records and settings are saved in the player's browser; only the scores players choose to post are kept on your
site. Its OPTIONS have music and sound effect
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

= Can a score be faked? =

A browser game's score can always be forged by someone determined, so the site makes it hard to do grossly. A play
asks your site for a signed ticket as it starts, and its score must come back with that ticket, once, no higher than
the levels it claims could have given and no sooner than their songs could have played. Posting is rate-limited by
address, and names are held to the Disallowed Comment Keys in Settings > Discussion. Anything that gets through can be
hidden or deleted under Tools > Lazer Wave Scores.

= HIGH SCORES says it couldn't reach the site's scores =

The game talks to your site through the WordPress REST API, at /wp-json/lazer-wave/v1/. A security plugin or a
setting that turns the REST API off for visitors who aren't logged in blocks it, and so does a firewall rule against
/wp-json/. Allow that path for visitors.

= What does the leaderboard store? =

For each score posted: the board, the difficulty, the name typed, the score, how far the play got, how long it took,
when it was posted, and a salted hash of the address it came from (for the rate limits, and to tell the scores from
one place apart; the address itself is not kept). Deleting the plugin leaves the scores table in place, so a
reinstall keeps the boards.

== Changelog ==

= 1.15.1 =
* By touch, a tap on a results or pause button no longer presses the screen it opens as well: QUIT after failing a
  level from the level select no longer changes its difficulty, CONTINUE after clearing one no longer goes back past
  the select, and QUIT at a game over no longer opens the mode screen.

= 1.15.0 =
* The performance meter warns before it fails you: under 25%, on a difficulty where it can, the screen's edges glow
  red, beating with the music and stronger the emptier it gets, and the meter flashes DANGER beside its figure.
* A track failed by the meter says so: PERFORMANCE FAILED across the screen as it ends, and PERFORMANCE METER EMPTY
  under FAIL on its results, so it isn't mistaken for a laser hit.

= 1.14.9 =
* GREAT is magenta and GOOD is white now, wherever the grades are coloured: a hit target's burst and its word, the
  results' breakdown and their timing scale.
* A hit target's burst is its ring, its flash and the grade's word alone: no star for a PERFECT, no crack for a BAD.

= 1.14.8 =
* In laser form, a target you hit says how well you timed it, right where you are looking: it bursts in the grade's
  colour (PERFECT cyan, GREAT white, GOOD magenta, BAD amber), bigger and brighter the better the hit, with the grade
  rising off it. A PERFECT throws a star of light; a BAD cracks apart.

= 1.14.7 =
* The NEW HIGH SCORE name panel on a phone held upright now turns with the game instead of showing sideways, fits on
  small screens, and waits for a tap on its field before bringing up the keyboard.

= 1.14.6 =
* The music no longer stays silent until the page is reloaded. When the browser holds the game's sound and won't
  give it back (Edge can, after something else has had the sound, leaving only the sound effects that play from
  files), the game now starts its audio afresh a moment after you come back or press anything, as a reload would.

= 1.14.5 =
* The rank comes up a moment after the results do: every grade, A down to F as well as the S ranks, stamps in once
  FLAWLESS has landed (or would have), with the best under it coming up alongside it, and a new best grade's bells
  ring as it lands rather than before it is shown.

= 1.14.4 =
* S and S+ shine too, a step under SS: an S stamps in, glows and glints; an S+ adds a sheen drifting across it, a
  star as its glint leaves and a spark.

= 1.14.3 =
* An SS rank shines as FLAWLESS does: its face in the waves' two colours meeting in white with a sheen drifting
  across it, stamped in as FLAWLESS lands, a glint following FLAWLESS's, a star where it leaves, and sparks twinkling
  round it. Still, with the effects reduced.

= 1.14.2 =
* The music comes back after switching tabs or apps. When the browser held the sound while the game was away, the
  menu theme could stay silent after it let go, with only the clicks playing: it now starts again as soon as the
  sound does, and any click, key or tap wakes the sound where a browser waits for one.

= 1.14.1 =
* Every level ends cleanly. Once its last laser is done, nothing more is judged: the drums drop out, a press there is
  free and the combo is safe, and the waves come to rest in one line. On the next bar line the song resolves, each
  level's melody landing on its key note with a last kick and a crash, a ring going out from the orb, and the results
  follow two beats later. A boss brought down resolves the same way.
* Levels whose last beats came after their last laser judge a little fewer beats: Amber Alert's empty last bar is gone.

= 1.14.0 =
* Every level has its own melody and chorus now, over its act's chords: each act's first level plays the theme it
  always had, and each level after it builds toward the boss, whose music drives hardest, with sixteenth-note hats,
  a pumping bass and brighter synths.
* The lasers follow the music, so levels 2 to 5 of every act have new patterns, and every level deals its bars
  afresh: each now brings in every laser type and combination it lists, none more than twice. Level 1 is as it was.

= 1.13.4 =
* Sweepers and pendulums show where they are going, not just where they start: from their warning on, a lighter
  hatch with dashed edges covers all the ground they will still burn across, the sweeper's whole path with its safe
  lane left clear and the pendulum's whole swing, and it shrinks as they cross it.

= 1.13.3 =
* Every level warns 2 beats ahead, times the difficulty's rate, as the first twelve always did: the warnings no
  longer drop to 1.5 beats at level 13 and to 1 at level 22. Only the climbing tempo shortens them, so the shortest
  anywhere, TRUE on level 25, is 636 ms where it was 318.

= 1.13.2 =
* A full run's or a boss rush's MAX COMBO is now its combo at its longest, carried from level to level as the combo
  in the corner counts it, rather than the longest within any one level: on the leaderboards, on the name panel and
  in HIGH SCORES' LOCAL view. A level played on its own keeps the MAX COMBO its results show. Scores and records from
  before keep the combo they had.

= 1.13.1 =
* A new telling of the story. Every act's intro and every level's card tell it, a line or two a level, and none of
  them says how to play any more: the wave climbing from the dark below the red, the Array guarding the way up, and
  what waits at the Source of the Broadcast.

= 1.13.0 =
* HIGH SCORES is always on the start screen, with GLOBAL and LOCAL toggled under its title. LOCAL is the player's own
  bests, kept in their browser, every difficulty at once: for a full run and the boss rush the best total, the
  longest combo, how far one has got and the fastest finish with what it cost; for each level the best score from
  the level select and the best rank (or, unbeaten, how far an attempt has got). GLOBAL is your site's leaderboards,
  as before. Opened on its own, without your site, the game has LOCAL alone.
* A full run's or a boss rush's total counts as each level ends, deaths and the game over included, as their results
  show it, and says NEW BEST there when it is one: a run that never clears a level still leaves a best. The longest
  combo of a full run and of a boss rush, and the furthest level a full run has reached, are kept from this version
  on.

= 1.12.0 =
* START opens a mode select screen: FULL RUN, LEVELS or BOSS RUSH, each saying what it is and going on to the
  difficulty screen, titled with the mode. LEVELS and BOSS RUSH are no longer on the start screen. BACK, Esc or a
  controller's B goes back one screen at a time.
* The leaderboards keep each score's MAX COMBO: a level's longest combo, as its results show it, or for a full run or
  a boss rush the longest in any of its levels. It is a column on the HIGH SCORES screen, the Lazer Wave Leaderboard
  block and shortcode, and Tools > Lazer Wave Scores, and the name panel shows it. Scores posted before this update
  show a dash.
* The run board is called FULL RUN, as its mode is.

= 1.11.1 =
* Fixed: a cleared level asked for a name for the leaderboard whenever its score would make the board's top ten, so on
  a board with room left, every clear did, even one below your best. Only a new best asks now: a level cleared with
  its results saying NEW BEST, or a run or a boss rush whose total beats the most one had scored before.

= 1.11.0 =
* Online leaderboards. Players post their own scores to your site: a run's total, a boss rush's total and each level
  played from the level select, on boards kept per difficulty. A new best that would make its board's top ten asks
  for a name. HIGH SCORES on the start screen shows the boards, and the Lazer Wave Leaderboard block and the
  `[lazer_wave_scores]` shortcode show one on any page. Tools > Lazer Wave Scores hides or deletes a score.
* BOSS RUSH: the five bosses back to back, with lives, the charge and the combo carried from one to the next, and
  records of its own per difficulty: its best total, its fastest finish and each boss's best rank in it.
* Practice: START AT plays a level from the first bar of any laser it deals, or of a laser form section, and the top
  right names what the bar playing deals.
* A failed level says FAIL, under the level's number and name.
* Fixed: the sound and the lasers could drift apart after switching tabs or moving on to the next level, as the
  browser's estimate of its audio delay settled. The game now follows it as it changes.
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

= 1.12.0 =
The scores table gains a MAX COMBO column on the first page load after the update. Scores already posted keep their
place, with no combo shown.

= 1.11.0 =
Adds online leaderboards. The plugin makes a table for the scores on the first page load after the update.

= 1.8.0 =
Unlocks are now kept per difficulty: a level cleared on one difficulty opens the next on that difficulty only. A
run's total, with its multiplier carried from level to level, is now a record of its own.

= 1.2.0 =
Twenty-five new levels in five acts, with music, a level select and new options. Records from 1.1.0 are not carried
over, as the levels are new.
