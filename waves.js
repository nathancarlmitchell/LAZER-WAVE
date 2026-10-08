// Lazer Wave -- the waves. What each level is (its tempo, its length, the phrases it is built from), the phrases
// themselves, the timeline a level is built into, and what it puts on screen: the Beam, a laser that warns, fires on
// the beat, and fades, and the Corridor, a bar of walls with a gap between them that rides the melody; and for laser
// form, the Target to hit and the Gate that switches the form.
// index.html loads this with a plain <script src>, as globals rather than modules, so the game still opens straight
// off disk. Nothing here runs at load beyond building the tables.
//
// Time here is in beats, read from beatPos (loop.js), never in steps: a level is a piece of music, and everything in
// it lands on the grid. A level is built from a seeded random stream, so it is the same level every attempt -- a
// rhythm game is learned, and a death should send you back to the same bars, not new ones.
//
// The phrases are the extension point. A phrase fills one bar by calling add(); a new mechanic (a sweeping beam, a
// ring; the Corridor below is one) is a new hazard type plus the phrases that place it, and the loop, the beat clock
// and the judging don't change.

var BEATS_PER_BAR = 4;
var COUNT_IN_BARS = 1; // a bar of clicks before the level proper: time to find the beat
var BEAM_FIRE = 0.5; // of its note a beam burns for once it fires: half a beat on a beat's note, a beat on one held two
var BEAM_FADE = 0.35; // beats its afterglow takes to go, harmless
var BEAM_SIZE = 0.13; // how much of the screen a horizontal beam covers, as a fraction of the height
var BEAM_SIZE_V = 0.09; // and a vertical one, of the width
var BEAM_CORE_MAX = 8; // px: the white line down a beam's middle, at most
var BEAM_INSET = 0.15; // of a beam's thickness on each side that is glow rather than hitbox: grazes are forgiven
var BEAM_ABSORB = 0.3; // beats an absorbed beam takes to collapse (overdrive, loop.js)
var FALL_LAND = 0.6; // of its warning a faller takes to land: from there it sits on its outline, warning as any beam
                     // does, until it fires
var SEGMENT_FADE = 0.06; // of the width a segment's end dissolves over where it stops short of the screen's edge, so it
                         // reads as a beam reaching in rather than one cut off; a graze is forgiven there
var PINCER_GAP = 0.2; // of the height: the gap a pincer leaves at its note, between its two beams, and a cage's
                      // across; at TRUE's, wider at an easier difficulty's (gapRoom)
var CAGE_GAP = 0.2; // of the width: the cell a cage leaves at the bass's note, between its two beams down the screen;
                    // at TRUE's, wider at an easier difficulty's (gapRoom)
var CAGE_LEFT = 0.2, CAGE_RIGHT = 0.8; // where the bass's lowest note and its highest put that cell's middle
var WALL_GAP = 0.3; // of the height: the gap a wall leaves, at TRUE's; wider at an easier difficulty's (gapRoom)
var WALL_EDGE = 0.08; // of the height: the least of the screen a wall's beam keeps, above its gap and below it, so
                      // the gap never reaches an edge
var CORRIDOR_GAP = 0.3; // of the height: the gap between a corridor's walls, at TRUE's; wider at an easier
                        // difficulty's (gapRoom)
var CORRIDOR_BEAT = 0.25; // of the width a beat of a corridor's path takes up on the screen: a bar of it is the screen
var CORRIDOR_NOW = 0.25; // where across the screen, as a fraction of the width, a corridor's present is: what is to the
                         // right is still to come, scrolling in, and what is to the left has gone by
var CORRIDOR_INSET = 0.12; // of the gap forgiven at each wall's edge: a graze is forgiven, as a beam's glow is
var CROSSFIRE_SPREAD = 0.4; // of the width: how far from the column it closes on a crossfire's pair of columns starts
var RIPPLE_SIZE = 0.065; // of the height: a ripple's thin beams
var SWEEP_BEATS = BEATS_PER_BAR; // beats a sweeper takes to wipe across the screen at TRUE's pace: the bar; at a
                                 // slower one's, the longer, on past its bar (Sweeper)
var SWEEP_GAP = 0.3; // of the height: the hole in a sweeper, at its note, to be in as it comes by; at TRUE's, wider at
                     // an easier difficulty's (gapRoom)
var SWEEP_EDGE = 0.03; // of the height: the least kept between a sweeper's hole and the screen's edges
var SWEEP_FADE = 0.25; // of the hole the band dissolves over at each of its edges, so the hole reads as a gap in the
                       // light rather than a cut through it; the edge a graze is forgiven (BEAM_INSET) lies inside it
var RADAR_BEATS = BEATS_PER_BAR; // beats a radar's ray takes to come round at TRUE's pace: once a bar; at a slower
                                 // one's, the longer, on past its bar (Radar, MOVERS)
var RADAR_WIDTH = 14; // px: the ray's core; its glow is wider
var RADAR_CORE = 0.06; // of the height across: the hot disc at the ray's pivot, burning throughout
var RADAR_TRAIL = 0.5; // radians of phosphor drawn behind the ray, which is only light
var CHASE_LOCK = 0.5; // beats before its beat a chaser stops following the piece's height
var CLOSE_LEAD = BEATS_PER_BAR; // beats closing walls take to slide in from the edges
var CLOSE_GAP = CAGE_GAP; // of the width: the gap closing walls land either side of, a cage's cell, at TRUE's; wider
                          // at an easier difficulty's (gapRoom)
var PENDULUM_BEATS = BEATS_PER_BAR; // beats a pendulum takes to swing there and back at TRUE's pace; at a slower
                                    // one's, the longer, on past its bar, firing on every beat of it (Pendulum)
var RING_R = 0.3; // of the height: a ring's radius when it fires
var RING_WIDTH = 12; // px: a ring's core; its glow is wider
var DIAGONAL_TILT = Math.PI / 4; // radians a diagonal leans, one way or the other
var SPIN_BEATS = BEATS_PER_BAR; // beats the spinning X burns for at TRUE's pace: the bar; at a slower one's, the
                                // longer, on past its bar, turning the slower, so as to turn as far (Spinner)
var SPIN_TURN = 2 * BEATS_PER_BAR; // beats it takes to come full circle at TRUE's pace, so it turns half way round
                                   // over its burn
var SPIN_WIDTH = 14; // px: each of its arms' core; their glow is wider
var SPIN_LEFT = 0.3, SPIN_RIGHT = 0.7; // where across the screen the bass's lowest note and its highest put its pivot,
                                       // kept in from the edges so every wedge of it has room
var SPIN_TOP = 0.3, SPIN_BOTTOM = 0.7; // and where down it the tune's highest note and its lowest do
// The lasers that move as they burn and, at a slower difficulty's pace, make their whole way all the same, the longer,
// on past their bar: a sweeper, the radar, a pendulum and the spinning X, by their axes (and their phrases' names). And
// what one of them is done before all the same, going just fast enough for that: another of them, and a bar that asks
// the player into a place of its own (buildTimeline)
var MOVERS = { sweep: true, radar: true, pendulum: true, spin: true };
var MOVER_YIELDS = { sweep: true, radar: true, pendulum: true, spin: true, cage: true, pincer: true, corridor: true,
    close: true };
var FILL_SIZE = RIPPLE_SIZE; // a fill's thin beams
// The drifting lasers (Drifter, Mine, below): small lasers that come in at the right edge and cross the screen slowly,
// a way to be found through them rather than a beat to react to, while the other lasers go on firing
var DRIFT_BEATS = 2 * BEATS_PER_BAR; // beats one takes to cross the screen at TRUE's pace: two bars, half a
                                     // corridor's; longer as a difficulty slows the moving lasers (laserPace)
var DRIFT_INSET = 0.2; // of one's thinner side forgiven at each edge, as a beam's glow is
var DRIFT_TRAIL = 0.45; // beats of its way its fading trail shows behind it
var DRIFT_ARROW = 16; // px: the warning arrow at the right edge, at most
var SWARM_SIZE = 0.018; // of the height: a swarm's laser's thickness
var SWARM_LEN = [0.03, 0.06]; // of the width: its length, somewhere between these
var SWARM_LANE = 0.12; // of the height: how far it is kept from the melody's note, each side
var SWARM_MOTES = 2; // lasers coming in on each eighth note, and one more on a note's beat
var ROLL_SIZE = 0.036; // of the height: a note's thickness in the piano roll
var ROLL_CHORD = 0.022; // and a chord's note's
var ROLL_GAP = 0.014; // of the width: left between one note and the next
var MINE_ARM = 0.17; // of the height: how far each arm of a mine's burst reaches from it
var MINE_WIDTH = 0.04; // of the height: an arm's thickness
var MINE_BODY = 9; // px: a mine's body, from its middle to its points
var MINE_DRIFTS = [BEATS_PER_BAR, 1.5 * BEATS_PER_BAR]; // beats a mine drifts before it bursts, by turns
var MINE_FUSE = 2; // beats its fuse takes to close in on it
var MINE_FUSE_R = 34; // px: how far out the fuse starts, past the body

// The levels: five acts of five (ACTS, story.js), each act a band of the spectrum and a song (SONGS, music.js). name
// and lore: what its card says before it is played, a line or two of the story (never how to play it). bpm is the
// tempo; warn is how many beats ahead a beam shows its outline; colors is the colour patterns its bars are painted from
// (see COLOR_PATTERNS), none for a colourless level; dodges is how many lasers each laser form bar fires across the
// path between its targets, at most.
// chart is the level, bar by bar after the count-in, an entry a bar, its place in the list the bar's number (bar 0, the
// opening rest, first; BAR 3 in practice is the fourth entry). An entry is "rest"; a phrase (PHRASES); a combination
// of two or three, dealt into the bar together ("pincer+cage", "swarm+rain+stairs"), which is how the later levels make
// patterns of their own out of the types before them; or a bar in laser form, "laser:" and the targets it deals
// (TARGET_PHRASES: "laser:zigzag"), a run of them a laser section, opened and closed by a gate. The level is done with
// its last laser, and its song resolves on the bar line after (calmAt, loop.js). Each bar's details (a height where the
// tune has no note, a wall's gap, a bar's colours) are drawn by a stream of the bar's own (barRandom), so changing one
// entry changes that bar alone.
// What a chart should keep to: a combination never burns the other's place to be. A corridor goes with nothing, as its
// gap is the only place to be and a cage or a pincer across it shuts it, and a cage goes with nothing that fires on its
// own note (the melody, the mirror), whose beam would run through the middle of the cell it asks the player into. A
// drifting laser (the piano roll, the swarm, mines) is still crossing in the bars after its own, two at TRUE's pace and
// more at a slower one's (laserPace), so none of them should be a cage, a pincer, a corridor or closing walls; and it
// should not come just before a laser section or the level's end, where it would hardly get across (a mine due to
// burst after either never comes). A sweeper, the radar, a pendulum or the spinning X, slower at an easier difficulty,
// goes on into the bars after its own, done before laser form, the level's end, another of them, or a bar with a place
// of its own to be in (MOVER_YIELDS), so it needs no keeping to; but one followed straight away by one of those can't
// slow down at all, and a rest after it gives it room (PROGRESSION.md lists them). node .claude/progression.js checks
// the charts for all of it, on every difficulty, as .claude/safegap.js does in the browser (validateAll,
// cellConflicts, driftDeals).
// boss, if given ({ name, kind, hp }), makes the level a fight with the Array (boss.js): hp is its health, which every
// target struck takes a point of (a laser absorbed in overdrive pays but doesn't hurt it; without hp, a point a
// target), and its kind is its signature, "node", "twin", "radar", "chaser" or "mirror"; the level does not end while
// the boss stands, but goes round again from the bar before its last laser section (loopFrom) until it falls, and its
// bonus is whole until the end of the earliest round it can fall in (bossPar), less for every round after.
//
// The curve climbs a step at a time, bringing in one thing at once and letting it settle before the next: the melody's
// beams, then fallers and a beam on every beat (2), then laser form (3), pincers (4) and the cage (5); colours (6),
// walls (7), the corridor (8), colours in pairs (9); beams down
// the screen and their mirrors (11), ripples and the radar (12), marching columns and crossfire (13),
// sweepers (14); colours on every beat, off-beats and segments (16), chords, pendulums and two laser sections (17),
// double taps, closing walls, two beams at once and a second laser to dodge (18), chasers and stutters (19), rings,
// diagonals and the spinning X (20); and in the last act, the drifting lasers, slow enough to steer a way through
// while the rest keep firing: fills and the piano roll (21), the swarm (22), and mines and bars of three phrases
// (24). The tempo climbs from 96 to 132, and it alone shortens the
// warnings: every level warns 2 beats ahead (at the difficulty's rate), never under about 640 ms, even on TRUE.
const LEVELS = [null,
    // Act I, Infrared: the beat, the melody, and laser form
    { name: "Signal", lore: ["In the warm dark below the red, something stirs.",
            "Two waves meet, part, and meet again. You are awake."],
        bpm: 96, warn: 2, colors: [], chart: [
            "rest", "melody", "melody", "melody", "melody", // bars 0-4
            "rest", "melody", "melody", "melody", "melody", // bars 5-9
        ] },
    { name: "Carrier", lore: ["Far above you a song is playing. It always has been.",
            "You were made to carry it."],
        bpm: 98, warn: 2, colors: [], chart: [
            "rest", "rain", "melody", "rain", "fall", // bars 0-4
            "melody", "rain", "rest", "fall", "melody", // bars 5-9
        ] },
    { name: "Ember Line", lore: ["A line of embers marks the edge of the visible.",
            "No signal born below it has ever crossed."],
        bpm: 99, warn: 2, colors: [], dodges: 0, chart: [
            "rest", "melody", "rest", "fall", "rest", // bars 0-4
            "laser:tune", "laser:tune", "laser:tune", // bars 5-7, laser form
            "rain", "melody", "rain", "fall", // bars 8-11
        ] },
    { name: "Heat Haze", lore: ["The air ripples, and the world swims and doubles.",
            "Somewhere in the haze, the Array has noticed you."],
        bpm: 101, warn: 2, colors: [], dodges: 0, chart: [
            "rest", "fall", "rain", "pincer", // bars 0-3
            "laser:tune", "laser:tune", "laser:tune", "laser:tune", // bars 4-7, laser form
            "melody", "fall", "rest", "pincer", // bars 8-11
        ] },
    { name: "Red Giant", lore: ["The Array's first watchtower burns like a dying star.",
            "It has kept this border since before light had colours."],
        bpm: 102, warn: 2, colors: [], dodges: 1, boss: { name: "RED GIANT", kind: "node", hp: 30 }, chart: [
            "rest", "melody", "cage", "rest", "pincer+cage", // bars 0-4
            "fall", // bar 5
            "laser:hold", "laser:tune", "laser:hold", "laser:hold", // bars 6-9, laser form
            "fall", "pincer+cage", "melody", "cage", // bars 10-13
        ] },
    // Act II, Sodium: the colours, and walls
    { name: "Streetlight", lore: ["A streetlight flickers on as you pass beneath it,",
            "then the next, then the next. The city knows you."],
        bpm: 104, warn: 2, colors: ["solid"], dodges: 0, chart: [
            "rest", "fall", "rain", "rest", "melody", // bars 0-4
            "laser:hold", "laser:hold", "laser:hold", // bars 5-7, laser form
            "rest", "fall", "melody", "rain", // bars 8-11
        ] },
    { name: "Amber Alert", lore: ["Sirens wash the streets in orange.",
            "Every relay in the city turns to face you."],
        bpm: 105, warn: 2, colors: ["solid"], dodges: 1, chart: [
            "rest", "pincer", "rain", "wall", "melody", // bars 0-4
            "pincer", // bar 5
            "laser:jump", "laser:tune", "laser:tune", "laser:hold", // bars 6-9, laser form
            "rest", "melody", "wall", "rest", // bars 10-13
        ] },
    { name: "Sodium Rain", lore: ["Orange rain falls through the lamplight.",
            "Each drop carries a scrap of the Broadcast to the street."],
        bpm: 107, warn: 2, colors: ["solid"], dodges: 1, chart: [
            "rest", "rain", "melody", "wall", "rain", // bars 0-4
            "corridor", // bar 5
            "laser:steps", "laser:steps", "laser:steps", "laser:tune", // bars 6-9, laser form
            "cage", "corridor", "cage", "melody", // bars 10-13
        ] },
    { name: "Afterglow", lore: ["The lamps go out, but their light lingers on the wet stone.",
            "So does the other voice. It is closer now."],
        bpm: 108, warn: 2, colors: ["solid", "pairs"], dodges: 1, chart: [
            "rest", "pincer+cage", "fall", "melody", "cage", // bars 0-4
            "fall", // bar 5
            "laser:jump", "laser:jump", "laser:steps", "laser:tune", // bars 6-9, laser form
            "rain", "melody", "cage", "pincer+cage", // bars 10-13
        ] },
    { name: "Interference", lore: ["At the edge of the amber city, two signals collide.",
            "One of them is wearing your shape."],
        bpm: 110, warn: 2, colors: ["solid", "pairs"], dodges: 1, boss: { name: "INTERFERENCE", kind: "twin", hp: 40 }, chart: [
            "rest", "pincer+cage", "corridor", // bars 0-2
            "laser:steps", "laser:steps", "laser:jump", // bars 3-5, laser form
            "rest", "rain", // bars 6-7
            "laser:steps", "laser:steps", "laser:steps", // bars 8-10, laser form
            "melody", "pincer+cage", "wall", "corridor", "melody", // bars 11-15
        ] },
    // Act III, Phosphor: beams down the screen, columns, and lasers that move
    { name: "Phosphor", lore: ["Green light, old and patient.",
            "Every trace that crosses it lingers. Yours will too."],
        bpm: 111, warn: 2, colors: ["solid", "pairs"], dodges: 1, chart: [
            "rest", "rain", "wall", "cross", "melody", // bars 0-4
            "cross", // bar 5
            "laser:tune", "laser:tune", "laser:tune", "laser:zigzag", // bars 6-9, laser form
            "mirror", "wall", "rain", "cage", // bars 10-13
        ] },
    { name: "Radar Sweep", lore: ["An arm of light has circled this dark for a hundred years.",
            "Tonight it finds something new."],
        bpm: 113, warn: 2, colors: ["solid", "pairs"], dodges: 1, chart: [
            "rest", "cage", "radar", "rain", "pincer", // bars 0-4
            "ripple", // bar 5
            "laser:zigzag", "laser:tune", "laser:zigzag", "laser:tune", // bars 6-9, laser form
            "rain", "ripple", "cross", "radar", // bars 10-13
        ] },
    { name: "Oscilloscope", lore: ["On the old screen, your shape is drawn in green.",
            "For the first time, you see what you are."],
        bpm: 114, warn: 2, colors: ["solid", "pairs"], dodges: 1, chart: [
            "rest", "rain", "mirror", "crossfire+melody", "crossfire", // bars 0-4
            "cross", // bar 5
            "laser:zigzag", "laser:zigzag", "laser:tune", "laser:jump", // bars 6-9, laser form
            "crossfire", "melody", "stairs", "mirror", "stairs", // bars 10-14
            "rain", // bar 15
        ] },
    { name: "Green Flash", lore: ["At sunset, for one heartbeat, the whole sky turns green.",
            "They say whoever sees it learns where the song began."],
        bpm: 116, warn: 2, colors: ["solid", "pairs"], dodges: 1, chart: [
            "rest", "ripple", "crossfire", "sweep", "wall", // bars 0-4
            "rain", "crossfire", // bars 5-6
            "laser:zigzag", "laser:steps", "laser:steps", "laser:zigzag", // bars 7-10, laser form
            "sweep", "wall", "ripple", "sweep+cage", "cross", // bars 11-15
        ] },
    { name: "Static Bloom", lore: ["Noise blooms across every band, white and endless.",
            "Somewhere inside it, the Broadcast is still playing."],
        bpm: 117, warn: 2, colors: ["solid", "pairs"], dodges: 1, boss: { name: "STATIC BLOOM", kind: "radar", hp: 50 }, chart: [
            "rest", "sweep+cage", "wall", "sweep+cage", "cage", // bars 0-4
            "crossfire+melody", // bar 5
            "laser:tune", "laser:zigzag", "laser:tune", "laser:tune", // bars 6-9, laser form
            "crossfire", "radar", "sweep", "cross", "stairs", // bars 10-14
            "mirror", "ripple", "wall", // bars 15-17
        ] },
    // Act IV, Blueshift: colours on every beat, two laser sections, two beams at once
    { name: "Cherenkov", lore: ["Faster than light in water, you leave a blue glow behind.",
            "Nothing down here has ever moved this fast."],
        bpm: 119, warn: 2, colors: ["solid", "pairs", "alt"], dodges: 1, chart: [
            "rest", "stairs", "segment", "offbeat+segment", "melody", // bars 0-4
            "rain", // bar 5
            "laser:steps", "laser:steps", "laser:steps", "laser:steps", // bars 6-9, laser form
            "offbeat", "offbeat+segment", "wall", "melody", "rain", // bars 10-14
            "wall", // bar 15
        ] },
    { name: "Deep Water", lore: ["The light thins as you sink.",
            "Down here the Broadcast is only a pulse in the dark."],
        bpm: 120, warn: 2, colors: ["solid", "pairs", "alt"], dodges: 1, chart: [
            "rest", "chord", "pendulum+cage", "pendulum", // bars 0-3
            "laser:tune", "laser:zigzag", "laser:tune", // bars 4-6, laser form
            "pendulum+cage", "mirror", "rain", // bars 7-9
            "laser:scatter", "laser:scatter", "laser:zigzag", // bars 10-12, laser form
            "chord", "pendulum", "cross", // bars 13-15
        ] },
    { name: "Blueshift", lore: ["Everything ahead of you shifts toward blue.",
            "The faster you go, the nearer the Source."],
        bpm: 122, warn: 2, colors: ["solid", "pairs", "alt"], dodges: 2, chart: [
            "rest", "rain", "stairs", "rain", // bars 0-3
            "laser:tune", "laser:scatter", "laser:scatter", // bars 4-6, laser form
            "double", "close+melody", "stairs", "wall", // bars 7-10
            "laser:scatter", "laser:scatter", "laser:scatter", // bars 11-13, laser form
            "doubletap", "close+melody", "close", "double", // bars 14-17
        ] },
    { name: "Cold Fire", lore: ["The hottest flames burn blue, and these burn hottest.",
            "For the first time, the Array is afraid."],
        bpm: 123, warn: 2, colors: ["pairs", "alt"], dodges: 2, chart: [
            "rest", "cross", "rain", "stairs", // bars 0-3
            "laser:zigzag", "laser:tune", "laser:scatter", // bars 4-6, laser form
            "wall", "cross", "chase", "stutter", // bars 7-10
            "laser:zigzag", "laser:tune", "laser:scatter", // bars 11-13, laser form
            "double", "stutter", "stairs", "chase+cage", // bars 14-17
        ] },
    { name: "Overdrive", lore: ["The Array's last engine opens, and the whole sky burns.",
            "It is spending everything it has to stop you."],
        bpm: 125, warn: 2, colors: ["solid", "pairs", "alt"], dodges: 2, boss: { name: "OVERDRIVE", kind: "chaser", hp: 60 }, chart: [
            "rest", "ring+diagonal", "rain", "stairs", // bars 0-3
            "laser:scatter", "laser:steps", "laser:scatter", // bars 4-6, laser form
            "ring", "diagonal", "cross", "double", // bars 7-10
            "laser:scatter", "laser:zigzag", "laser:zigzag", // bars 11-13, laser form
            "spin", "ring+diagonal", "cross", "rain", // bars 14-17
        ] },
    // Act V, Ultraviolet: everything, at the fastest tempos
    { name: "Indigo", lore: ["The colour between blue and violet that no one agrees on.",
            "Even the light is unsure of itself here."],
        bpm: 126, warn: 2, colors: ["pairs", "alt"], dodges: 2, chart: [
            "rest", "roll", "rain", "roll", "rain", // bars 0-4
            "laser:scatter", "laser:zigzag", "laser:scatter", "laser:zigzag", // bars 5-8, laser form
            "double", "ring+diagonal", // bars 9-10
            "laser:zigzag", "laser:scatter", "laser:scatter", // bars 11-13, laser form
            "fill", "cross", "chase+cage", "double", // bars 14-17
        ] },
    { name: "Black Light", lore: ["Invisible light, and everything glows under it.",
            "Even you."],
        bpm: 128, warn: 2, colors: ["pairs", "alt"], dodges: 2, chart: [
            "rest", "diagonal", "swarm", "roll+cross", "spin+ring", // bars 0-4
            "laser:zigzag", "laser:tune", "laser:scatter", "laser:scatter", // bars 5-8, laser form
            "cross", "sweep+cage", "close", // bars 9-11
            "laser:scatter", "laser:tune", "laser:tune", "laser:scatter", // bars 12-15, laser form
            "stutter", "swarm", "spin+ring", "double", // bars 16-19
        ] },
    { name: "Fluorescence", lore: ["What you take in, you give back brighter.",
            "Every colour you climbed through shines out of you now."],
        bpm: 129, warn: 2, colors: ["pairs", "alt"], dodges: 2, chart: [
            "rest", "cross", "doubletap", "pendulum+cage", "cross", // bars 0-4
            "laser:tune", "laser:zigzag", "laser:scatter", "laser:scatter", // bars 5-8, laser form
            "swarm+stairs", "mirror", "chord", // bars 9-11
            "laser:tune", "laser:scatter", "laser:scatter", "laser:scatter", // bars 12-15, laser form
            "swarm+stairs", "double", "wall", "mirror", // bars 16-19
        ] },
    { name: "Edge of Sight", lore: ["One more band, and the eye gives up.",
            "Beyond it there is only the Source."],
        bpm: 131, warn: 2, colors: ["pairs", "alt"], dodges: 2, chart: [
            "rest", "spin", "mines", "radar", "wall", // bars 0-4
            "laser:scatter", "laser:scatter", "laser:scatter", "laser:scatter", // bars 5-8, laser form
            "fill", "offbeat", "stairs", "wall", // bars 9-12
            "laser:zigzag", "laser:zigzag", "laser:zigzag", "laser:scatter", // bars 13-16, laser form
            "roll+rain+stairs", "offbeat+segment", "ring+diagonal", "mines", "double", // bars 17-21
        ] },
    { name: "Lazer Wave", lore: ["At the Source waits the first wave that ever climbed.",
            "It became the Broadcast. It has your shape."],
        bpm: 132, warn: 2, colors: ["pairs", "alt"], dodges: 2, boss: { name: "LAZER WAVE", kind: "mirror", hp: 75 }, chart: [
            "rest", "fill", "close", "roll", "spin+ring", // bars 0-4
            "laser:scatter", "laser:zigzag", "laser:zigzag", "laser:zigzag", // bars 5-8, laser form
            "chase+cage", "roll", "cross", "spin+ring", // bars 9-12
            "laser:tune", "laser:tune", "laser:zigzag", "laser:scatter", // bars 13-16, laser form
            "chase+cage", "corridor", "swarm+rain+stairs", "ring+diagonal", "mines+cross", // bars 17-21
        ] },
];

