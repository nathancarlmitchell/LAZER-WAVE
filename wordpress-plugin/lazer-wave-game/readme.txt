=== Lazer Wave Game ===
Contributors: nathancarlmitchell
Tags: game, rhythm, arcade, html5, embed
Requires at least: 6.1
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.2.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Play Lazer Wave, a neon rhythm arcade game, on your WordPress site.

== Description ==

Lasers flicker as a warning, then fire on the beat. Steer out of them. You are two sine waves trailing neon: hit on
the beat, when they meet, in its colour: Z for cyan, X for magenta. Charge the overdrive meter and spend it with Space
to become a laser, untouchable, for two bars. At a gate, Space switches you to laser form: lock on, and hit the
targets in their colours while you dodge the lasers crossing your path.

Twenty-five levels in five acts climb the visible spectrum from Infrared to Ultraviolet, at 96 to 132 BPM, with lore
between them. Every act has a synth song of its own, and the lasers fire on its notes. Each cleared level is ranked
from F to S+, and keeps its best rank and best score; a level select opens each level once the one before is beaten.

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
volumes, and CALIBRATE, which finds a player's timing offset as they tap along to a beat.

== Installation ==

1. Plugins > Add New > Upload Plugin, and choose lazer-wave-game.zip.
2. Activate it.
3. Add the Lazer Wave Game block or the [lazer_wave] shortcode to a page.

== Frequently Asked Questions ==

= How do I play? =

Mouse: your piece follows the cursor. Z or the left button hits a cyan beat, X or the right button a magenta one.
Space or the middle button passes a gate, and anywhere else spends a full overdrive meter. P to pause, H for help.
Touch: drag anywhere to steer, and tap the CYAN, MAGENTA and GATE / OVERDRIVE buttons. On a phone, use Fullscreen or
"Open in a new window". A controller works too: the stick steers, LT, LB or X hit cyan, RT, RB or B magenta, A or Y
take the gates and overdrive, and START pauses.

= Hits feel early or late =

In the game's OPTIONS, CALIBRATE plays a beat to tap along to and suggests the timing offset that puts the taps on it.

= The keys scroll the page instead of playing =

Click the game first so it has the keyboard.

== Changelog ==

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

= 1.2.0 =
Twenty-five new levels in five acts, with music, a level select and new options. Records from 1.1.0 are not carried
over, as the levels are new.
