=== Lazer Wave Game ===
Contributors: nathancarlmitchell
Tags: game, rhythm, arcade, html5, embed
Requires at least: 6.1
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Play Lazer Wave, a neon rhythm arcade game, on your WordPress site.

== Description ==

Lasers flicker as a warning, then fire on the beat. Steer out of them. You are two sine waves trailing neon: hit on
the beat, when they meet, in its colour: Z for cyan, X for magenta. Charge the overdrive meter and spend it with Space
to become a laser, untouchable, for two bars. At a gate, Space switches you to laser form: lock on, and hit the
targets in their colours while you dodge the lasers crossing your path. Five levels, 100 to 132 BPM, each ranked
from F to S+.

The game runs in its own frame, so your theme can't restyle it and it can't clash with the rest of the page.

Add it with:

* the **Lazer Wave Game** block (in the Embeds category), or
* the shortcode `[lazer_wave]`

Shortcode options:

* `aspect` - `16:10` (default, the game's own layout), `16:9` or `4:3`
* `align` - `wide` or `full`, if your theme supports wide and full alignment
* `controls` - `false` hides the bar with the hint, Fullscreen and "Open in a new window"

Example: `[lazer_wave align="wide"]`

Records and settings are saved in the player's browser, not on your site.

== Installation ==

1. Plugins > Add New > Upload Plugin, and choose lazer-wave-game.zip.
2. Activate it.
3. Add the Lazer Wave Game block or the [lazer_wave] shortcode to a page.

== Frequently Asked Questions ==

= How do I play? =

Mouse: your piece follows the cursor. Z or the left button hits a cyan beat, X or the right button a magenta one.
Space or the middle button passes a gate, and anywhere else spends a full overdrive meter. P to pause, H for help.
Touch: drag anywhere to steer, and tap the CYAN, MAGENTA and GATE / OVERDRIVE buttons. On a phone, use Fullscreen or
"Open in a new window".

= The keys scroll the page instead of playing =

Click the game first so it has the keyboard.

== Changelog ==

= 1.1.0 =
* Coloured beats: Z hits cyan, X hits magenta.
* Overdrive, spent with Space: two bars untouchable, double points, lasers absorbed.
* Laser form: gates switch it on and off; aim at targets and dodge the lasers crossing your path.
* A rank from F to S+ for every cleared level, and the best one kept.
* The game's files are versioned, so an update isn't hidden behind a cached copy.

= 1.0.0 =
* First release.