// Laser form (loop.js has the rules). A target slides in from the right edge and reaches TARGET_X on its beat, at
// its height; a gate is a white line sweeping in to the piece, a bar ahead of its beat
var TARGET_X = 0.72; // where a target meets the beam on its beat, as a fraction of the width
var TARGET_R = 0.035; // a target's size, as a fraction of the height
var TARGET_LEAD = 1; // beats more warning than a beam gets: a target has to be lined up with, not just stepped out of
var TARGET_GONE = 0.5; // beats a missed target takes to slide on out; it stays, unseen, while its beat can still be hit
var TARGET_BURST = 0.4; // beats a hit target's burst lasts
var TARGET_GRADE_SHOW = 0.75; // and the grade the hit got, rising off it: the beam is where the player is looking, and
                              // the judgement over the piece, across the screen, is not
const TARGET_GRADES = { // how a hit target bursts, by its grade: in the grade's colour, as the results' breakdown and
    // its timing scale have it; its ring reaching this many of its sizes; its flash this bright; and the word
    perfect: { color: COLORS.cyan, ring: 3.5, flash: 0.9, label: "PERFECT" },
    great: { color: COLORS.magenta, ring: 3, flash: 0.7, label: "GREAT" },
    good: { color: COLORS.text, ring: 2.4, flash: 0.4, label: "GOOD" },
    bad: { color: COLORS.late, ring: 1.8, flash: 0, label: "BAD" },
};
var GATE_LEAD = BEATS_PER_BAR; // a gate shows a bar ahead
var GATE_GONE = 0.5; // beats a gate takes to go after its beat; unpassed, it too stays while its beat can still be hit
// A laser to dodge in laser form fires on a target's beat, across the path to the next one: it burns while the piece
// holds on the target it just hit, and is out before the next is due. It only goes where the two are far enough
// apart for it, and keeps DODGE_MARGIN clear round each, so lining up with a target never touches it
var DODGE_GAP = 0.3; // how far apart two targets must be for a laser between them, as a fraction of the height
var DODGE_HOLD = 0.5; // of a note a dodge laser burns for (BEAM_FIRE of it): a quarter of a beat, so the way on to the
                      // next target is open for three quarters of it
var DODGE_MARGIN = 0.08; // clear round each target's height: its size, the reach of lining up, and the piece's own

// Colour. A beat a beam fires on is cyan or magenta, and that is the key that hits it: Z for cyan, X for magenta (the
// actions, input.js). Every beam on a beat has the beat's colour, and a beat with no beam has none, so either key
// hits it and a rest bar is still a rest. A pattern paints a bar's four beats, c cyan and m magenta: "solid" changes
// colour only at a bar line, "pairs" every two beats, "alt" every beat. Each bar is flipped or not so that, more
// often than not, it opens on the other colour from the last beam before it: the bar line is where the keys change.
var COLOR_PATTERNS = { solid: "cccc", pairs: "ccmm", alt: "cmcm" };
var BEAT_COLORS = { c: "cyan", m: "magenta" }; // the colours by name, each a key of COLORS (layout.js)
var COLOR_TURN = 0.75; // how often a bar opens on the other colour

function seededRandom(seed) { // a repeatable 0..1 stream (mulberry32): the same seed builds the same level
    var a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function spread(rnd, lo, hi, avoid, gap) { // a position in lo..hi, at least gap away from avoid (if there is one)
    for (var tries = 0; tries < 8; tries++) {
        var p = lo + rnd() * (hi - lo);
        if (avoid === null || Math.abs(p - avoid) >= gap) {
            return p;
        }
    }
    return p;
}

// The lasers follow the music. Every phrase is handed the bar's tune (songTune, music.js): the melody in a wave bar,
// the chorus in a laser one, with the notes it starts on each beat. Beams are placed on those notes, each as high on
// the screen as its note is high in the tune, so the lasers rise and fall as the melody does, and a note held or a rest
// is a beat they leave alone. A beat the tune starts no note on is placed as before, by the level's random stream.
var TUNE_TOP = 0.1, TUNE_BOTTOM = 0.9; // the band a tune's notes are spread over: its highest note at the top

function tuneAt(tune, note, top, bottom) { // where a note of the tune sits between top and bottom (fractions of the
    // height): its highest note at top, its lowest at bottom
    return top + (tune.hi - note) / Math.max(1, tune.hi - tune.lo) * (bottom - top);
}

function bassAt(tune, i, left, right) { // where the bass's note on beat i sits between left and right (fractions of
    // the width): the bass's lowest note at left, its highest at right, and the middle in a rest
    var note = tune.bass[i];
    return note === null ? (left + right) / 2
        : left + (note - tune.bassLo) / Math.max(1, tune.bassHi - tune.bassLo) * (right - left);
}

var BEAM_TOP = 0.14; // the highest a note's beam goes, its top edge as a fraction of the height: under the progress
                     // stripe (hud.js), which a beam up against it looked jammed under

function tuneBeam(tune, note, size) { // a band `size` thick centred on a note's height, kept on the screen
    return Math.max(BEAM_TOP, Math.min(0.97 - size, tuneAt(tune, note, TUNE_TOP, TUNE_BOTTOM) - size / 2));
}

function away(want, last, gap, lo, hi) { // want, unless that is within gap of last: then gap from last, on want's side
    // of it, or on the other side if that runs out of lo..hi
    if (last === null || Math.abs(want - last) >= gap) {
        return want;
    }
    var dir = want >= last ? 1 : -1;
    var p = last + dir * gap;
    if (p < lo || p > hi) {
        p = last - dir * gap;
    }
    return Math.max(lo, Math.min(hi, p));
}

// Each phrase fills the bar starting at beat b0. add(fireBeat, axis, pos, size, more): axis "h" is a band across the
// screen at height pos (a fraction of the height), "v" a band down it at pos (a fraction of the width); size is its
// thickness; more, if given, is anything else the event carries: hold, the beats a held note's beam burns for (a beat
// unless given), and kind "fall" for a faller. tune: the bar's tune, as above
const PHRASES = {
    rest: function () {}, // a bar to breathe in, and to get the hits right
    melody: function (b0, rnd, add, tune) { // a beam on each beat the tune starts a note on, as high as the note, and
        // burning for as long as the note holds: the lasers play the melody, and its rests are beats to breathe
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                add(b0 + i, "h", tuneBeam(tune, tune.onset[i], BEAM_SIZE), BEAM_SIZE, { hold: tune.hold[i] });
            }
        }
    },
    fall: function (b0, rnd, add, tune) { // the melody's beams as fallers: each comes down from the top edge over its
        // warning and fires where it lands, at its note's height, so the fall is the warning and the eye follows it
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                add(b0 + i, "h", tuneBeam(tune, tune.onset[i], BEAM_SIZE), BEAM_SIZE, { kind: "fall", hold: tune.hold[i] });
            }
        }
    },
    pincer: function (b0, rnd, add, tune) { // two beams closing on each note the tune starts, one above it and one
        // below, PINCER_GAP apart: the gap between them is the note's height, and the place to be, so the melody's line
        // is the safe path. The gap is kept where both beams fit on the screen, so the pair always reads as a pair; a
        // held note's pair holds the gap open for the note. It is placed here at TRUE's, and both beams carry it
        // (flank) for an easier difficulty to widen as they are made (flankBeam)
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var top = tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM) - PINCER_GAP / 2; // the gap's top
                top = Math.max(BEAM_SIZE, Math.min(1 - PINCER_GAP - BEAM_SIZE, top));
                var more = { hold: tune.hold[i], flank: { at: top, gap: PINCER_GAP, keep: BEAM_SIZE, fill: false } };
                add(b0 + i, "h", top - BEAM_SIZE, BEAM_SIZE, more);
                add(b0 + i, "h", top + PINCER_GAP, BEAM_SIZE, more);
            }
        }
    },
    cage: function (b0, rnd, add, tune) { // four beams at once closing a cell on each note the tune starts: two across,
        // above and below the note's height, as a pincer's, and two down, either side of the bass's note, low on the
        // left and high on the right (bassAt). The two parts of the song place the cell between them, and inside it is
        // the place to be; anywhere off the four beams is safe too. A held note's cage holds for the note. The cell is
        // placed here at TRUE's, and its beams carry it (flank) for an easier difficulty to widen each way as they are
        // made (flankBeam)
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var top = tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM) - PINCER_GAP / 2;
                top = Math.max(BEAM_SIZE, Math.min(1 - PINCER_GAP - BEAM_SIZE, top));
                var left = bassAt(tune, i, CAGE_LEFT, CAGE_RIGHT) - CAGE_GAP / 2;
                left = Math.max(BEAM_SIZE_V, Math.min(1 - CAGE_GAP - BEAM_SIZE_V, left));
                var across = { hold: tune.hold[i], flank: { at: top, gap: PINCER_GAP, keep: BEAM_SIZE, fill: false } };
                var down = { hold: tune.hold[i], flank: { at: left, gap: CAGE_GAP, keep: BEAM_SIZE_V, fill: false } };
                add(b0 + i, "h", top - BEAM_SIZE, BEAM_SIZE, across);
                add(b0 + i, "h", top + PINCER_GAP, BEAM_SIZE, across);
                add(b0 + i, "v", left - BEAM_SIZE_V, BEAM_SIZE_V, down);
                add(b0 + i, "v", left + CAGE_GAP, BEAM_SIZE_V, down);
            }
        }
    },
    corridor: function (b0, rnd, add, tune) { // a corridor of light scrolling in from the right, the bar long: two
        // walls with a gap between them that rides the melody, gliding from each beat's note height to the next's (a
        // rest holds the last), the last beat's held to the bar's end. It burns the bar through, so the gap is the only
        // place to be. One event, on the bar's first beat, carrying the gap's centre at each beat (Corridor, below)
        var centres = [];
        for (var i = 0; i <= BEATS_PER_BAR; i++) {
            var note = tune.sound[Math.min(i, BEATS_PER_BAR - 1)];
            var at = note === null ? (centres.length ? centres[centres.length - 1] : 0.5)
                : tuneAt(tune, note, TUNE_TOP, TUNE_BOTTOM);
            centres.push(Math.max(CORRIDOR_GAP / 2 + 0.03, Math.min(0.97 - CORRIDOR_GAP / 2, at)));
        }
        add(b0, "corridor", centres, CORRIDOR_GAP);
    },
    mirror: function (b0, rnd, add, tune) { // on each beat the tune starts a note, a beam at its height and its mirror
        // image about the middle of the screen, so a high note fires low as well and the two close on the middle; and
        // on a beat the tune holds or rests, one beam across the middle, so whoever settled there leaves it on the beat
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var y = tuneBeam(tune, tune.onset[i], BEAM_SIZE);
                add(b0 + i, "h", y, BEAM_SIZE, { hold: tune.hold[i] });
                add(b0 + i, "h", 1 - y - BEAM_SIZE, BEAM_SIZE, { hold: tune.hold[i] });
            } else {
                add(b0 + i, "h", 0.5 - BEAM_SIZE / 2, BEAM_SIZE);
            }
        }
    },
    ripple: function (b0, rnd, add, tune) { // on each beat the tune starts a note, four thin beams on its sixteenths
        // running from the note's height to the next note's in the bar, a scale run across the screen: move with it,
        // or keep ahead of it. A note with none after it, or the same one, runs away from the nearer edge instead.
        // Short burns, so the run stays a run
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] === null) {
                continue;
            }
            var from = tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM), to = null;
            for (var j = i + 1; j < BEATS_PER_BAR && to === null; j++) {
                if (tune.onset[j] !== null) {
                    to = tuneAt(tune, tune.onset[j], TUNE_TOP, TUNE_BOTTOM);
                }
            }
            if (to === null || Math.abs(to - from) < 0.1) {
                to = from > 0.5 ? from - 0.3 : from + 0.3;
            }
            for (var k = 0; k < 4; k++) {
                var y = from + (to - from) * k / 3 - RIPPLE_SIZE / 2;
                add(b0 + i + k / 4, "h", Math.max(0.03, Math.min(0.97 - RIPPLE_SIZE, y)), RIPPLE_SIZE, { hold: 0.5 });
            }
        }
    },
    crossfire: function (b0, rnd, add, tune) { // columns firing from both sides on the half beats: over the first half
        // of the bar a pair closes in from the edges on the bass's column (bassAt), a step every eighth, and meets there
        // on the fourth; over the second half a pair opens out from it to the edges again. Slip out of the closing pair
        // through a column just gone, and stay out as it opens. Short burns, so there is room to weave
        var c = bassAt(tune, 0, CAGE_LEFT, CAGE_RIGHT); // the column the pair closes on
        for (var k = 0; k < 2 * BEATS_PER_BAR; k++) {
            var step = k < BEATS_PER_BAR ? BEATS_PER_BAR - 1 - k : k - (BEATS_PER_BAR - 1); // 3, 2, 1, 0, 1, 2, 3, 4
            var spread = CROSSFIRE_SPREAD * step / (BEATS_PER_BAR - 1);
            (spread > 0 ? [-1, 1] : [0]).forEach(function (side) {
                var at = Math.max(0.01, Math.min(0.99 - BEAM_SIZE_V, c + side * spread - BEAM_SIZE_V / 2));
                add(b0 + k / 2, "v", at, BEAM_SIZE_V, { hold: 0.5 });
            });
        }
    },
    sweep: function (b0, rnd, add, tune) { // a sweeper across the bar, from the left one bar and from the right the
        // next, its hole at the height of the note sounding on the bar's first beat (the middle, in a rest): be at the
        // hole's height as it comes by. The hole is TRUE's here, widened for an easier difficulty as it is made, and at a
        // slower difficulty's pace it wipes on across over the bars after as well (Sweeper)
        var note = tune.sound[0];
        var hole = note === null ? 0.5 : tuneAt(tune, note, TUNE_TOP, TUNE_BOTTOM);
        hole = Math.max(SWEEP_GAP / 2 + SWEEP_EDGE, Math.min(1 - SWEEP_EDGE - SWEEP_GAP / 2, hole));
        add(b0, "sweep", (b0 / BEATS_PER_BAR) % 2 == 0 ? 1 : -1, BEAM_SIZE_V, { hole: hole, gap: SWEEP_GAP, beats: SWEEP_BEATS });
    },
    chase: function (b0, rnd, add, tune) { // the melody's beams as chasers: each starts at its note's height, follows the
        // piece's height through its warning, and locks half a beat before it fires: that is the moment to move
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                add(b0 + i, "h", tuneBeam(tune, tune.onset[i], BEAM_SIZE), BEAM_SIZE, { kind: "chase", hold: tune.hold[i] });
            }
        }
    },
    close: function (b0, rnd, add, tune) { // walls closing: two columns sliding in from the edges over the bar, to fire
        // on its last beat either side of the bass's column, a cell's width apart: be in the gap when they land. The
        // gap is placed here at TRUE's, and both columns carry it (flank) for an easier difficulty to widen as they are
        // made (flankBeam)
        var c = bassAt(tune, BEATS_PER_BAR - 1, CAGE_LEFT, CAGE_RIGHT);
        var left = Math.max(BEAM_SIZE_V, Math.min(1 - CLOSE_GAP - BEAM_SIZE_V, c - CLOSE_GAP / 2));
        var flank = { at: left, gap: CLOSE_GAP, keep: BEAM_SIZE_V, fill: false };
        add(b0 + BEATS_PER_BAR - 1, "v", left - BEAM_SIZE_V, BEAM_SIZE_V,
            { kind: "slide", from: -BEAM_SIZE_V, lead: CLOSE_LEAD, flank: flank });
        add(b0 + BEATS_PER_BAR - 1, "v", left + CLOSE_GAP, BEAM_SIZE_V,
            { kind: "slide", from: 1, lead: CLOSE_LEAD, flank: flank });
    },
    pendulum: function (b0, rnd, add, tune) { // a band swinging over the bar from the height of the tune's highest note
        // in it to its lowest and back, at least a quarter of the screen, firing wherever it is on every beat: the bar
        // is its own; at a slower difficulty's pace it swings on over the bars after as well (Pendulum)
        var notes = tune.sound.filter(function (n) { return n !== null; });
        var top = tuneBeam(tune, notes.length ? Math.max.apply(null, notes) : tune.hi, BEAM_SIZE);
        var bottom = tuneBeam(tune, notes.length ? Math.min.apply(null, notes) : tune.lo, BEAM_SIZE);
        if (bottom - top < 0.25) {
            var mid = (top + bottom) / 2;
            top = Math.max(0.03, mid - 0.125);
            bottom = Math.min(0.97 - BEAM_SIZE, mid + 0.125);
        }
        add(b0, "pendulum", top, BEAM_SIZE, { to: bottom, beats: PENDULUM_BEATS });
    },
    ring: function (b0, rnd, add, tune) { // on each note the tune starts, a ring growing round the point the two parts
        // of the song make, the bass's column and the note's height, to fire at RING_R of the height: inside it, or out
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var at = [bassAt(tune, i, CAGE_LEFT, CAGE_RIGHT), tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM)];
                add(b0 + i, "ring", at, RING_R, { hold: tune.hold[i] });
            }
        }
    },
    diagonal: function (b0, rnd, add, tune) { // on each note the tune starts, a band leaning through the point the
        // bass's column and the note's height make, down to the right when the next note is lower and up when it is
        // higher: the slant is the melody's way
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] === null) {
                continue;
            }
            var next = null;
            for (var j = i + 1; j < BEATS_PER_BAR && next === null; j++) {
                next = tune.onset[j];
            }
            var down = next === null ? i % 2 == 0 : next < tune.onset[i];
            var at = [bassAt(tune, i, CAGE_LEFT, CAGE_RIGHT), tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM)];
            add(b0 + i, "diagonal", at, BEAM_SIZE, { tilt: down ? DIAGONAL_TILT : -DIAGONAL_TILT, hold: tune.hold[i] });
        }
    },
    radar: function (b0, rnd, add) { // the radar's ray, coming round once over the bar from pointing right: keep ahead
        // of it, or behind it, round the middle, and off the middle itself. The bar is the ray's alone; at a slower
        // difficulty's pace it comes round over the bars after as well, as their lasers fire (Radar)
        add(b0, "radar", 0, 0, { beats: RADAR_BEATS });
    },
    spin: function (b0, rnd, add, tune) { // the spinning X: two lasers crossing at right angles at the point the bass's
        // column and the bar's first note make, and turning about it the bar through, half way round, one way or the
        // other: stay in your wedge and turn with it. The bar is its alone; at a slower difficulty's pace it turns on
        // over the bars after as well (Spinner)
        var i = 0;
        while (i < BEATS_PER_BAR - 1 && tune.onset[i] === null) {
            i++;
        }
        var note = tune.onset[i] !== null ? tune.onset[i] : tune.sound[i];
        var at = [bassAt(tune, i, SPIN_LEFT, SPIN_RIGHT), note === null ? 0.5 : tuneAt(tune, note, SPIN_TOP, SPIN_BOTTOM)];
        add(b0, "spin", at, 0, { beats: SPIN_BEATS, dir: rnd() < 0.5 ? 1 : -1 });
    },
    offbeat: function (b0, rnd, add, tune) { // a beam on the "and" of every beat, at the height of the note sounding on
        // the beat, or anywhere in a rest, never twice in the same place: the lasers syncopate, the hits stay on the beat
        var last = null;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            var note = tune.sound[i];
            last = note !== null ? away(tuneBeam(tune, note, BEAM_SIZE), last, 0.25, 0.06, 0.94 - BEAM_SIZE)
                : spread(rnd, 0.06, 0.94 - BEAM_SIZE, last, 0.25);
            add(b0 + i + 0.5, "h", last, BEAM_SIZE);
        }
    },
    segment: function (b0, rnd, add, tune) { // the melody's beams, each covering only the half of the screen the bass
        // is on, low on the left and high on the right (bassAt): where you are across the screen matters
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var side = bassAt(tune, i, 0, 1) < 0.5 ? [0, 0.5] : [0.5, 1];
                add(b0 + i, "h", tuneBeam(tune, tune.onset[i], BEAM_SIZE), BEAM_SIZE, { span: side, hold: tune.hold[i] });
            }
        }
    },
    chord: function (b0, rnd, add, tune) { // the bar's chord, all its notes at once on the bar line, each a beam at its
        // note's height (tune.chord), held a beat: the gaps between them are the chord's own
        tune.chord.forEach(function (note) {
            add(b0, "h", tuneBeam(tune, note, BEAM_SIZE), BEAM_SIZE, { hold: 2 });
        });
    },
    doubletap: function (b0, rnd, add, tune) { // the melody's beams twice: a short burn on the beat and another on its
        // "and", at the same height, so stepping straight back in is the mistake
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var y = tuneBeam(tune, tune.onset[i], BEAM_SIZE);
                add(b0 + i, "h", y, BEAM_SIZE, { hold: 0.5 });
                add(b0 + i + 0.5, "h", y, BEAM_SIZE, { hold: 0.5 });
            }
        }
    },
    stutter: function (b0, rnd, add, tune) { // the melody's beams stuttering: on and off in sixteenths for the whole
        // beat, so the band can't be crossed while it lasts
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var y = tuneBeam(tune, tune.onset[i], BEAM_SIZE);
                for (var k = 0; k < 4; k++) {
                    add(b0 + i + k / 4, "h", y, BEAM_SIZE, { hold: 0.25 });
                }
            }
        }
    },
    fill: function (b0, rnd, add, tune) { // the melody's beams on the bar's first three beats, then a fill on its last:
        // four thin beams on its sixteenths, each at one of the bar's note heights in turn, as a drummer fills a bar
        var heights = tune.sound.filter(function (n) { return n !== null; })
            .map(function (n) { return tuneBeam(tune, n, FILL_SIZE); });
        if (!heights.length) {
            heights = [0.5];
        }
        for (var i = 0; i < BEATS_PER_BAR - 1; i++) {
            if (tune.onset[i] !== null) {
                add(b0 + i, "h", tuneBeam(tune, tune.onset[i], BEAM_SIZE), BEAM_SIZE, { hold: tune.hold[i] });
            }
        }
        for (var k = 0; k < 4; k++) {
            add(b0 + BEATS_PER_BAR - 1 + k / 4, "h", heights[k % heights.length], FILL_SIZE, { hold: 0.5 });
        }
    },
    rain: function (b0, rnd, add, tune) { // a beam on every beat, never twice in the same place: on the tune's note
        // where it starts one, or as near it as that allows, and held for as long as that note is
        var last = null;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            var on = tune.onset[i] !== null;
            last = on ? away(tuneBeam(tune, tune.onset[i], BEAM_SIZE), last, 0.25, 0.06, 0.94 - BEAM_SIZE)
                : spread(rnd, 0.06, 0.94 - BEAM_SIZE, last, 0.25);
            add(b0 + i, "h", last, BEAM_SIZE, on ? { hold: tune.hold[i] } : null);
        }
    },
    wall: function (b0, rnd, add, tune) { // the whole height burns but for a gap, on beats 1 and 3: get to the gap,
        // which is at the tune's note where it starts one. It is placed here at TRUE's, and its two beams carry that
        // gap (flank) for an easier difficulty to widen as they are made (flankBeam)
        var gap = WALL_GAP, hi = 1 - WALL_EDGE - gap, last = null;
        for (var i = 0; i < BEATS_PER_BAR; i += 2) {
            var top = spread(rnd, WALL_EDGE, hi, last, 0.2);
            if (tune.onset[i] !== null) {
                var at = tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM) - gap / 2;
                top = away(Math.max(WALL_EDGE, Math.min(hi, at)), last, 0.2, WALL_EDGE, hi);
            }
            last = top;
            var flank = { at: top, gap: gap, keep: WALL_EDGE, fill: true };
            add(b0 + i, "h", 0, top, { flank: flank });
            add(b0 + i, "h", top + gap, 1 - top - gap, { flank: flank });
        }
    },
    cross: function (b0, rnd, add, tune) { // down, across, down, across: the ones across on the tune's notes
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (i % 2 == 0) {
                add(b0 + i, "v", 0.05 + rnd() * (0.9 - BEAM_SIZE_V), BEAM_SIZE_V);
            } else {
                var y = 0.06 + rnd() * (0.88 - BEAM_SIZE); // drawn either way, to keep the stream in step
                add(b0 + i, "h", tune.onset[i] !== null ? tuneBeam(tune, tune.onset[i], BEAM_SIZE) : y, BEAM_SIZE);
            }
        }
    },
    stairs: function (b0, rnd, add) { // four columns marching across the screen, one a beat
        var back = rnd() < 0.5;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            var k = back ? BEATS_PER_BAR - 1 - i : i;
            add(b0 + i, "v", 0.1 + k * 0.2, 0.12);
        }
    },
    double: function (b0, rnd, add, tune) { // two beams at once on 1 and 3, the first on the tune's note, and a column
        // on 2 and 4
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (i % 2 == 0) {
                var a = spread(rnd, 0.06, 0.94 - BEAM_SIZE, null, 0);
                if (tune.onset[i] !== null) {
                    a = tuneBeam(tune, tune.onset[i], BEAM_SIZE);
                }
                add(b0 + i, "h", a, BEAM_SIZE);
                add(b0 + i, "h", spread(rnd, 0.06, 0.94 - BEAM_SIZE, a, 0.35), BEAM_SIZE);
            } else {
                add(b0 + i, "v", 0.05 + rnd() * (0.9 - BEAM_SIZE_V), BEAM_SIZE_V);
            }
        }
    },
    // The drifting lasers (Drifter, Mine): each comes in at the right edge and takes two bars to cross at TRUE's pace,
    // longer at an easier difficulty's (laserPace), so a bar of them is still on its way through the bars after. None
    // wears or claims a beat's colour (color null): they are ground to steer round, and the beats are the other lasers'
    roll: function (b0, rnd, add, tune) { // the melody as a piano roll drifting in: each note a laser at its height, as
        // long as it is held, coming in as it sounds; and the bar's chord struck on beats 1 and 3, a thinner laser for
        // each of its notes, a beat long
        var place = function (note, size) {
            return Math.max(0.04, Math.min(0.96 - size, tuneAt(tune, note, TUNE_TOP, TUNE_BOTTOM) - size / 2));
        };
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                add(b0 + i, "drift", place(tune.onset[i], ROLL_SIZE), ROLL_SIZE,
                    { len: tune.hold[i] / DRIFT_BEATS - ROLL_GAP, color: null });
            }
        }
        [0, 2].forEach(function (j) {
            tune.chord.forEach(function (note) {
                if (note != tune.onset[j]) { // the melody's own note is there already
                    add(b0 + j, "drift", place(note, ROLL_CHORD), ROLL_CHORD, { len: 1 / DRIFT_BEATS - ROLL_GAP, color: null });
                }
            });
        });
    },
    swarm: function (b0, rnd, add, tune) { // a swarm of small lasers drifting in on every eighth note, one more on a
        // note's beat, at heights all over but kept off the note sounding: the lane through them follows the tune, and
        // any other way through is there to be found
        for (var k = 0; k < 2 * BEATS_PER_BAR; k++) {
            var i = Math.floor(k / 2), note = tune.sound[i];
            var lane = note === null ? null : tuneAt(tune, note, TUNE_TOP, TUNE_BOTTOM);
            var n = k % 2 == 0 && tune.onset[i] !== null ? SWARM_MOTES + 1 : SWARM_MOTES;
            for (var m = 0; m < n; m++) {
                var y = 0.5, tries = 0;
                do {
                    y = 0.05 + rnd() * 0.9;
                } while (lane !== null && Math.abs(y - lane) < SWARM_LANE && ++tries < 12);
                var len = SWARM_LEN[0] + rnd() * (SWARM_LEN[1] - SWARM_LEN[0]);
                add(b0 + k / 2, "drift", y - SWARM_SIZE / 2, SWARM_SIZE, { len: len, color: null });
            }
        }
    },
    mines: function (b0, rnd, add, tune) { // a mine on each note the melody starts, coming in at the right edge at the
        // note's height and drifting with the rest, to burst into a cross a bar later, or a bar and a half, by turns
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var drift = MINE_DRIFTS[(b0 / BEATS_PER_BAR + i) % MINE_DRIFTS.length];
                add(b0 + i + drift, "mine", tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM), MINE_WIDTH,
                    { drift: drift, color: null });
            }
        }
    },
};

// Laser form's phrases: each fills the bar starting at b0 with targets, add(fireBeat, "target", pos, TARGET_R), pos
// being the height to line up at, as a fraction of the screen's. tune: the bar's tune, the chorus (see PHRASES)
var TARGET_TOP = 0.2, TARGET_BOTTOM = 0.8; // where a tune's highest note and its lowest put a target
const TARGET_PHRASES = {
    tune: function (b0, rnd, add, tune) { // each beat's target as high as the chorus's note sounding on it, a held
        // note held: lining up with them plays the tune
        var y = 0.5;
        for (var j = BEATS_PER_BAR - 1; j >= 0; j--) { // a bar that opens on a rest starts at its first note
            if (tune.sound[j] !== null) {
                y = tuneAt(tune, tune.sound[j], TARGET_TOP, TARGET_BOTTOM);
            }
        }
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.sound[i] !== null) {
                y = tuneAt(tune, tune.sound[i], TARGET_TOP, TARGET_BOTTOM);
            }
            add(b0 + i, "target", y, TARGET_R);
        }
    },
    hold: function (b0, rnd, add) { // four at one height: hold the line
        var y = 0.2 + rnd() * 0.6;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            add(b0 + i, "target", y, TARGET_R);
        }
    },
    steps: function (b0, rnd, add) { // a stair, up the screen or down it
        var up = rnd() < 0.5;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            add(b0 + i, "target", up ? 0.78 - i * 0.16 : 0.22 + i * 0.16, TARGET_R);
        }
    },
    jump: function (b0, rnd, add) { // two at one height, then a leap to two at another: a laser's room, in the leap
        var high = 0.2 + rnd() * 0.12, low = 0.68 + rnd() * 0.12, down = rnd() < 0.5;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            add(b0 + i, "target", (i < 2) == down ? high : low, TARGET_R);
        }
    },
    zigzag: function (b0, rnd, add) { // top, bottom, top, bottom
        var top = 0.18 + rnd() * 0.12, low = 0.7 + rnd() * 0.12;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            add(b0 + i, "target", i % 2 ? low : top, TARGET_R);
        }
    },
    scatter: function (b0, rnd, add) { // anywhere, never twice close together
        var last = null;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            last = spread(rnd, 0.15, 0.85, last, 0.25);
            add(b0 + i, "target", last, TARGET_R);
        }
    },
};

function levelDef(n) { // the level's table entry; past the last, the last one again
    return LEVELS[Math.max(1, Math.min(n, LEVELS.length - 1))];
}

function laserBars(def) { // the level's bars played in laser form: bar -> true
    var bars = {};
    (def.laser || []).forEach(function (s) {
        for (var i = 0; i < s[1]; i++) {
            bars[s[0] + i] = true;
        }
    });
    return bars;
}

function loopFrom(def) { // the bar a boss level goes back to when its end comes with the boss still up: the bar before
    // its last laser section, a run-up in wave form, so the fight goes on from there, its wave bars to survive and its
    // laser bars to hurt the boss in, as many times as it takes (extendLevel, loop.js); null for a level without a boss
    if (!def.boss || !def.laser || !def.laser.length) {
        return null;
    }
    var last = def.laser[def.laser.length - 1];
    return Math.max(1, last[0] - 1); // never the opening rest bar
}

// A level's chart, read for the rest of the game (every level's as it loads, and a practice level's, practice.js):
// bars, how many it has; laser, its laser form sections, each a run of laser bars, as [first bar, bars], which gates
// open and close (buildTimeline) and the last of which a boss's level goes round from (loopFrom); and targetsAt, the
// targets each laser bar deals. An entry it can't read is said so in the console, and plays as a rest, or a laser bar's
// targets as tune
function chartLevel(def, label) {
    def.bars = def.chart.length;
    def.laser = [];
    def.targetsAt = {};
    def.chart.forEach(function (entry, bar) {
        var form = /^laser(?::(\w+))?$/.exec(entry);
        if (form) {
            var targets = form[1] || "tune";
            if (!TARGET_PHRASES[targets]) {
                console.error(label + ", bar " + bar + ": no targets called \"" + targets + "\", so it deals tune");
                targets = "tune";
            }
            def.targetsAt[bar] = targets;
            var last = def.laser[def.laser.length - 1];
            if (last && last[0] + last[1] == bar) {
                last[1]++;
            } else {
                def.laser.push([bar, 1]);
            }
        } else if (entry.split("+").some(function (part) { return !PHRASES[part]; })) {
            console.error(label + ", bar " + bar + ": no laser called \"" + entry + "\", so it rests");
            def.chart[bar] = "rest";
        }
    });
    return def;
}

LEVELS.forEach(function (def, n) {
    if (def) {
        chartLevel(def, "Level " + n);
    }
});

function barRandom(n, bar, stream) { // the random draws for a bar of level n, a stream of them for each thing that
    // draws: the phrases' own (0: heights where the tune has no note, a wall's gap, which way the stairs go), the
    // colours (1), laser form's targets (2) and the lasers to dodge between them (3). Each bar's are its own, so changing
    // one bar of a chart moves nothing in any other, and they are the same every attempt: a level is learned
    return seededRandom(n * 9973 + bar * 7919 + stream * 104729 + 17);
}

function buildTimeline(n, given) { // everything the level holds, in beat order: beams { fire, axis, pos, size, color,
    // and a held note's hold or a faller's kind }, targets (axis "target", pos their height) and gates (axis "gate", to
    // the form they switch to, color "gate"), each bar as its chart has it. Level n's, or given a definition, that
    // one's in level n's song and draws (a practice level, practice.js)
    var def = given || levelDef(n);
    var laser = laserBars(def);
    var colors = def.colors || [];
    var b0 = 0, pattern = null; // the bar being filled, and its colours
    var out = [];
    var add = function (fire, axis, pos, size, more) { // a beam off the beat takes the colour of the beat before it;
        // more, if given, is carried on the event (a held note's hold, a faller's kind)
        var c = pattern ? BEAT_COLORS[pattern.charAt(Math.floor(fire) - b0)] : null;
        out.push(Object.assign({ fire: fire, axis: axis, pos: pos, size: size, color: c || null }, more || {}));
    };
    var dealt = []; // and what each bar deals, for practice to name (practice.js)
    for (var bar = 0; bar < def.bars; bar++) {
        var name = def.chart[bar], rnd = barRandom(n, bar, 0), paint = barRandom(n, bar, 1);
        dealt.push(laser[bar] ? "laser" : name);
        pattern = null;
        if (colors.length) {
            pattern = COLOR_PATTERNS[colors[Math.floor(paint() * colors.length)]];
            var last = out.length ? out[out.length - 1].color : null; // the colour the player saw last
            var turn = paint() < COLOR_TURN;
            if ((BEAT_COLORS[pattern.charAt(0)] == last) == turn) { // the flip: cyan for magenta
                pattern = pattern.replace(/c/g, "x").replace(/m/g, "c").replace(/x/g, "m");
            }
        }
        b0 = (COUNT_IN_BARS + bar) * BEATS_PER_BAR;
        var tune = songTune(def, n, bar); // what the music does over the bar, for the lasers to follow
        if (laser[bar]) {
            TARGET_PHRASES[def.targetsAt[bar]](b0, barRandom(n, bar, 2), add, tune);
        } else {
            name.split("+").forEach(function (part) { // a combination, "a+b" or "a+b+c", deals them all into the bar
                PHRASES[part](b0, rnd, add, tune);
            });
        }
    }
    // the gates: the bar line into each laser section, and the one out of it unless it runs to the end. A gate's beat
    // is its own: whatever else fell on it goes
    var gates = [];
    (def.laser || []).forEach(function (s, k) {
        var into = (COUNT_IN_BARS + s[0]) * BEATS_PER_BAR;
        var face = def.boss && def.boss.kind == "twin" && k % 2 == 1 ? -1 : 1; // the twin's second section faces left
        gates.push({ fire: into, axis: "gate", to: "laser", color: "gate", facing: face });
        if (s[0] + s[1] < def.bars) {
            gates.push({ fire: into + s[1] * BEATS_PER_BAR, axis: "gate", to: "wave", color: "gate" });
        }
    });
    // a drifting laser is wave form's: it goes at the gate into a laser section, whose piece, held to its line, can't
    // steer round it, and at the level's end, so the level still ends with its bars. A boss's level has no end while
    // the boss stands, but goes round (loopFrom), and its gates with it: one late in the round goes at the next
    // round's first. Its time is given it as its life, in beats from its beat, which holds as the round is dealt again
    // (extendLevel, loop.js); a mine that would burst after then never comes. A sweeper, the radar, a pendulum or the
    // spinning X, going on past its bar at a slower pace, is given a life as well, to make its whole way within: to the
    // same stops, or to the next bar that is another of them or asks the player into a place of its own
    // (MOVER_YIELDS), whichever comes first
    var stops = gates.filter(function (g) { return g.to == "laser"; }).map(function (g) { return g.fire; });
    var yields = [];
    dealt.forEach(function (name, bar) {
        if (name.split("+").some(function (part) { return MOVER_YIELDS[part]; })) {
            yields.push((COUNT_IN_BARS + bar) * BEATS_PER_BAR);
        }
    });
    var round = loopFrom(def);
    if (round === null) {
        stops.push((COUNT_IN_BARS + def.bars) * BEATS_PER_BAR);
    } else {
        var roundAt = (COUNT_IN_BARS + round) * BEATS_PER_BAR, roundLen = (def.bars - round) * BEATS_PER_BAR;
        var again = function (list) { // and the round's, dealt again
            return list.concat(list.filter(function (s) { return s >= roundAt; }).map(function (s) { return s + roundLen; }));
        };
        stops = again(stops);
        yields = again(yields);
    }
    var nextOf = function (list, from) { // the first in the list after `from`
        var next = Infinity;
        list.forEach(function (s) {
            if (s > from && s < next) {
                next = s;
            }
        });
        return next;
    };
    out = out.filter(function (ev) {
        if (MOVERS[ev.axis]) {
            var end = Math.min(nextOf(stops, ev.fire), nextOf(yields, ev.fire));
            if (end < Infinity) {
                ev.life = end - ev.fire;
            }
            return true;
        }
        if (ev.axis != "drift" && ev.axis != "mine") {
            return true;
        }
        var from = ev.axis == "mine" ? ev.fire - ev.drift : ev.fire, stop = nextOf(stops, from);
        if (ev.axis == "mine") {
            return ev.fire < stop;
        }
        if (stop < Infinity) {
            ev.life = stop - ev.fire;
        }
        return true;
    });
    out = out.filter(function (ev) { // a corridor, a sweeper, a radar, a pendulum or a spinning X only begins on its
        // beat, and stays
        return ev.axis == "corridor" || ev.axis == "sweep" || ev.axis == "radar" || ev.axis == "pendulum"
            || ev.axis == "spin" || !gates.some(function (g) { return g.fire == ev.fire; });
    }).concat(gates);
    out = out.concat(dodgeLasers(out, def, n));
    out.sort(function (a, b) { return a.fire - b.fire; });
    out.dealt = dealt; // bar by bar: a phrase's name, a combination's ("pincer+cage"), "rest", or "laser" in laser form
    return out;
}

function dodgeLasers(events, def, n) { // laser form's lasers: in each laser bar, up to def.dodges of them, each on a
    // target's beat across the path to the next target, where the two are far enough apart, picked by a stream of the
    // bar's own (barRandom), so they never move a target
    var target = {}; // beat -> the target due on it
    events.forEach(function (ev) {
        if (ev.axis == "target") {
            target[ev.fire] = ev;
        }
    });
    var lasers = [];
    for (var bar in laserBars(def)) {
        var b0 = (COUNT_IN_BARS + Number(bar)) * BEATS_PER_BAR, pick = barRandom(n, Number(bar), 3);
        var spots = []; // the beats in the bar a laser could go on
        for (var b = b0; b < b0 + BEATS_PER_BAR; b++) {
            if (target[b] && target[b + 1] && Math.abs(target[b].pos - target[b + 1].pos) >= DODGE_GAP) {
                spots.push(b);
            }
        }
        for (var k = 0; k < (def.dodges || 0) && spots.length; k++) {
            var at = spots.splice(Math.floor(pick() * spots.length), 1)[0];
            var lo = Math.min(target[at].pos, target[at + 1].pos) + DODGE_MARGIN;
            var hi = Math.max(target[at].pos, target[at + 1].pos) - DODGE_MARGIN;
            var size = Math.min(BEAM_SIZE, hi - lo);
            lasers.push({ fire: at, axis: "h", pos: (lo + hi - size) / 2, size: size, color: target[at].color,
                hold: DODGE_HOLD });
        }
    }
    return lasers;
}

function eventLead(ev, warn) { // how many beats ahead of its beat an event comes on screen: its own, if it has one; a
    // mine's, the warning ahead of its coming in and the beats it drifts before it bursts
    return ev.lead !== undefined ? ev.lead : ev.axis == "gate" ? GATE_LEAD : ev.axis == "target" ? warn + TARGET_LEAD
        : ev.axis == "mine" ? warn + ev.drift : warn;
}

function timelineEnd(events, none) { // the moment the last of a timeline's events is done with, in beats: a laser's
    // burn over (its endAt, as it will be on screen: a held note's, a sweeper's, a radar's or a spinning X's turn), a
    // target's or a gate's beat gone by; `none` for a timeline with nothing in it
    var end = null;
    events.forEach(function (ev) {
        var at = ev.axis == "target" ? ev.fire + TARGET_GONE : ev.axis == "gate" ? ev.fire + GATE_GONE
            : makeHazard(ev, 0).endAt;
        end = end === null ? at : Math.max(end, at);
    });
    return end === null ? none : end;
}

function makeHazard(ev, warn) { // the thing on screen for a timeline event
    var lead = eventLead(ev, warn);
    return ev.axis == "gate" ? new Gate(ev, lead) : ev.axis == "target" ? new Target(ev, lead)
        : ev.axis == "corridor" ? new Corridor(ev, lead) : ev.axis == "sweep" ? new Sweeper(ev, lead)
        : ev.axis == "radar" ? new Radar(ev, lead) : ev.axis == "pendulum" ? new Pendulum(ev, lead)
        : ev.axis == "ring" ? new Ring(ev, lead) : ev.axis == "diagonal" ? new Diagonal(ev, lead)
        : ev.axis == "spin" ? new Spinner(ev, lead) : ev.axis == "drift" ? new Drifter(ev, lead)
        : ev.axis == "mine" ? new Mine(ev, lead) : ev.flank ? flankBeam(ev, lead) : new Beam(ev, lead);
}

function flankBeam(ev, warn) { // a beam flanking a gap the player is asked into, as this difficulty has it (flankPlace)
    var beam = new Beam(ev, warn), at = flankPlace(ev, gapRoom());
    beam.pos = at.pos;
    beam.size = at.size;
    beam.fit();
    return beam;
}

function flankPlace(ev, room) { // where a beam flanking a gap (a wall's, closing walls', a pincer's, a cage's) stands,
    // { pos, size }, with the gap `room` times as wide as it was placed. ev.flank is the gap at TRUE's: where it starts
    // on the beam's axis, how wide it is, how far it keeps from the screen's edges, and whether the beams run out to
    // the edges (fill: a wall across). The gap widens about its middle, and is kept that far in; a beam that runs to
    // the edge stays there and reaches to the gap, one that doesn't moves with the gap's edge (and slides in to there)
    var f = ev.flank, wide = f.gap * room;
    if (wide == f.gap) {
        return { pos: ev.pos, size: ev.size }; // TRUE's, as placed
    }
    var at = Math.max(f.keep, Math.min(1 - f.keep - wide, f.at - (wide - f.gap) / 2)); // where the gap starts now
    var before = ev.pos < f.at, shift = before ? at - f.at : at + wide - (f.at + f.gap); // how far its edge moved
    return !f.fill ? { pos: ev.pos + shift, size: ev.size }
        : before ? { pos: ev.pos, size: ev.size + shift } : { pos: ev.pos + shift, size: ev.size - shift };
}

// A laser. It shows its outline from `fire - warn` beats, burns from `fire` for BEAM_FIRE of its note (half a beat, or
// half of a held note's length: the only time it can hit), and fades for BEAM_FADE more. A mover comes to where it
// fires over its warning instead of flickering in place, its landing place marked: a faller (kind "fall") down from
// just over the top edge, landing FALL_LAND of the way through its warning to sit on its outline until it fires, a
// slider (kind "slide") from wherever its event says (`from`, on its axis). A chaser (kind
// "chase") follows the piece's height until CHASE_LOCK before its beat, then locks, and its outline goes solid: the
// tell. A segment (`span`) covers only that stretch of the width. Its place is kept as fractions of the screen, so a
// resize refits it. A
// coloured beam warns in its colour -- cyan in a solid line, magenta dashed, so the two differ by more than colour --
// and burns with a glow of it round the laser core, which stays the laser's own colour: that is what can hit. A
// beam the piece absorbs in overdrive can't hit any more, and collapses to a white line and goes.
// How every laser is drawn, so that a busy screen still reads. A warning is dim and thin until WARN_LAST beats before it
// fires, then comes up to full over that last beat, flickering in sixteenths only once it is that near: what is about
// to fire stands out from what is not. The footprint of anything due within that last beat is hatched in its colour
// (laserHatch), so the ground left clear reads as the safe area. A burning laser's core, the part that can hit, is drawn
// to its hitbox with a hard white edge, and its glow, which is forgiven, is faint outside it.
var WARN_LAST = 1; // beats before it fires that a warning comes up to full over
var WARN_DIM = 0.2; // of full: a warning's brightness before that
var WARN_HATCH = 0.32; // the hatch's alpha over a footprint due within WARN_LAST
var GLOW_ALPHA = 0.22; // the glow's alpha round a burning core, the whole band
var EDGE_ALPHA = 0.9; // the hard edge's, along a burning core
var hatchCache = {}; // the hatch pattern in each colour, made once

// A laser that moves while it can hit, over ground it did not start on -- a sweeper wiping across, a pendulum on its
// swing -- also shows that ground, from its warning until its last burn: a faint wash in its colour with dashed edges,
// under its outline, so where it is going reads as early as where it starts, and shrinking as it is crossed. The radar's
// ray and the spinning X turn where they stand, and show none
var PATH_WASH = 0.08; // the wash's alpha over that ground, at full
var PATH_HATCH = 0.3; // the hatch's over it (pathHatch: sparser than laserHatch's, and leaning the other way)
var PATH_EDGE = 0.7; // and its dashed edges'
var PATH_DIM = 0.6; // of full, while the warning is not yet near
var PATH_DASH = [6, 6];
var pathHatchCache = {}; // the path's hatch in each colour, made once

function pathLook(fireAt) { // how strongly that ground shows now, a laser due at beat fireAt: from PATH_DIM while its
    // warning is far to full as it comes near (warnLook's near, without its flicker), and full once it burns
    var near = Math.max(0, Math.min(1, 1 - (fireAt - beatPos) / WARN_LAST));
    return PATH_DIM + (1 - PATH_DIM) * near;
}

function pathHatch(tint) { // the hatch over the ground a moving laser will still cover: sparser than laserHatch's and
    // leaning the other way, so it reads as ground to come rather than ground about to burn, and where the two meet
    // they cross
    if (!pathHatchCache[tint]) {
        var c = document.createElement("canvas"), g = c.getContext("2d");
        c.width = c.height = 14;
        g.strokeStyle = tint;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(14, 14);
        g.stroke();
        pathHatchCache[tint] = ctx.createPattern(c, "repeat");
    }
    return pathHatchCache[tint];
}

function pathFill(tint, strength, rects) { // that ground's wash and hatch, over each [x, y, w, h] of it
    ctx.globalAlpha = PATH_WASH * strength;
    ctx.fillStyle = tint;
    rects.forEach(function (r) { ctx.fillRect(r[0], r[1], r[2], r[3]); });
    ctx.globalAlpha = PATH_HATCH * strength;
    ctx.fillStyle = pathHatch(tint);
    rects.forEach(function (r) { ctx.fillRect(r[0], r[1], r[2], r[3]); });
}

function pathEdge(x0, y0, x1, y1) { // one of that ground's dashed edges, in the stroke and alpha set by the caller
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
}

function warnLook(fireAt) { // how a warning due at beat fireAt is drawn now: near, 0 until WARN_LAST beats before it and
    // 1 on its beat; blink, its flicker, once near; alpha, of full; width, of its line, in px; wash, of the faint fill of
    // its footprint; hatch, of the hatch over it, 0 until it is near
    var near = Math.max(0, Math.min(1, 1 - (fireAt - beatPos) / WARN_LAST));
    var blink = near > 0 && (beatPos * 4) % 1 >= 0.5 ? 0.6 : 1;
    return { near: near, blink: blink, alpha: (WARN_DIM + (1 - WARN_DIM) * near) * blink, width: 1 + 2 * near,
        wash: (0.03 + 0.12 * near) * blink, hatch: near > 0 ? WARN_HATCH * blink : 0 };
}

// A laser that moves while it can hit (a sweeper wiping across, a pendulum on its swing, the radar's ray and the
// spinning X's arms coming round) wears a run of small triangles inside it, along its length, pointing the way it is
// going and blinking on and off, for as long as it can hit. A faller, closing walls and a chaser only move through
// their warnings, and are still by the time they can hit; a ring only grows into the outline it fires at, and a
// corridor always scrolls the same way with its path in view, as the drifting lasers all drift, trailing their way
// behind them: none of them wears any
//
// The difficulty sets their pace (laserPace): a corridor keeps its bar, and gets the less far along its path in it the
// slower it goes; a sweeper, the radar, a pendulum and the spinning X make their whole way all the same, taking the
// longer, on into the bars after their own, but are done before laser form, the level's end, another of them, or a
// bar with a place of its own to be in (MOVER_YIELDS), going just fast enough for that where they must, and a hurt
// boss still slows the radar within that (bossSlow, boss.js); a drifting laser takes the longer to cross, as short as
// it was in time where it passes
var MOVE_TRI = 0.026; // a triangle's size, base to tip, as a fraction of the screen's shorter side...
var MOVE_TRI_MAX = 20; // ...and at most this, in px
var MOVE_TRI_GAP = 3; // px at least between a triangle's base and the laser's hot white line: the run sits off the line,
                      // on the side the laser is going to, each triangle's tip out toward that edge...
var MOVE_TRI_GAP_SHARE = 0.125; // ...and more on a thicker laser: this much of how thick it is
var MOVE_TRI_EVERY = 3; // triangle sizes from one to the next along the laser
var MOVE_TRI_BLINK = 2; // blinks a beat: on for the first half of each
var MOVE_TRI_FILL = COLORS.laserCore, MOVE_TRI_EDGE = COLORS.bg; // white, rimmed dark so they read on the laser
var RAY_HOT_LINE = 3; // px: the hot white line down the radar's ray and the spinning X's arms
var RAY_GLOW = 2.2; // and their glow, as wide as this many of their cores: a ray's triangles reach into it

function laserPace() { // how fast the lasers that move go on this difficulty, of TRUE's: its speed (DIFFICULTIES,
    // run.js)
    return mode().speed || 1;
}

function gapRoom() { // how much wider the gaps the player is asked into (a corridor's, a wall's, closing walls', a
    // pincer's, a cage's cell, a sweeper's hole) are on this difficulty than on TRUE: its gap (DIFFICULTIES, run.js)
    return mode().gap || 1;
}

function moveTrisOn() { // the run blinks on and off on the beat
    return (beatPos * MOVE_TRI_BLINK) % 1 < 0.5;
}

function moveTriSize(room) { // a triangle's size: as the screen gives it, and no more than the `room` px it has
    return Math.min(MOVE_TRI_MAX, MOVE_TRI * Math.min(gameArea.canvas.width, gameArea.canvas.height), room);
}

function moveTriBase(across, line) { // how far from a laser's middle its triangles' bases sit, the laser `across` px
    // thick and its hot white line `line` px: clear of the line by the gap, which grows with the laser
    return line / 2 + Math.max(MOVE_TRI_GAP, MOVE_TRI_GAP_SHARE * across);
}

function moveTris(x0, y0, x1, y1, angle, base, s, skip) { // a run of triangles s px big along a laser whose middle runs
    // from (x0, y0) to (x1, y1), MOVE_TRI_EVERY sizes apart, each pointing at `angle` (0 to the right, on clockwise),
    // its base `base` px from that middle and its tip s px further on; skip(x, y), given, leaves out any whose base's
    // middle it is true of (a sweeper's hole)
    var len = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)), n = Math.floor(len / (s * MOVE_TRI_EVERY));
    var c = Math.cos(angle), d = Math.sin(angle), half = s * 0.5;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n, x = x0 + (x1 - x0) * t + c * base, y = y0 + (y1 - y0) * t + d * base; // the base's middle
        if (skip && skip(x, y)) {
            continue;
        }
        ctx.moveTo(x + c * s, y + d * s); // the tip, out ahead, and the base's two corners
        ctx.lineTo(x - d * half, y + c * half);
        ctx.lineTo(x + d * half, y - c * half);
        ctx.closePath();
    }
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = MOVE_TRI_EDGE;
    ctx.stroke();
    ctx.fillStyle = MOVE_TRI_FILL;
    ctx.fill();
    ctx.restore();
}

function laserHatch(tint) { // a diagonal hatch in `tint`, a repeating pattern, over the footprint of what is about to fire
    if (!hatchCache[tint]) {
        var c = document.createElement("canvas"), g = c.getContext("2d");
        c.width = c.height = 10;
        g.strokeStyle = tint;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, 10);
        g.lineTo(10, 0);
        g.stroke();
        hatchCache[tint] = ctx.createPattern(c, "repeat");
    }
    return hatchCache[tint];
}

function Beam(ev, warn) {
    this.axis = ev.axis;
    this.pos = ev.pos;
    this.size = ev.size;
    this.color = ev.color; // "cyan", "magenta" or null
    this.span = ev.span || null; // a horizontal beam's stretch of the width, [left, right] as fractions: the whole
                                 // width unless given (a segment)
    this.from = ev.kind == "fall" ? -ev.size : ev.from; // a mover's start on its axis: a faller's just over the top
    this.fall = ev.kind == "fall"; // a faller lands early (FALL_LAND) and waits on its outline
                                                        // edge, a slider's where its event says; undefined, it stays put
    this.chase = ev.kind == "chase"; // a chaser: its height follows the piece's until it locks
    this.lockAt = ev.fire - CHASE_LOCK;
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + BEAM_FIRE * (ev.hold || 1); // a held note's burns for the note
    this.absorbedAt = null; // the beat it was absorbed on, if it has been
    this.fit();
}

Beam.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Beam.prototype.fit = function () { // its rectangle on this window (a mover's, where it has got to on its way)
    var W = gameArea.canvas.width, H = gameArea.canvas.height, at = this.placeNow();
    if (this.axis == "h") {
        this.x = this.span ? this.span[0] * W : 0;
        this.width = this.span ? (this.span[1] - this.span[0]) * W : W;
        this.y = at * H; this.height = this.size * H;
    } else {
        this.y = 0; this.height = H; this.x = at * W; this.width = this.size * W;
    }
};

Beam.prototype.fallen = function () { // 0..1: how far into its warning it is, which for a mover is how far along its
    // way it has come, 1 once it is where it fires, on its beat
    return Math.max(0, Math.min(1, (beatPos - this.warnAt) / (this.fireAt - this.warnAt)));
};

Beam.prototype.placeNow = function () { // where it is now on its axis, as a fraction: a mover on its way from where it
    // started to where it fires, or its place as given. A faller comes down in the first FALL_LAND of its warning,
    // slowing as it lands, and sits there
    if (this.from === undefined) {
        return this.pos;
    }
    var t = this.fallen();
    if (this.fall) {
        t = 1 - Math.pow(1 - Math.min(1, t / FALL_LAND), 2);
    }
    return this.from + (this.pos - this.from) * t;
};

Beam.prototype.landing = function () { // where a mover will fire, in px on its axis
    return this.pos * (this.axis == "h" ? gameArea.canvas.height : gameArea.canvas.width);
};

Beam.prototype.step = function () { // false once its afterglow is gone, or it has been absorbed; a mover moves, and a
    // chaser follows the piece's height until it locks
    if (this.chase && beatPos < this.lockAt) {
        var H = gameArea.canvas.height;
        this.pos = Math.max(0.03, Math.min(0.97 - this.size, (gamePiece.y + gamePiece.height / 2) / H - this.size / 2));
    }
    if (this.from !== undefined || this.chase) {
        this.fit();
    }
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Beam.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Beam.prototype.hits = function (piece) { // only while it burns, and only its core: the outer glow is forgiven
    if (!this.firing()) {
        return false;
    }
    var core = { x: this.x, y: this.y, width: this.width, height: this.height };
    if (this.axis == "h") {
        core.y += this.height * BEAM_INSET;
        core.height -= 2 * this.height * BEAM_INSET;
        if (this.span) { // a segment's ends that stop short of the edge dissolve, and are forgiven
            var solid = this.solidSpan();
            core.x = solid.x;
            core.width = solid.w;
        }
    } else {
        core.x += this.width * BEAM_INSET;
        core.width -= 2 * this.width * BEAM_INSET;
    }
    return piece.crashWith(core);
};

Beam.prototype.update = function () { // draw it: an outline that sharpens as it comes due, then the beam
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    ctx.save();
    if (this.absorbedAt !== null) { // absorbed: white, narrowing to its middle line as it goes
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.fillStyle = COLORS.laserCore;
        this.band((this.axis == "h" ? this.height : this.width) * 0.5 * gone);
    } else if (beatPos < this.fireAt) { // the warning
        var t = this.chase && beatPos >= this.lockAt ? 1 : this.fallen(); // a chaser's goes solid once it has locked
        var look = warnLook(this.fireAt), blink = look.blink;
        if (this.from !== undefined) { // where a mover will fire, under it on its way. A faller's is its warning
            // proper, as bright and as blinking as any beam's, since that is where to read it; a slider's or a
            // chaser's is dim, firming up as it comes
            ctx.strokeStyle = tint;
            if (this.fall) {
                ctx.globalAlpha = look.alpha;
                ctx.lineWidth = look.width;
                ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
            } else {
                ctx.globalAlpha = look.alpha * 0.4;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 6]);
            }
            if (this.axis == "h") {
                ctx.strokeRect(this.x + 1, this.landing() + 1, this.width - 2, this.height - 2);
            } else {
                ctx.strokeRect(this.landing() + 1, this.y + 1, this.width - 2, this.height - 2);
            }
        }
        ctx.globalAlpha = look.wash;
        ctx.fillStyle = tint;
        this.strip(this.x, this.y, this.width, this.height);
        if (look.hatch) { // due within the beat: its footprint hatched
            var due = this.solidSpan();
            ctx.globalAlpha = look.hatch;
            ctx.fillStyle = laserHatch(tint);
            ctx.fillRect(due.x, this.y, due.w, this.height);
        }
        ctx.globalAlpha = look.alpha * (this.fall && t < FALL_LAND ? 0.4 : 1); // a faller still on its way is the fainter
        // of its two outlines
        ctx.strokeStyle = tint;
        ctx.lineWidth = look.width;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        var solid = this.solidSpan(); // a segment's outline stops where its light will dissolve
        ctx.strokeRect(solid.x + 1, this.y + 1, solid.w - 2, this.height - 2);
    } else { // burning, then its afterglow
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var across = this.axis == "h" ? this.height : this.width;
        ctx.globalAlpha = GLOW_ALPHA * fade; // the glow, the whole band, forgiven
        ctx.fillStyle = tint;
        this.strip(this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 0.95 * fade; // the core: what can actually hit
        ctx.fillStyle = COLORS.laser;
        var inset = across * BEAM_INSET;
        this.band(inset);
        ctx.fillStyle = COLORS.laserCore; // and a hot white line down its middle, thin however wide the beam
        this.band((across - Math.min(across * 0.2, BEAM_CORE_MAX)) / 2);
        ctx.globalAlpha = EDGE_ALPHA * fade; // and a hard edge where the core, what can hit, ends
        this.edges(inset);
    }
    ctx.restore();
};

Beam.prototype.edges = function (inset) { // a line a pixel wide along each long edge of the core, `inset` in from the band's
    var solid = this.solidSpan();
    if (this.axis == "h") {
        ctx.fillRect(solid.x, this.y + inset, solid.w, 1);
        ctx.fillRect(solid.x, this.y + this.height - inset - 1, solid.w, 1);
    } else {
        ctx.fillRect(this.x + inset, this.y, 1, this.height);
        ctx.fillRect(this.x + this.width - inset - 1, this.y, 1, this.height);
    }
};

Beam.prototype.band = function (inset) { // fill the beam less `inset` px off each long side
    if (this.axis == "h") {
        this.strip(this.x, this.y + inset, this.width, Math.max(1, this.height - 2 * inset));
    } else {
        ctx.fillRect(this.x + inset, this.y, Math.max(1, this.width - 2 * inset), this.height);
    }
};

Beam.prototype.solidSpan = function () { // the stretch of a beam across the screen that is drawn solid: all of it,
    // but for a segment's ends that stop short of the screen's edge, which dissolve over SEGMENT_FADE of the width
    var fade = this.span ? SEGMENT_FADE * gameArea.canvas.width : 0;
    var x0 = this.x + (this.span && this.span[0] > 0 ? fade : 0);
    var x1 = this.x + this.width - (this.span && this.span[1] < 1 ? fade : 0);
    return { x: x0, w: Math.max(0, x1 - x0) };
};

Beam.prototype.strip = function (x, y, w, h) { // fill a strip of a beam across the screen in the fill set: solid over
    // its solid stretch, dissolving over a segment's open ends
    var col = ctx.fillStyle, solid = this.solidSpan(), x0 = Math.max(x, solid.x), x1 = Math.min(x + w, solid.x + solid.w);
    ctx.fillRect(x0, y, Math.max(0, x1 - x0), h);
    if (x0 > x) {
        ctx.fillStyle = fadeGradient(col, x0, 0, x, 0);
        ctx.fillRect(x, y, x0 - x, h);
    }
    if (x1 < x + w) {
        ctx.fillStyle = fadeGradient(col, x1, 0, x + w, 0);
        ctx.fillRect(x1, y, x + w - x1, h);
    }
    ctx.fillStyle = col;
};

// A corridor: a bar of the level in which the whole height burns but for a gap that rides the melody. Its path is the
// gap's centre at each of the bar's beats (ev.pos, fractions of the height, one more than the bar has beats), glided
// between with a cosine and held flat past either end, and it scrolls in from the right at CORRIDOR_BEAT of the width
// a beat of its path, its present at CORRIDOR_NOW: to the right is what is still to come, to the left what has gone
// by. It scrolls at the difficulty's pace (laserPace): slower, its path comes by the slower, the same shape, and only
// so much of it comes past in its bar, so the gap rides less of the melody, and more gently. Its gap (ev.size) is
// TRUE's, wider at an easier difficulty (gapRoom). It warns as an outline from `fire - warn`, burns from `fire`
// to the bar's end across the whole screen, so the piece rides the bar's worth of it wherever it stands, and fades
// for BEAM_FADE. Nothing to run into by the plain test: hits does the work, at three points across the piece,
// forgiving the walls' edges as a beam's glow is (CORRIDOR_INSET). Overdrive can absorb it, as it can a beam.
function Corridor(ev, warn) {
    this.path = ev.pos;
    this.gap = ev.size * gapRoom(); // wider at an easier difficulty
    this.pace = laserPace(); // slower, it scrolls only so far along its path in its bar
    this.color = ev.color; // "cyan", "magenta" or null
    this.beats = ev.pos.length - 1;
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + this.beats;
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0;
}

Corridor.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Corridor.prototype.step = function () { // false once its afterglow is gone, or it has been absorbed
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Corridor.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Corridor.prototype.beatAt = function (x) { // the beat of its path at screen x, now: its present as far along the path
    // as its pace has brought it, and the rest across the screen from there
    return this.pace * (beatPos - this.fireAt) + (x / gameArea.canvas.width - CORRIDOR_NOW) / CORRIDOR_BEAT;
};

Corridor.prototype.centreAt = function (b) { // the gap's centre at beat b of its path, as a fraction of the height
    b = Math.max(0, Math.min(this.beats, b));
    var i = Math.min(this.beats - 1, Math.floor(b)), k = b - i;
    var s = 0.5 - 0.5 * Math.cos(Math.PI * k); // the glide
    return this.path[i] + (this.path[i + 1] - this.path[i]) * s;
};

Corridor.prototype.gapAt = function (x) { // the gap's top and bottom at screen x, in px
    var H = gameArea.canvas.height, c = this.centreAt(this.beatAt(x)) * H, half = this.gap * H / 2;
    return { top: c - half, bottom: c + half };
};

Corridor.prototype.hits = function (piece) { // in a wall past its forgiven edge, at any of three points across the piece
    if (!this.firing()) {
        return false;
    }
    var inset = CORRIDOR_INSET * this.gap * gameArea.canvas.height;
    var xs = [piece.x, piece.x + piece.width / 2, piece.x + piece.width];
    for (var i = 0; i < xs.length; i++) {
        var g = this.gapAt(xs[i]);
        if (piece.y < g.top - inset || piece.y + piece.height > g.bottom + inset) {
            return true;
        }
    }
    return false;
};

Corridor.prototype.trace = function (inset, closed) { // the walls' edges `inset` px back from the gap, as two paths:
    // open lines to stroke, or, closed, the walls themselves to fill
    var W = gameArea.canvas.width, H = gameArea.canvas.height, n = 64;
    ctx.beginPath();
    [-1, 1].forEach(function (side) {
        var edge = side < 0 ? 0 : H;
        if (closed) {
            ctx.moveTo(0, edge);
        }
        for (var i = 0; i <= n; i++) {
            var x = W * i / n, g = this.gapAt(x), y = side < 0 ? g.top - inset : g.bottom + inset;
            if (i == 0 && !closed) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        if (closed) {
            ctx.lineTo(W, edge);
            ctx.closePath();
        }
    }, this);
};

Corridor.prototype.update = function () { // draw it: the walls as an outline scrolling in, then burning, then fading
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var inset = CORRIDOR_INSET * this.gap * gameArea.canvas.height;
    ctx.save();
    if (this.absorbedAt !== null) { // absorbed: white, the walls drawing back from the gap as they go
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.fillStyle = COLORS.laserCore;
        this.trace(gone * gameArea.canvas.height / 2, true);
        ctx.fill();
    } else if (beatPos < this.fireAt) { // the warning: the walls faint, their edges dim and thin until the last beat, the
        // path scrolling in; due within the beat, the walls hatched
        var look = warnLook(this.fireAt);
        ctx.globalAlpha = look.wash;
        ctx.fillStyle = tint;
        this.trace(0, true);
        ctx.fill();
        if (look.hatch) {
            ctx.globalAlpha = look.hatch;
            ctx.fillStyle = laserHatch(tint);
            ctx.fill(); // the same walls
        }
        ctx.globalAlpha = look.alpha;
        ctx.strokeStyle = tint;
        ctx.lineWidth = look.width;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        this.trace(0, false);
        ctx.stroke();
    } else { // burning, then its afterglow: the glow, the core that can hit, and a hot line along its edge
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.fillStyle = tint;
        this.trace(0, true);
        ctx.fill();
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = COLORS.laser;
        this.trace(inset, true);
        ctx.fill();
        ctx.strokeStyle = COLORS.laserCore;
        ctx.lineWidth = 3;
        this.trace(inset, false);
        ctx.stroke();
    }
    ctx.restore();
};

// A sweeper: a band down the whole height that sets out from just off one edge on its beat and wipes across to the
// other over its beats, burning the whole way, with a hole at its note's height (ev.hole, a fraction of the height,
// ev.gap of it tall at TRUE's: wider at an easier difficulty, about the same middle, kept on the screen) to be in as it
// comes by; ev.pos is the way it goes, 1 rightward from the left edge, -1 the other way. At a slower pace (laserPace)
// it takes the longer to wipe across, on past its bar, but always gets across: within its life (buildTimeline),
// going just fast enough for that where it must. It warns as an outline at
// the edge it sets out from. Between one step and the next it moves further than the piece is wide, so it hits across
// everything it swept since the last step (lastX). Its sides and its hole's edges are forgiven as a beam's glow is
// (BEAM_INSET). Overdrive can absorb it, as it can a beam.
function Sweeper(ev, warn) {
    this.dir = ev.pos > 0 ? 1 : -1;
    this.size = ev.size; // of the width
    this.color = ev.color; // "cyan", "magenta" or null
    this.gap = ev.gap * gapRoom(); // its hole: wider at an easier difficulty, about the same middle, kept on the screen
    this.hole = Math.max(this.gap / 2 + SWEEP_EDGE, Math.min(1 - SWEEP_EDGE - this.gap / 2, ev.hole));
    this.pace = laserPace(); // slower, it takes the longer to wipe across...
    this.turn = Math.min(ev.beats / this.pace, ev.life || Infinity); // ...but is across within its life
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + this.turn;
    this.absorbedAt = null;
    this.fit();
}

Sweeper.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Sweeper.prototype.crossed = function () { // 0..1: how far across it has come, 0 until its beat, 1 at its turn's end
    return Math.max(0, Math.min(1, (beatPos - this.fireAt) / this.turn));
};

Sweeper.prototype.place = function () { // its left edge now: from just off the edge it sets out from to just off the other
    var W = gameArea.canvas.width, span = W + this.width, t = this.crossed();
    return this.dir > 0 ? -this.width + span * t : W - span * t;
};

Sweeper.prototype.fit = function () { // its rectangle on this window: the whole height, where it has got to
    this.width = this.size * gameArea.canvas.width;
    this.height = gameArea.canvas.height;
    this.y = 0;
    this.x = this.lastX = this.place();
};

Sweeper.prototype.step = function () { // on across, keeping where it was: false once its afterglow is gone
    this.lastX = this.x;
    this.x = this.place();
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Sweeper.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Sweeper.prototype.holeEdges = function () { // the hole's top and bottom, in px
    var H = gameArea.canvas.height;
    return { top: (this.hole - this.gap / 2) * H, bottom: (this.hole + this.gap / 2) * H };
};

Sweeper.prototype.hits = function (piece) { // across the band, or anything it swept since the last step, and out of
    // the hole
    if (!this.firing()) {
        return false;
    }
    var inset = this.width * BEAM_INSET;
    var left = Math.min(this.x, this.lastX) + inset, right = Math.max(this.x, this.lastX) + this.width - inset;
    if (piece.x + piece.width < left || piece.x > right) {
        return false;
    }
    var h = this.holeEdges(), give = BEAM_INSET * this.gap * gameArea.canvas.height;
    return piece.y < h.top - give || piece.y + piece.height > h.bottom + give;
};

Sweeper.prototype.band = function (x, inset) { // the band at x, less `inset` px off each side, in two parts round the
    // hole, each dissolving into the hole over SWEEP_FADE of it, in the fill set by the caller (a hex colour)
    var H = gameArea.canvas.height, h = this.holeEdges(), fade = SWEEP_FADE * this.gap * H;
    var left = x + inset, w = this.width - 2 * inset, col = ctx.fillStyle;
    ctx.fillRect(left, 0, w, h.top - fade);
    ctx.fillStyle = fadeGradient(col, 0, h.top - fade, 0, h.top);
    ctx.fillRect(left, h.top - fade, w, fade);
    ctx.fillStyle = fadeGradient(col, 0, h.bottom + fade, 0, h.bottom);
    ctx.fillRect(left, h.bottom, w, fade);
    ctx.fillStyle = col;
    ctx.fillRect(left, h.bottom + fade, w, H - h.bottom - fade);
};

function fadeGradient(col, x0, y0, x1, y1) { // a fill that is `col` (a hex colour, "#rrggbb") at (x0, y0) and gone at
    // (x1, y1): what a sweeper's band dissolves into its hole with, and a segment's end into the screen
    var g = ctx.createLinearGradient(x0, y0, x1, y1), rgb = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(col);
    var clear = rgb ? "rgba(" + parseInt(rgb[1], 16) + "," + parseInt(rgb[2], 16) + "," + parseInt(rgb[3], 16) + ",0)"
        : "rgba(0,0,0,0)";
    g.addColorStop(0, col);
    g.addColorStop(1, clear);
    return g;
}

Sweeper.prototype.drawPath = function (strength) { // the ground it will still wipe across: from its leading edge (the
    // edge it sets out from, through its warning) to the far side, washed faintly in its colour, the hole's lane left
    // clear and edged in dashes, so the way through reads before the band arrives
    var W = gameArea.canvas.width, H = gameArea.canvas.height, h = this.holeEdges();
    var lead = this.dir > 0 ? Math.max(0, this.x + this.width) : Math.min(W, this.x);
    var x0 = this.dir > 0 ? lead : 0, x1 = this.dir > 0 ? W : lead;
    if (x1 - x0 < 1) {
        return;
    }
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    pathFill(tint, strength, [[x0, 0, x1 - x0, h.top], [x0, h.bottom, x1 - x0, H - h.bottom]]);
    ctx.globalAlpha = PATH_EDGE * strength;
    ctx.strokeStyle = tint;
    ctx.lineWidth = 1;
    ctx.setLineDash(PATH_DASH);
    pathEdge(x0, Math.round(h.top) + 0.5, x1, Math.round(h.top) + 0.5);
    pathEdge(x0, Math.round(h.bottom) - 0.5, x1, Math.round(h.bottom) - 0.5);
    ctx.setLineDash([]);
};

Sweeper.prototype.update = function () { // draw it: an outline at its edge, then the band wiping across, then fading,
    // over the ground it has still to cross
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.save();
    if (this.absorbedAt === null && beatPos < this.endAt) {
        this.drawPath(beatPos < this.fireAt ? pathLook(this.fireAt) : 1);
    }
    if (this.absorbedAt !== null) { // absorbed: white, narrowing to its middle line as it goes
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.fillStyle = COLORS.laserCore;
        this.band(this.x, this.width * 0.5 * gone);
    } else if (beatPos < this.fireAt) { // the warning: at the edge it sets out from, its hole showing, dim and thin until
        // its last beat; due within the beat, hatched
        var look = warnLook(this.fireAt);
        var x = this.dir > 0 ? 0 : W - this.width, h = this.holeEdges();
        var fade = SWEEP_FADE * this.gap * H; // the outline and the hatch stop where the band will dissolve
        ctx.globalAlpha = look.wash;
        ctx.fillStyle = tint;
        this.band(x, 0);
        if (look.hatch) {
            ctx.globalAlpha = look.hatch;
            ctx.fillStyle = laserHatch(tint);
            ctx.fillRect(x, 0, this.width, h.top - fade);
            ctx.fillRect(x, h.bottom + fade, this.width, H - h.bottom - fade);
        }
        ctx.globalAlpha = look.alpha;
        ctx.strokeStyle = tint;
        ctx.lineWidth = look.width;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        ctx.strokeRect(x + 1, 1, this.width - 2, h.top - fade - 2);
        ctx.strokeRect(x + 1, h.bottom + fade + 1, this.width - 2, H - h.bottom - fade - 2);
    } else { // burning as it wipes across, then its afterglow where it stopped: the glow, the core that can hit, a hot
        // line down it, and hard edges where the core ends, its sides and its hole's
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.fillStyle = tint;
        this.band(this.x, 0);
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = COLORS.laser;
        this.band(this.x, this.width * BEAM_INSET);
        ctx.fillStyle = COLORS.laserCore;
        this.band(this.x, (this.width - Math.min(this.width * 0.2, BEAM_CORE_MAX)) / 2);
        var hole = this.holeEdges(), give = BEAM_INSET * this.gap * H, side = this.width * BEAM_INSET;
        ctx.globalAlpha = EDGE_ALPHA * fade;
        [this.x + side, this.x + this.width - side - 1].forEach(function (ex) {
            ctx.fillRect(ex, 0, 1, hole.top - give);
            ctx.fillRect(ex, hole.bottom + give, 1, H - hole.bottom - give);
        }, this);
        ctx.fillRect(this.x + side, hole.top - give - 1, this.width - 2 * side, 1);
        ctx.fillRect(this.x + side, hole.bottom + give, this.width - 2 * side, 1);
    }
    if (this.firing() && moveTrisOn()) { // while it can hit, which way it wipes: down its length, just off its hot line
        // on the side it is wiping to, inside its core, the hole left clear
        var base = moveTriBase(this.width, Math.min(this.width * 0.2, BEAM_CORE_MAX));
        var s = moveTriSize(this.width * (1 - 2 * BEAM_INSET) / 2 - base - 2), mid = this.x + this.width / 2;
        var gap = this.holeEdges();
        moveTris(mid, 0, mid, H, this.dir > 0 ? 0 : Math.PI, base, s, function (x, y) {
            return y > gap.top - s && y < gap.bottom + s;
        });
    }
    ctx.restore();
};

// A ring: a circle round a point (ev.pos, [x, y] as fractions of the width and height) that grows from nothing to its
// radius (ev.size, of the height) over its warning and fires as a thin ring there, so the place to be is inside it or
// outside it. Its edges are forgiven as a beam's glow is. Overdrive can absorb it. Nothing to run into by the plain
// test: hits does the work.
function Ring(ev, warn) {
    this.cx = ev.pos[0];
    this.cy = ev.pos[1];
    this.radius = ev.size;
    this.color = ev.color; // "cyan", "magenta" or null
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + BEAM_FIRE * (ev.hold || 1);
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0;
}

Ring.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Ring.prototype.fallen = function () { // 0..1: how far into its warning it is, which is how far it has grown
    return Math.max(0, Math.min(1, (beatPos - this.warnAt) / (this.fireAt - this.warnAt)));
};

Ring.prototype.step = function () {
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Ring.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Ring.prototype.centre = function () {
    return { x: this.cx * gameArea.canvas.width, y: this.cy * gameArea.canvas.height };
};

Ring.prototype.hits = function (piece) { // on the ring's core, at the radius it fires at
    if (!this.firing()) {
        return false;
    }
    var c = this.centre(), dx = piece.x + piece.width / 2 - c.x, dy = piece.y + piece.height / 2 - c.y;
    var d = Math.sqrt(dx * dx + dy * dy), R = this.radius * gameArea.canvas.height;
    return Math.abs(d - R) <= RING_WIDTH / 2 * (1 - 2 * BEAM_INSET) + piece.width / 2;
};

Ring.prototype.draw = function (r, width) { // the ring at radius r, `width` px thick
    var c = this.centre();
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(c.x, c.y, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.stroke();
};

Ring.prototype.update = function () { // draw it: growing as an outline, its full size marked, then burning, then fading
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var R = this.radius * gameArea.canvas.height;
    ctx.save();
    if (this.absorbedAt !== null) { // absorbed: white, thinning to nothing
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.strokeStyle = COLORS.laserCore;
        this.draw(R, Math.max(1, RING_WIDTH * (1 - gone)));
    } else if (beatPos < this.fireAt) { // the warning: the ring growing, its full size dashed round it, dim and thin until
        // its last beat; due within the beat, its full size hatched, as wide as its core will be
        var t = this.fallen(), look = warnLook(this.fireAt);
        ctx.strokeStyle = tint;
        ctx.globalAlpha = look.alpha * 0.5;
        ctx.setLineDash([4, 6]);
        this.draw(R, 1);
        if (look.hatch) {
            ctx.setLineDash([]);
            ctx.globalAlpha = look.hatch;
            ctx.strokeStyle = laserHatch(tint);
            this.draw(R, RING_WIDTH);
            ctx.strokeStyle = tint;
        }
        ctx.globalAlpha = look.alpha;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        this.draw(R * t, look.width);
    } else { // burning, then its afterglow: the glow, a hard white edge, the core that can hit, and a hot line through it
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var core = RING_WIDTH * (1 - 2 * BEAM_INSET); // the core as wide as what can hit
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.strokeStyle = tint;
        this.draw(R, RING_WIDTH * 2.2);
        ctx.globalAlpha = EDGE_ALPHA * fade;
        ctx.strokeStyle = COLORS.laserCore;
        this.draw(R, core + 2);
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = COLORS.laser;
        this.draw(R, core);
        ctx.strokeStyle = COLORS.laserCore;
        this.draw(R, 3);
    }
    ctx.restore();
};

// A diagonal: a band leaning ev.tilt radians (down to the right when positive) through a point (ev.pos, [x, y] as
// fractions of the width and height), as thick as a beam (ev.size, of the height), reaching across the whole screen.
// It warns as an outline, burns and fades as a beam does. Its edges are forgiven as a beam's glow is. Overdrive can
// absorb it. Nothing to run into by the plain test: hits does the work.
function Diagonal(ev, warn) {
    this.cx = ev.pos[0];
    this.cy = ev.pos[1];
    this.tilt = ev.tilt;
    this.size = ev.size;
    this.color = ev.color; // "cyan", "magenta" or null
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + BEAM_FIRE * (ev.hold || 1);
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0;
}

Diagonal.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Diagonal.prototype.step = function () {
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Diagonal.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Diagonal.prototype.centre = function () {
    return { x: this.cx * gameArea.canvas.width, y: this.cy * gameArea.canvas.height };
};

Diagonal.prototype.hits = function (piece) { // within the band's core of the line
    if (!this.firing()) {
        return false;
    }
    var c = this.centre(), px = piece.x + piece.width / 2 - c.x, py = piece.y + piece.height / 2 - c.y;
    var d = Math.abs(-Math.sin(this.tilt) * px + Math.cos(this.tilt) * py); // how far off the line
    var half = this.size * gameArea.canvas.height / 2;
    return d <= half * (1 - 2 * BEAM_INSET) + piece.width / 2;
};

Diagonal.prototype.band = function (inset, stroke) { // the band, `inset` px off each edge, in the frame turned to it
    var W = gameArea.canvas.width, H = gameArea.canvas.height, L = W + H;
    var half = this.size * H / 2;
    if (stroke) {
        ctx.strokeRect(-L, -half + inset, 2 * L, 2 * (half - inset));
    } else {
        ctx.fillRect(-L, -half + inset, 2 * L, Math.max(1, 2 * (half - inset)));
    }
};

Diagonal.prototype.update = function () { // draw it: an outline that sharpens as it comes due, then the beam
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var c = this.centre(), half = this.size * gameArea.canvas.height / 2;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(this.tilt);
    if (this.absorbedAt !== null) { // absorbed: white, narrowing to its middle line as it goes
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.fillStyle = COLORS.laserCore;
        this.band(half * gone, false);
    } else if (beatPos < this.fireAt) { // the warning: dim and thin until its last beat; due within the beat, hatched
        var look = warnLook(this.fireAt);
        ctx.globalAlpha = look.wash;
        ctx.fillStyle = tint;
        this.band(0, false);
        if (look.hatch) {
            ctx.globalAlpha = look.hatch;
            ctx.fillStyle = laserHatch(tint);
            this.band(0, false);
        }
        ctx.globalAlpha = look.alpha;
        ctx.strokeStyle = tint;
        ctx.lineWidth = look.width;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        this.band(1, true);
    } else { // burning, then its afterglow: the glow, the core that can hit with a hard edge, and a hot line down it
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var inset = half * 2 * BEAM_INSET, L = gameArea.canvas.width + gameArea.canvas.height;
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.fillStyle = tint;
        this.band(0, false);
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = COLORS.laser;
        this.band(inset, false);
        ctx.fillStyle = COLORS.laserCore;
        this.band(half - Math.min(half * 0.2, BEAM_CORE_MAX / 2), false);
        ctx.globalAlpha = EDGE_ALPHA * fade;
        ctx.fillRect(-L, -half + inset, 2 * L, 1);
        ctx.fillRect(-L, half - inset - 1, 2 * L, 1);
    }
    ctx.restore();
};

// A target, in laser form. It slides in from the right edge to reach TARGET_X on its beat, at its height, and can't
// hurt anything: the beam hits it, lined up and in its colour, on its beat (loop.js). Hit, it bursts; missed, it
// slides on out, and goes once its beat can no longer be hit (beatOpen, loop.js): a press late in the window still has
// to find it, to be judged lined up or not. Its place is worked out from the window as it is drawn, so a resize needs
// nothing.
function Target(ev, lead) {
    this.pos = ev.pos;
    this.size = ev.size;
    this.color = ev.color; // "cyan", "magenta" or null
    this.fireAt = ev.fire;
    this.warnAt = ev.fire - lead;
    this.hitAt = null; // the beat it was hit on, and where
    this.hitX = 0;
    this.grade = null; // and the grade the hit got (hitBeatAt, loop.js)
    this.x = this.y = this.width = this.height = 0; // nothing to run into
}

Target.prototype.hits = function () {
    return false;
};

Target.prototype.step = function () { // false once its burst and its grade are over, or, missed, once it has slid out
    // and its beat is closed
    if (this.hitAt !== null) {
        return beatPos < this.hitAt + Math.max(TARGET_BURST, TARGET_GRADE_SHOW);
    }
    return beatPos < this.fireAt + TARGET_GONE || beatOpen(this.fireAt);
};

Target.prototype.center = function () { // where it is now: { x, y, r }
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var t = (beatPos - this.warnAt) / (this.fireAt - this.warnAt);
    var at = targetX() * W, off = (1 - t) * ((facing > 0 ? W - at : at) + this.size * H); // in from the edge it faces
    return { x: at + facing * off, y: this.pos * H, r: this.size * H };
};

Target.prototype.update = function () { // a diamond sharpening as it comes (cyan solid, magenta dashed, as a beam's
    // warning is), lit up while the beam is on it; hit, it bursts as its grade says (drawHit)
    var c = this.center();
    var tint = this.color ? COLORS[this.color] : COLORS.laserCore;
    ctx.save();
    if (this.hitAt !== null) {
        this.drawHit(c);
        ctx.restore();
        return;
    }
    var t = Math.max(0, Math.min(1, (beatPos - this.warnAt) / (this.fireAt - this.warnAt)));
    var gone = beatPos > this.fireAt ? Math.min(1, (beatPos - this.fireAt) / TARGET_GONE) : 0;
    var lit = linedUp(this);
    ctx.globalAlpha = (0.35 + 0.65 * t) * (1 - gone);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - c.r);
    ctx.lineTo(c.x + c.r, c.y);
    ctx.lineTo(c.x, c.y + c.r);
    ctx.lineTo(c.x - c.r, c.y);
    ctx.closePath();
    ctx.fillStyle = tint;
    ctx.globalAlpha *= lit ? 0.45 : 0.18;
    ctx.fill();
    ctx.globalAlpha = (0.35 + 0.65 * t) * (1 - gone);
    ctx.strokeStyle = tint;
    ctx.lineWidth = lit ? 4 : 3;
    ctx.setLineDash(this.color == "magenta" ? [7, 5] : []);
    ctx.stroke();
    ctx.restore();
};

Target.prototype.drawHit = function (c) { // struck, where the beam met it: a ring going out in its grade's colour (TARGET_
    // GRADES), further and with a brighter flash the better the hit was; and over it the grade, rising off it and fading
    var g = TARGET_GRADES[this.grade] || TARGET_GRADES.good;
    var since = beatPos - this.hitAt, b = Math.min(1, since / TARGET_BURST);
    var x = this.hitX, y = c.y, r = c.r;
    if (b < 1) {
        ctx.globalAlpha = 1 - b;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 1 + 4 * (1 - b);
        ctx.beginPath();
        ctx.arc(x, y, r * (1 + (g.ring - 1) * b), 0, Math.PI * 2);
        ctx.stroke();
        if (g.flash) {
            ctx.globalAlpha = g.flash * (1 - b) * (1 - b);
            ctx.fillStyle = COLORS.laserCore;
            ctx.beginPath();
            ctx.arc(x, y, r * (1 - b), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    var u = since / TARGET_GRADE_SHOW;
    if (u < 1) { // the word, edged dark so it reads over the lasers, as the judgement over the piece is
        var size = Math.max(12, Math.round(0.7 * r)), ly = y - r - 0.4 * size - 1.2 * size * u;
        ctx.globalAlpha = 1 - u * u;
        ctx.font = "bold " + size + "px Arial";
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.lineWidth = 4;
        ctx.strokeStyle = COLORS.bg;
        ctx.strokeText(g.label, x, ly);
        ctx.fillStyle = g.color;
        ctx.fillText(g.label, x, ly);
    }
};

// A radar: a ray from the middle of the screen, reaching past its corners, that comes round once in its beats at
// TRUE's pace, clockwise from pointing right, burning the whole way: keep ahead of it, or behind it, round the middle,
// whose hot disc (RADAR_CORE of the height across) burns throughout. At a slower pace (laserPace) it takes the longer
// to come round, on past its bar, but always comes round in full: within its life (buildTimeline), turning just fast
// enough for that where it must. A hurt boss slows it within that (bossSlow, boss.js). It warns as the ray's outline
// where it will start. Between one step and the next the ray turns further, out at the edges, than the piece is wide,
// so it hits across the arc it swept since the last step (was, to at). It leaves a trail of phosphor behind it, which
// is only light. Nothing to run into by the plain test: hits does the work. Overdrive can absorb it, as it can a beam.
function Radar(ev, warn) {
    this.color = ev.color; // "cyan", "magenta" or null
    this.pace = laserPace(); // slower, it takes the longer to come round...
    this.turn = Math.min(ev.beats / this.pace, ev.life || Infinity); // ...but comes round within its life
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + this.turn;
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0;
    this.raw = this.at = this.was = this.angle(); // raw: where it would be, unslowed by a boss (step)
}

Radar.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Radar.prototype.angle = function () { // where the ray would point now, unslowed by a boss: 0 to the right, and on round
    // clockwise from its beat over its turn
    return Math.PI * 2 * Math.max(0, Math.min(1, (beatPos - this.fireAt) / this.turn));
};

Radar.prototype.step = function () { // on round, keeping where it was, as a boss may have slowed it (bossSlow,
    // boss.js): false once its afterglow is gone
    this.was = this.at;
    var raw = this.angle(); // where it would be unslowed: it comes on by that much, slowed
    this.at = Math.min(Math.PI * 2, this.at + (raw - this.raw) / bossSlow());
    this.raw = raw;
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Radar.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Radar.prototype.reach = function () { // px from the middle to past the corners
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    return Math.sqrt(W * W + H * H) / 2 + 20;
};

Radar.prototype.hits = function (piece) { // on the ray, or on the arc it swept since the last step, or on the hot disc
    if (!this.firing()) {
        return false;
    }
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var dx = piece.x + piece.width / 2 - W / 2, dy = piece.y + piece.height / 2 - H / 2, reach = piece.width / 2;
    var r = Math.sqrt(dx * dx + dy * dy);
    if (r < RADAR_CORE * H / 2 + reach) {
        return true;
    }
    var phi = Math.atan2(dy, dx); // the piece's bearing from the middle, measured as the ray's angle is
    var half = Math.asin(Math.min(1, (RADAR_WIDTH / 2 * (1 - 2 * BEAM_INSET) + reach) / r)); // the ray's half-width
    // at the piece's distance, as an angle: its glow, as a beam's, is forgiven
    var d = ((phi - this.was) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); // how far clockwise of the last angle
    return d <= this.at - this.was + half || d >= Math.PI * 2 - half;
};

Radar.prototype.ray = function (angle, width) { // the ray at `angle`, `width` px thick, from the middle past the corners
    var W = gameArea.canvas.width, H = gameArea.canvas.height, R = this.reach();
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2);
    ctx.lineTo(W / 2 + Math.cos(angle) * R, H / 2 + Math.sin(angle) * R);
    ctx.stroke();
};

Radar.prototype.disc = function (scale) { // the hot disc at the pivot, `scale` of its size
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, RADAR_CORE * H / 2 * scale, 0, Math.PI * 2);
};

Radar.prototype.update = function () { // draw it: the ray's outline where it will start, then the ray coming round with
    // its trail, then fading
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.save();
    ctx.lineCap = "round";
    if (this.absorbedAt !== null) { // absorbed: white, thinning to nothing
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.strokeStyle = COLORS.laserCore;
        this.ray(this.at, Math.max(1, RADAR_WIDTH * (1 - gone)));
    } else if (beatPos < this.fireAt) { // the warning: the ray where it will start, and the disc, dim and thin until its
        // last beat; due within the beat, both hatched
        var look = warnLook(this.fireAt);
        if (look.hatch) {
            ctx.globalAlpha = look.hatch;
            ctx.strokeStyle = laserHatch(tint);
            this.ray(0, RADAR_WIDTH);
            ctx.fillStyle = laserHatch(tint);
            this.disc(1);
            ctx.fill();
        }
        ctx.globalAlpha = look.alpha;
        ctx.strokeStyle = tint;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        this.ray(0, look.width);
        ctx.setLineDash([]);
        ctx.lineWidth = look.width;
        this.disc(1);
        ctx.stroke();
    } else { // burning: the phosphor behind the ray, its glow, a hard white edge, its core, its hot line, and the disc
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var core = RADAR_WIDTH * (1 - 2 * BEAM_INSET); // the core as wide as what can hit
        ctx.globalAlpha = 0.2 * fade;
        ctx.fillStyle = tint;
        ctx.beginPath();
        ctx.moveTo(W / 2, H / 2);
        ctx.arc(W / 2, H / 2, this.reach(), this.at - RADAR_TRAIL, this.at);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.strokeStyle = tint;
        this.ray(this.at, RADAR_WIDTH * 2.2);
        ctx.globalAlpha = EDGE_ALPHA * fade;
        ctx.strokeStyle = COLORS.laserCore;
        this.ray(this.at, core + 2);
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = COLORS.laser;
        this.ray(this.at, core);
        ctx.strokeStyle = COLORS.laserCore;
        this.ray(this.at, RAY_HOT_LINE);
        ctx.fillStyle = COLORS.laser;
        this.disc(1);
        ctx.fill();
        ctx.fillStyle = COLORS.laserCore;
        this.disc(0.5);
        ctx.fill();
    }
    if (this.firing() && moveTrisOn()) { // while it can hit, which way it turns, clockwise: along the ray from the disc
        // out, just off its hot line on the side it is turning to, reaching into its glow
        var base = moveTriBase(RADAR_WIDTH, RAY_HOT_LINE), s = moveTriSize(RADAR_WIDTH * RAY_GLOW / 2 - base);
        var R = this.reach(), r0 = RADAR_CORE * H / 2 + s;
        moveTris(W / 2 + Math.cos(this.at) * r0, H / 2 + Math.sin(this.at) * r0, W / 2 + Math.cos(this.at) * R,
            H / 2 + Math.sin(this.at) * R, this.at + Math.PI / 2, base, s);
    }
    ctx.restore();
};

// The spinning X: two lasers crossing at right angles at a point (ev.pos, as fractions of the screen) and turning about
// it, one way (ev.dir 1, clockwise) or the other (-1), SPIN_TURN beats to the full circle at TRUE's pace. Its outline
// turns already through its warning, harmless, which is how it shows which way it goes; it is an X at its beat, burns
// for its beats (ev.beats) turning on, and hits across what its arms swept since the last step. At a slower pace
// (laserPace) it turns the slower and burns the longer, on past its bar, so as to turn as far: within its life
// (buildTimeline), turning just fast enough for that where it must. Stay in a wedge and turn with it. Overdrive can
// absorb it.
function Spinner(ev, warn) {
    this.cx = ev.pos[0];
    this.cy = ev.pos[1];
    this.dir = ev.dir;
    this.color = ev.color; // "cyan", "magenta" or null
    this.pace = laserPace(); // slower, it takes the longer to turn as far...
    this.turn = Math.min(ev.beats / this.pace, ev.life || Infinity); // ...but has within its life
    this.rate = ev.beats / this.turn; // of TRUE's turning speed, so
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + this.turn;
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0;
    this.at = this.was = this.angle();
}

Spinner.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Spinner.prototype.angle = function () { // where one arm points now, the others a quarter turn on from it: an X at its
    // beat, turned on from there, and back from there through its warning
    return Math.PI / 4 + this.dir * this.rate * Math.PI * 2 * (beatPos - this.fireAt) / SPIN_TURN;
};

Spinner.prototype.step = function () { // on round, keeping where it was: false once its afterglow is gone
    this.was = this.at;
    this.at = this.angle();
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Spinner.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Spinner.prototype.centre = function () {
    return { x: this.cx * gameArea.canvas.width, y: this.cy * gameArea.canvas.height };
};

Spinner.prototype.reach = function () { // px from the pivot to past the furthest corner
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    return Math.sqrt(W * W + H * H) + 20;
};

Spinner.prototype.hits = function (piece) { // on an arm, or on what the arms swept since the last step
    if (!this.firing()) {
        return false;
    }
    var c = this.centre(), dx = piece.x + piece.width / 2 - c.x, dy = piece.y + piece.height / 2 - c.y;
    var r = Math.sqrt(dx * dx + dy * dy), reach = piece.width / 2;
    var half = Math.asin(Math.min(1, (SPIN_WIDTH / 2 * (1 - 2 * BEAM_INSET) + reach) / r)); // an arm's half-width at
    // the piece's distance, as an angle: its glow, as a beam's, is forgiven. Nearer the pivot than that, it is hit
    var quarter = Math.PI / 2; // the arms are a quarter turn apart: one is at every angle a quarter turn from `at`
    var phi = Math.atan2(dy, dx); // the piece's bearing from the pivot, measured as the arms' angles are
    var d = (((phi - this.was) * this.dir) % quarter + quarter) % quarter; // how far on, the way it turns, from where
    // the arm behind the piece was
    return d <= Math.abs(this.at - this.was) + half || d >= quarter - half;
};

Spinner.prototype.arm = function (angle, width) { // the line at `angle` through the pivot, `width` px thick, past the
    // corners both ways
    var c = this.centre(), R = this.reach(), ux = Math.cos(angle) * R, uy = Math.sin(angle) * R;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(c.x - ux, c.y - uy);
    ctx.lineTo(c.x + ux, c.y + uy);
    ctx.stroke();
};

Spinner.prototype.cross = function (width) { // both arms, where they are now
    this.arm(this.at, width);
    this.arm(this.at + Math.PI / 2, width);
};

Spinner.prototype.hub = function (radius) { // the disc at the pivot, as a path
    var c = this.centre();
    ctx.beginPath();
    ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
};

Spinner.prototype.update = function () { // draw it: its outline turning in through its warning, then the X burning as
    // it turns, then fading
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    ctx.save();
    ctx.lineCap = "round";
    if (this.absorbedAt !== null) { // absorbed: white, thinning to nothing
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.strokeStyle = COLORS.laserCore;
        this.cross(Math.max(1, SPIN_WIDTH * (1 - gone)));
    } else if (beatPos < this.fireAt) { // the warning: the X where it is, turning, and its pivot, dim and thin until its
        // last beat; due within the beat, the arms hatched
        var look = warnLook(this.fireAt);
        if (look.hatch) {
            ctx.globalAlpha = look.hatch;
            ctx.strokeStyle = laserHatch(tint);
            this.cross(SPIN_WIDTH);
        }
        ctx.globalAlpha = look.alpha;
        ctx.strokeStyle = tint;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        this.cross(look.width);
        ctx.setLineDash([]);
        ctx.lineWidth = look.width;
        this.hub(SPIN_WIDTH);
        ctx.stroke();
    } else { // burning: the arms' glow, a hard white edge, their core and their hot line, and the pivot
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var core = SPIN_WIDTH * (1 - 2 * BEAM_INSET); // the core as wide as what can hit
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.strokeStyle = tint;
        this.cross(SPIN_WIDTH * 2.2);
        ctx.globalAlpha = EDGE_ALPHA * fade;
        ctx.strokeStyle = COLORS.laserCore;
        this.cross(core + 2);
        ctx.globalAlpha = 0.95 * fade;
        ctx.strokeStyle = COLORS.laser;
        this.cross(core);
        ctx.strokeStyle = COLORS.laserCore;
        this.cross(RAY_HOT_LINE);
        ctx.fillStyle = COLORS.laser;
        this.hub(SPIN_WIDTH);
        ctx.fill();
        ctx.fillStyle = COLORS.laserCore;
        this.hub(SPIN_WIDTH / 2);
        ctx.fill();
    }
    if (this.firing() && moveTrisOn()) { // while it can hit, which way it turns: along each of its four arms from the hub,
        // just off its hot line on the side it is turning to, reaching into its glow
        var base = moveTriBase(SPIN_WIDTH, RAY_HOT_LINE), s = moveTriSize(SPIN_WIDTH * RAY_GLOW / 2 - base);
        var c = this.centre(), R = this.reach(), r0 = SPIN_WIDTH + s;
        for (var k = 0; k < 4; k++) {
            var a = this.at + k * Math.PI / 2;
            moveTris(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0, c.x + Math.cos(a) * R, c.y + Math.sin(a) * R,
                a + this.dir * Math.PI / 2, base, s);
        }
    }
    ctx.restore();
};

// A pendulum: a band across the screen swinging from one height (ev.pos, its top as a fraction) to another (ev.to)
// and back over its beats at TRUE's pace, firing wherever it is on each beat for BEAM_FIRE, moving as it burns, so it
// hits across what it swept since the last step. At a slower pace (laserPace) it takes the longer to swing there and
// back, on past its bar, firing on every beat of it: within its life (buildTimeline), swinging just fast enough for
// that where it must. Its outline shows from `fire - warn` at its start, with its other end marked, and it fades
// after its last beat. Overdrive can absorb it.
function Pendulum(ev, warn) {
    this.from = ev.pos;
    this.to = ev.to;
    this.size = ev.size;
    this.color = ev.color; // "cyan", "magenta" or null
    this.pace = laserPace(); // slower, it takes the longer to swing there and back...
    this.turn = Math.min(ev.beats / this.pace, ev.life || Infinity); // ...but has within its life
    this.burns = Math.ceil(this.turn - 1e-9); // one on each beat of it
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + this.burns - 1 + BEAM_FIRE; // its last beat's burn
    this.absorbedAt = null;
    this.fit();
}

Pendulum.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Pendulum.prototype.placeAt = function (t) { // its top, as a fraction, t beats after its beat: there and back over its
    // turn
    t = Math.max(0, Math.min(1, t / this.turn));
    return this.from + (this.to - this.from) * (0.5 - 0.5 * Math.cos(Math.PI * 2 * t));
};

Pendulum.prototype.place = function () { // its top now, as a fraction
    return this.placeAt(beatPos - this.fireAt);
};

Pendulum.prototype.reach = function () { // the span its burns still to come will cover, [top, bottom] in px: each from
    // where it is on its beat (or now, in one under way) to where it is BEAM_FIRE on, the swing going one way through
    // any one burn; null once the last is over
    var now = beatPos - this.fireAt, lo = Infinity, hi = -Infinity;
    for (var k = Math.max(0, Math.floor(now)); k < this.burns; k++) {
        var a = Math.max(k, now), b = k + BEAM_FIRE;
        if (a < b) {
            var pa = this.placeAt(a), pb = this.placeAt(b);
            lo = Math.min(lo, pa, pb);
            hi = Math.max(hi, pa, pb);
        }
    }
    var H = gameArea.canvas.height;
    return lo <= hi ? [lo * H, (hi + this.size) * H] : null;
};

Pendulum.prototype.drawPath = function (strength) { // the ground its swing will still burn across, washed faintly in its
    // colour the whole width, its far edges dashed, so where it swings to reads before it gets there
    var span = this.reach();
    if (!span) {
        return;
    }
    var W = gameArea.canvas.width, tint = this.color ? COLORS[this.color] : COLORS.laser;
    pathFill(tint, strength, [[0, span[0], W, span[1] - span[0]]]);
    ctx.globalAlpha = PATH_EDGE * strength;
    ctx.strokeStyle = tint;
    ctx.lineWidth = 1;
    ctx.setLineDash(PATH_DASH);
    pathEdge(0, Math.round(span[0]) + 0.5, W, Math.round(span[0]) + 0.5);
    pathEdge(0, Math.round(span[1]) - 0.5, W, Math.round(span[1]) - 0.5);
    ctx.setLineDash([]);
};

Pendulum.prototype.fit = function () { // its rectangle on this window, where it has swung to
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    this.x = 0;
    this.width = W;
    this.height = this.size * H;
    this.y = this.lastY = this.place() * H;
};

Pendulum.prototype.step = function () { // on along its swing, keeping where it was: false once its afterglow is gone
    this.lastY = this.y;
    this.y = this.place() * gameArea.canvas.height;
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Pendulum.prototype.firing = function () { // on a beat of its swing, for BEAM_FIRE after it
    if (this.absorbedAt !== null || beatPos < this.fireAt || beatPos >= this.endAt) {
        return false;
    }
    var t = beatPos - this.fireAt;
    return t - Math.floor(t) < BEAM_FIRE;
};

Pendulum.prototype.hits = function (piece) { // across the band, or anything it swept since the last step
    if (!this.firing()) {
        return false;
    }
    var inset = this.height * BEAM_INSET;
    var top = Math.min(this.y, this.lastY) + inset, bottom = Math.max(this.y, this.lastY) + this.height - inset;
    return !(piece.y + piece.height < top || piece.y > bottom);
};

Pendulum.prototype.band = function (inset) { // the band, `inset` px off each long side
    ctx.fillRect(0, this.y + inset, gameArea.canvas.width, Math.max(1, this.height - 2 * inset));
};

Pendulum.prototype.update = function () { // draw it: its outline swinging, burning on each beat, then fading, over the
    // ground its swing has still to burn across
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.save();
    if (this.absorbedAt === null && beatPos < this.endAt) {
        this.drawPath(beatPos < this.fireAt ? pathLook(this.fireAt) : 1);
    }
    if (this.absorbedAt !== null) { // absorbed: white, narrowing to its middle line as it goes
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.fillStyle = COLORS.laserCore;
        this.band(this.height * 0.5 * gone);
    } else if (beatPos < this.endAt && !this.firing()) { // between burns, and before its first: an outline on its way,
        // dim and thin until the last beat before its first burn, and hatched once due within a beat, which between
        // burns it always is, its next burn being the next beat
        var next = beatPos < this.fireAt ? this.fireAt : this.fireAt + Math.ceil(beatPos - this.fireAt);
        var look = warnLook(next);
        if (beatPos < this.fireAt) { // its other end, where it will swing to, dashed
            ctx.globalAlpha = look.alpha * 0.5;
            ctx.strokeStyle = tint;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 6]);
            ctx.strokeRect(1, this.to * H + 1, W - 2, this.height - 2);
        }
        ctx.globalAlpha = look.wash;
        ctx.fillStyle = tint;
        this.band(0);
        if (look.hatch) {
            ctx.globalAlpha = look.hatch;
            ctx.fillStyle = laserHatch(tint);
            this.band(0);
        }
        ctx.globalAlpha = look.alpha;
        ctx.strokeStyle = tint;
        ctx.lineWidth = look.width;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        ctx.strokeRect(1, this.y + 1, W - 2, this.height - 2);
    } else { // burning, on a beat, or its afterglow after the last: the glow, the core that can hit with a hard edge,
        // and a hot line down it
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var inset = this.height * BEAM_INSET;
        ctx.globalAlpha = GLOW_ALPHA * fade;
        ctx.fillStyle = tint;
        this.band(0);
        ctx.globalAlpha = 0.95 * fade;
        ctx.fillStyle = COLORS.laser;
        this.band(inset);
        ctx.fillStyle = COLORS.laserCore;
        this.band((this.height - Math.min(this.height * 0.2, BEAM_CORE_MAX)) / 2);
        ctx.globalAlpha = EDGE_ALPHA * fade;
        ctx.fillRect(0, this.y + inset, W, 1);
        ctx.fillRect(0, this.y + this.height - inset - 1, W, 1);
    }
    if (this.firing() && moveTrisOn()) { // while a burn can hit, which way it swings: along its middle. It burns from a
        // beat, the swing's turns among them, so the way is read a moment on, the way it is going from there
        var v = (this.to - this.from) * Math.sin(Math.PI * 2 * (beatPos - this.fireAt + 0.05) / this.turn);
        var mid = this.y + this.height / 2, base = moveTriBase(this.height, Math.min(this.height * 0.2, BEAM_CORE_MAX));
        moveTris(0, mid, W, mid, v >= 0 ? Math.PI / 2 : -Math.PI / 2, base,
            moveTriSize(this.height * (1 - 2 * BEAM_INSET) / 2 - base - 2));
    }
    ctx.restore();
};

// A drifting laser (the piano roll's, the swarm's): a small laser that comes in at the right edge on its beat and
// crosses to the left over DRIFT_BEATS at TRUE's pace, longer at a slower difficulty's (laserPace), steadily, its
// length in step with its pace so it takes as long to pass a place either way, burning the whole way, as a corridor
// burns its bar, so the way through is found by looking ahead rather than by reacting; a fading trail behind it shows
// the way it goes. Its warning, the level's, is an arrow at the right edge at its height, pointing in. Its rectangle
// is its place (x, y, width, height), refitted every step. It goes at the gate into a laser section, and at the
// level's end (ev.life, buildTimeline), fading where it stands as a beam's afterglow does. Overdrive can't absorb one:
// the piece passes through it unhurt and gains nothing, as a swarm would otherwise pay out by the screenful (and bring
// a boss down)
function Drifter(ev, warn) {
    this.pos = ev.pos; // its top, as a fraction of the height
    this.size = ev.size; // its height, as a fraction of the height
    this.len = ev.len; // its length, as a fraction of the width, at TRUE's pace
    this.pace = laserPace();
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + Math.min(DRIFT_BEATS * (1 / this.pace + this.len), ev.life === undefined ? Infinity : ev.life);
    // off the left edge, or its time up
    this.fit();
}

Drifter.prototype.fit = function () { // its rectangle on this window, where it has got to: held where it stands once
    // its time is up
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    this.x = W * (1 - this.pace * Math.max(0, Math.min(beatPos, this.endAt) - this.fireAt) / DRIFT_BEATS);
    this.y = this.pos * H;
    this.width = this.len * this.pace * W;
    this.height = this.size * H;
};

Drifter.prototype.step = function () { // false once its time is up and its afterglow gone
    this.fit();
    return beatPos < this.endAt + BEAM_FADE;
};

Drifter.prototype.firing = function () {
    return beatPos >= this.fireAt && beatPos < this.endAt;
};

Drifter.prototype.core = function () { // what can hit: all of it but a forgiven edge
    var e = DRIFT_INSET * Math.min(this.width, this.height);
    return { x: this.x + e, y: this.y + e, width: this.width - 2 * e, height: this.height - 2 * e };
};

Drifter.prototype.hits = function (piece) {
    if (!this.firing()) {
        return false;
    }
    this.fit();
    return piece.crashWith(this.core());
};

Drifter.prototype.update = function () { // draw it: its arrow at the edge, then the laser drifting with its trail,
    // fading where it stands if its time is up short of the far edge
    var W = gameArea.canvas.width;
    this.fit();
    ctx.save();
    if (beatPos < this.fireAt) {
        driftArrow(this.y, this.height, this.fireAt);
    } else {
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var trail = W * this.pace / DRIFT_BEATS * DRIFT_TRAIL;
        ctx.globalAlpha = 0.4 * fade;
        ctx.fillStyle = fadeGradient(COLORS.laser, this.x + this.width, 0, this.x + this.width + trail, 0);
        ctx.fillRect(this.x + this.width, this.y + this.height * 0.25, trail, this.height * 0.5);
        driftBurn(this, fade);
    }
    ctx.restore();
};

function driftArrow(y, h, fireAt) { // a drifting laser's warning, or a mine's: an arrow at the right edge at its
    // height, pointing in, and the edge marked as high as what is coming, sharpening as it comes due
    var W = gameArea.canvas.width, look = warnLook(fireAt), a = Math.max(8, Math.min(DRIFT_ARROW, h * 1.2));
    ctx.globalAlpha = look.alpha;
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth = 1 + look.width;
    ctx.beginPath();
    ctx.moveTo(W - 2, y);
    ctx.lineTo(W - 2, y + h);
    ctx.stroke();
    ctx.globalAlpha = look.alpha * 0.9;
    ctx.fillStyle = COLORS.laser;
    ctx.beginPath();
    ctx.moveTo(W - 8 - a, y + h / 2);
    ctx.lineTo(W - 8, y + h / 2 - a / 2);
    ctx.lineTo(W - 8, y + h / 2 + a / 2);
    ctx.closePath();
    ctx.fill();
}

function driftBurn(r, fade) { // a small laser burning over r ({ x, y, width, height }): its glow, its core with a hard
    // white edge where what can hit ends, and a hot white line along it
    var e = DRIFT_INSET * Math.min(r.width, r.height);
    var c = { x: r.x + e, y: r.y + e, w: r.width - 2 * e, h: r.height - 2 * e }, t = Math.max(2, Math.min(c.w, c.h) * 0.28);
    ctx.globalAlpha = GLOW_ALPHA * 1.4 * fade;
    ctx.fillStyle = COLORS.laser;
    ctx.fillRect(r.x, r.y, r.width, r.height);
    ctx.globalAlpha = 0.95 * fade;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = COLORS.laserCore;
    if (c.w >= c.h) {
        ctx.fillRect(c.x + 2, c.y + (c.h - t) / 2, Math.max(1, c.w - 4), t);
    } else {
        ctx.fillRect(c.x + (c.w - t) / 2, c.y + 2, t, Math.max(1, c.h - 4));
    }
    ctx.globalAlpha = EDGE_ALPHA * fade;
    ctx.strokeStyle = COLORS.laserCore;
    ctx.lineWidth = 1;
    ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
}

// A mine (the mines): a laser waiting to go off. It comes in at the right edge, its warning an arrow there as a
// drifting laser's is, and drifts across with them, harmless until its beat: a diamond, with the cross it will fire
// outlined round it, faint until its last beat, then sharpening and hatched as any warning does, and its fuse, a ring,
// closing in on it over the last MINE_FUSE beats. On its beat (ev.fire, ev.drift beats after it came in) it bursts
// where it has got to, into a cross of two short lasers MINE_ARM each way, burning and fading as a beam does: where to
// be is a matter of when as well as where. Its place is its middle (cx, cy), not a box, so a death by it draws it again
// (death.js). Overdrive can absorb its burst, as a beam's. It goes at the gate into a laser section, and at the level's
// end, as the drifting lasers do: one due to burst after either is never dealt (buildTimeline)
function Mine(ev, warn) {
    this.pos = ev.pos; // its height, as a fraction: its burst's middle
    this.enterAt = ev.fire - ev.drift;
    this.fireAt = ev.fire;
    this.warnAt = ev.fire - warn; // its arrow, the level's warning ahead of its coming in
    this.endAt = ev.fire + BEAM_FIRE;
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0; // nothing to run into by the plain test: hits does the work
    this.pace = laserPace(); // slower, it bursts nearer the edge it came in at
    this.fit();
}

Mine.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Mine.prototype.fit = function () { // where it is now, in px, held where it bursts once it has
    this.cx = gameArea.canvas.width
        * (1 - this.pace * Math.max(0, Math.min(beatPos, this.fireAt) - this.enterAt) / DRIFT_BEATS);
    this.cy = this.pos * gameArea.canvas.height;
};

Mine.prototype.step = function () { // false once its afterglow is gone, or it has been absorbed
    this.fit();
    if (this.absorbedAt !== null) {
        return beatPos < this.absorbedAt + BEAM_ABSORB;
    }
    return beatPos < this.endAt + BEAM_FADE;
};

Mine.prototype.firing = function () {
    return this.absorbedAt === null && beatPos >= this.fireAt && beatPos < this.endAt;
};

Mine.prototype.arms = function (inset) { // its cross: the arm across and the arm down, `inset` px off their long sides
    var H = gameArea.canvas.height, arm = MINE_ARM * H, w = MINE_WIDTH * H;
    return [{ x: this.cx - arm, y: this.cy - w / 2 + inset, width: 2 * arm, height: w - 2 * inset },
        { x: this.cx - w / 2 + inset, y: this.cy - arm, width: w - 2 * inset, height: 2 * arm }];
};

Mine.prototype.hits = function (piece) { // only while it bursts, and only its arms' cores: their glow is forgiven
    if (!this.firing()) {
        return false;
    }
    this.fit();
    return this.arms(MINE_WIDTH * gameArea.canvas.height * BEAM_INSET).some(function (r) { return piece.crashWith(r); });
};

Mine.prototype.update = function () { // draw it: its arrow, then the mine drifting, then its burst and afterglow
    this.fit();
    ctx.save();
    if (this.absorbedAt !== null) { // absorbed: white, narrowing to its middle lines as it goes
        var gone = Math.min(1, (beatPos - this.absorbedAt) / BEAM_ABSORB);
        ctx.globalAlpha = 0.9 * (1 - gone);
        ctx.fillStyle = COLORS.laserCore;
        this.arms(MINE_WIDTH * gameArea.canvas.height * 0.5 * gone).forEach(function (r) {
            ctx.fillRect(r.x, r.y, Math.max(1, r.width), Math.max(1, r.height));
        });
    } else if (beatPos < this.enterAt) {
        driftArrow(this.cy - MINE_BODY, 2 * MINE_BODY, this.enterAt);
    } else if (beatPos < this.fireAt) {
        this.drawWaiting();
    } else {
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        this.arms(0).forEach(function (r) { driftBurn(r, fade); });
    }
    ctx.restore();
};

Mine.prototype.drawWaiting = function () { // drifting: the cross it will fire, outlined and washed, hatched in its last
    // beat; its fuse closing in over the last MINE_FUSE; and its body, a diamond, its middle lit
    var look = warnLook(this.fireAt), H = gameArea.canvas.height, arm = MINE_ARM * H, w = MINE_WIDTH * H / 2;
    var cx = this.cx, cy = this.cy, arms = this.arms(0), left = this.fireAt - beatPos;
    var outline = [[-w, -arm], [w, -arm], [w, -w], [arm, -w], [arm, w], [w, w], [w, arm], [-w, arm], [-w, w], [-arm, w],
        [-arm, -w], [-w, -w]];
    ctx.globalAlpha = look.wash;
    ctx.fillStyle = COLORS.laser;
    arms.forEach(function (r) { ctx.fillRect(r.x, r.y, r.width, r.height); });
    if (look.hatch) {
        ctx.globalAlpha = look.hatch;
        ctx.fillStyle = laserHatch(COLORS.laser);
        arms.forEach(function (r) { ctx.fillRect(r.x, r.y, r.width, r.height); });
    }
    ctx.globalAlpha = look.alpha;
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth = look.width;
    ctx.beginPath();
    outline.forEach(function (p, i) {
        if (i == 0) {
            ctx.moveTo(cx + p[0], cy + p[1]);
        } else {
            ctx.lineTo(cx + p[0], cy + p[1]);
        }
    });
    ctx.closePath();
    ctx.stroke();
    if (left < MINE_FUSE) { // the fuse
        ctx.globalAlpha = 0.5 + 0.5 * look.near;
        ctx.lineWidth = 2;
        ctx.strokeStyle = COLORS.laserCore;
        ctx.beginPath();
        ctx.arc(cx, cy, MINE_BODY + 4 + MINE_FUSE_R * left / MINE_FUSE, 0, 2 * Math.PI);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.bg;
    ctx.strokeStyle = COLORS.laser;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - MINE_BODY);
    ctx.lineTo(cx + MINE_BODY, cy);
    ctx.lineTo(cx, cy + MINE_BODY);
    ctx.lineTo(cx - MINE_BODY, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 0.6 + 0.4 * look.near;
    ctx.fillStyle = COLORS.laserCore;
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
};

// A gate: the bar line where the form switches. A white line sweeps in from the right edge to reach the piece on its
// beat, saying what to press and what it switches to; SPACE on the beat passes it (loop.js), and it flashes out from
// the piece. Unpassed, it runs on by, and stays until its beat is closed, as a target does. Nothing to run into either.
function Gate(ev, lead) {
    this.to = ev.to; // "laser" or "wave"
    this.fireAt = ev.fire;
    this.warnAt = ev.fire - lead;
    this.hitAt = null; // the beat it was passed on, and where
    this.hitX = 0;
    this.x = this.y = this.width = this.height = 0;
}

Gate.prototype.hits = function () {
    return false;
};

Gate.prototype.step = function () { // false once its flash is over, or, unpassed, once it has gone by and its beat is
    // closed
    if (this.hitAt !== null) {
        return beatPos < this.hitAt + GATE_GONE;
    }
    return beatPos < this.fireAt + GATE_GONE || beatOpen(this.fireAt);
};

Gate.prototype.update = function () {
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.save();
    ctx.fillStyle = COLORS.laserCore;
    if (this.hitAt !== null) { // passed: a flash of white spreading out from the piece
        var f = Math.min(1, (beatPos - this.hitAt) / GATE_GONE);
        var half = 16 + 240 * f;
        ctx.globalAlpha = 0.45 * (1 - f);
        ctx.fillRect(this.hitX - half, 0, 2 * half, H);
        ctx.restore();
        return;
    }
    var px = gamePiece.x + gamePiece.width / 2;
    var t = (beatPos - this.warnAt) / (this.fireAt - this.warnAt);
    var gx = W - (W - px) * t; // on the piece on its beat, and on past it if it isn't passed
    var a = (0.3 + 0.7 * Math.min(1, t)) * (t > 1 ? Math.max(0, 1 - (beatPos - this.fireAt) / GATE_GONE) : 1);
    ctx.globalAlpha = 0.15 * a;
    ctx.fillRect(gx - 14, 0, 28, H);
    ctx.globalAlpha = 0.9 * a;
    ctx.fillRect(gx - 2, 0, 4, H);
    ctx.globalAlpha = a;
    ctx.font = "bold 18px Arial";
    ctx.fillText(inputMode == "touch" ? "TAP GATE" : actionKey("gate"), gx + 12, H - 92);
    ctx.font = "15px Arial";
    ctx.fillText(this.to == "laser" ? "TO LASER" : "TO WAVE", gx + 12, H - 72);
    ctx.restore();
};
