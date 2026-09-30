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
var PINCER_GAP = 0.2; // of the height: the gap a pincer leaves at its note, between its two beams
var CAGE_GAP = 0.2; // of the width: the cell a cage leaves at the bass's note, between its two beams down the screen
var CAGE_LEFT = 0.2, CAGE_RIGHT = 0.8; // where the bass's lowest note and its highest put that cell's middle
var CORRIDOR_GAP = 0.3; // of the height: the gap between a corridor's walls
var CORRIDOR_BEAT = 0.25; // of the width a beat of a corridor's path takes up on the screen: a bar of it is the screen
var CORRIDOR_NOW = 0.25; // where across the screen, as a fraction of the width, a corridor's present is: what is to the
                         // right is still to come, scrolling in, and what is to the left has gone by
var CORRIDOR_INSET = 0.12; // of the gap forgiven at each wall's edge: a graze is forgiven, as a beam's glow is
var CROSSFIRE_SPREAD = 0.4; // of the width: how far from the column it closes on a crossfire's pair of columns starts
var RIPPLE_SIZE = 0.065; // of the height: a ripple's thin beams
var SWEEP_BEATS = BEATS_PER_BAR; // beats a sweeper takes to wipe across the screen: the bar
var SWEEP_GAP = 0.3; // of the height: the hole in a sweeper, at its note, to be in as it comes by
var SWEEP_FADE = 0.25; // of the hole the band dissolves over at each of its edges, so the hole reads as a gap in the
                       // light rather than a cut through it; the edge a graze is forgiven (BEAM_INSET) lies inside it
var RADAR_BEATS = BEATS_PER_BAR; // beats a radar's ray takes to come round: once a bar
var RADAR_WIDTH = 14; // px: the ray's core; its glow is wider
var RADAR_CORE = 0.06; // of the height across: the hot disc at the ray's pivot, burning throughout
var RADAR_TRAIL = 0.5; // radians of phosphor drawn behind the ray, which is only light
var CHASE_LOCK = 0.5; // beats before its beat a chaser stops following the piece's height
var CLOSE_LEAD = BEATS_PER_BAR; // beats closing walls take to slide in from the edges
var PENDULUM_BEATS = BEATS_PER_BAR; // beats a pendulum takes to swing there and back
var RING_R = 0.3; // of the height: a ring's radius when it fires
var RING_WIDTH = 12; // px: a ring's core; its glow is wider
var DIAGONAL_TILT = Math.PI / 4; // radians a diagonal leans, one way or the other
var SPIN_BEATS = BEATS_PER_BAR; // beats the spinning X burns for: the bar
var SPIN_TURN = 2 * BEATS_PER_BAR; // beats it takes to come full circle, so it turns half way round over its bar
var SPIN_WIDTH = 14; // px: each of its arms' core; their glow is wider
var SPIN_LEFT = 0.3, SPIN_RIGHT = 0.7; // where across the screen the bass's lowest note and its highest put its pivot,
                                       // kept in from the edges so every wedge of it has room
var SPIN_TOP = 0.3, SPIN_BOTTOM = 0.7; // and where down it the tune's highest note and its lowest do
var FILL_SIZE = RIPPLE_SIZE; // a fill's thin beams

// The levels: five acts of five (ACTS, story.js), each act a band of the spectrum and a song (SONGS, music.js). name
// and lore: what its card says before it is played, the lore a line or two. bpm is the tempo; bars is how long the
// level runs after the count-in; warn is how many beats ahead a beam shows its outline; phrases is what the level's
// bars are drawn from (a repeat makes that one more common, and the draw being seeded, the order decides which bars
// get which; an entry "a+b" is a combination, both phrases dealt into one bar, which is how the later levels make
// patterns of their own out of the types before them: a box from a pincer and a cage, a crosshair from a ring and a
// diagonal; a corridor goes with nothing, as its gap is the only place to be and a cage or a pincer across it shuts
// it, which .claude/safegap.js is there to catch); colors is the colour patterns its bars are painted from
// (see COLOR_PATTERNS), none for a colourless level; laser is the bars played in laser form, as [first bar, bars]
// pairs, each opened and closed by a gate; targets is what those bars are drawn from (TARGET_PHRASES); dodges is how
// many lasers each of them fires across the path between its targets, at most. boss, if given ({ name, kind }), makes
// the level a fight with the Array (boss.js): its targets are the boss's health, and its kind is its signature,
// "node", "twin", "radar", "chaser" or "mirror"; the level does not end while the boss stands, but goes round again
// from the bar before its last laser section (loopFrom) until it falls.
//
// The curve climbs a step at a time, bringing in one thing at once and letting it settle before the next: the melody's
// beams, then fallers and a beam on every beat (2), then laser form (3), pincers (4) and the cage (5); colours (6),
// walls (7), the corridor (8), colours in pairs (9); beams down
// the screen and their mirrors (11), ripples and the radar (12), marching columns, crossfire and shorter warnings (13),
// sweepers (14); colours on every beat, off-beats and segments (16), chords, pendulums and two laser sections (17),
// double taps, closing walls, two beams at once and a second laser to dodge (18), chasers and stutters (19), rings,
// diagonals and the spinning X (20); fills (21) and the shortest warnings (22). The tempo climbs from 96 to 132.
const LEVELS = [null,
    // Act I, Infrared: the beat, the melody, and laser form
    { name: "Signal",
        lore: ["Beneath the red, a carrier wave wakes.", "The lasers fire where the melody goes. Listen."],
        bpm: 96, bars: 10, warn: 2, phrases: ["melody", "melody", "rest"], colors: [], laser: [] },
    { name: "Carrier", lore: ["Some lasers drop in from above now: they land on their outline, and fire from it on the beat.",
            "Every beat is a door, and every door opens on the beat."],
        bpm: 98, bars: 10, warn: 2, phrases: ["fall", "rain", "melody", "rest"], colors: [], laser: [] },
    { name: "Ember Line", lore: ["A white gate burns ahead. Cross it on the beat,", "and the wave becomes a beam."],
        bpm: 99, bars: 12, warn: 2, phrases: ["rest", "melody", "fall", "rain"], colors: [], laser: [[5, 3]],
        targets: ["tune"], dodges: 0 },
    { name: "Heat Haze", lore: ["Two lasers close on every note now: sit in the gap between them.",
            "The targets sing the chorus. Line up with each note, and strike it."],
        bpm: 101, bars: 12, warn: 2, phrases: ["rain", "melody", "rest", "pincer", "fall"], colors: [], laser: [[4, 4]],
        targets: ["tune", "hold"], dodges: 0 },
    { name: "Red Giant",
        lore: ["The lasers close a cage on every note now, from all four sides. Get inside it.",
            "The Array's first watchtower glows like a dying star.", "Get past it, and the heat gives way."],
        bpm: 102, bars: 14, warn: 2, phrases: ["melody", "cage", "pincer", "pincer+cage", "fall", "rain", "rest"], colors: [],
        laser: [[6, 4]], boss: { name: "RED GIANT", kind: "node" },
        targets: ["tune", "hold", "jump"], dodges: 1 },
    // Act II, Sodium: the colours, and walls
    { name: "Streetlight", lore: ["Two colours now: cyan answers cyan, and magenta magenta."],
        bpm: 104, bars: 12, warn: 2, phrases: ["melody", "rain", "fall", "rest"], colors: ["solid"], laser: [[5, 3]],
        targets: ["tune", "hold"], dodges: 0 },
    { name: "Amber Alert", lore: ["The Array raises walls of light.", "The melody knows where the gap is."],
        bpm: 105, bars: 14, warn: 2, phrases: ["rain", "wall", "pincer", "rest", "melody"], colors: ["solid"], laser: [[6, 4]],
        targets: ["tune", "hold", "jump"], dodges: 1 },
    { name: "Sodium Rain", lore: ["A corridor of light scrolls in, a bar long: ride its gap, which rides the melody.",
            "Orange light falls in sheets. Keep moving."],
        bpm: 107, bars: 14, warn: 2, phrases: ["rain", "wall", "corridor", "melody", "cage"], colors: ["solid"], laser: [[6, 4]],
        targets: ["tune", "steps", "jump"], dodges: 1 },
    { name: "Afterglow", lore: ["The colours come in pairs now: change keys on the half bar."],
        bpm: 108, bars: 14, warn: 2, phrases: ["cage", "fall", "pincer+cage", "rest", "melody", "rain", "wall"], colors: ["solid", "pairs"],
        laser: [[6, 4]], targets: ["tune", "steps", "jump"], dodges: 1 },
    { name: "Interference", lore: ["Signals collide at the edge of the amber city.", "Hold your frequency."],
        bpm: 110, bars: 16, warn: 2, phrases: ["wall", "corridor", "corridor", "pincer+cage", "rest", "rain", "melody"], colors: ["solid", "pairs"],
        laser: [[3, 3], [8, 3]], boss: { name: "INTERFERENCE", kind: "twin" }, targets: ["tune", "hold", "steps", "jump"], dodges: 1 },
    // Act III, Phosphor: beams down the screen, columns, and less warning
    { name: "Phosphor", lore: ["Beams fall down the screen as well as across it. Look up.",
            "And every beam has its mirror image now: they close on the middle."],
        bpm: 111, bars: 14, warn: 2, phrases: ["rain", "wall", "cross", "cage+melody", "mirror", "melody"], colors: ["solid", "pairs"],
        laser: [[6, 4]], targets: ["tune", "steps", "zigzag"], dodges: 1 },
    { name: "Radar Sweep", lore: ["The sweep comes round every bar, from the middle. It is looking for you:",
            "keep ahead of it. Thin beams run in fours too, quick as a scale."],
        bpm: 113, bars: 14, warn: 2, phrases: ["cross", "cage+melody", "rain", "radar", "wall", "melody", "ripple", "pincer"],
        colors: ["solid", "pairs"],
        laser: [[6, 4]], targets: ["tune", "steps", "zigzag"], dodges: 1 },
    { name: "Oscilloscope",
        lore: ["Columns march across the screen, and the warnings come later.", "Step between them.",
            "Crossfire closes in from both sides on the half beats: slip out before it meets."],
        bpm: 114, bars: 16, warn: 1.5, phrases: ["rain", "cross", "stairs", "crossfire", "crossfire+melody", "mirror", "melody"],
        colors: ["solid", "pairs"],
        laser: [[6, 4]], targets: ["tune", "zigzag", "jump"], dodges: 1 },
    { name: "Green Flash", lore: ["As the sun goes down, the sky flashes green.", "Blink and you miss it.",
            "A wiper sweeps across with a hole at the note: be at its height as it comes by."],
        bpm: 116, bars: 16, warn: 1.5, phrases: ["sweep+cage", "crossfire", "ripple", "rain", "wall", "cross", "sweep", "stairs"],
        colors: ["solid", "pairs"],
        laser: [[7, 4]], targets: ["tune", "steps", "zigzag"], dodges: 1 },
    { name: "Static Bloom", lore: ["Noise blooms across the band. Find the tune inside it."],
        bpm: 117, bars: 18, warn: 1.5,
        phrases: ["rain", "sweep+cage", "ripple", "radar", "cross", "crossfire", "mirror", "wall", "crossfire+melody", "cage+mirror", "stairs", "sweep"],
        colors: ["solid", "pairs"], laser: [[6, 4]], boss: { name: "STATIC BLOOM", kind: "radar" }, targets: ["tune", "steps", "zigzag", "jump"], dodges: 1 },
    // Act IV, Blueshift: colours on every beat, two laser sections, two beams at once
    { name: "Cherenkov", lore: ["Faster than light in water, you glow blue.", "The colours turn on every beat now,",
            "lasers fall on the off-beats, and some cover the bass's half of the screen only."],
        bpm: 119, bars: 16, warn: 1.5, phrases: ["segment", "melody", "offbeat+segment", "rain", "wall", "cross", "stairs", "offbeat"],
        colors: ["solid", "pairs", "alt"], laser: [[6, 4]], targets: ["tune", "steps", "zigzag"], dodges: 1 },
    { name: "Deep Water", lore: ["Two gates in one level. Dive twice.",
            "A chord fires all its notes at once. A pendulum swings the bar through, firing on every beat."],
        bpm: 120, bars: 16, warn: 1.5, phrases: ["pendulum+cage", "mirror", "chord", "pendulum", "rain", "wall", "cross"],
        colors: ["solid", "pairs", "alt"], laser: [[4, 3], [10, 3]], targets: ["tune", "zigzag", "scatter"],
        dodges: 1 },
    { name: "Blueshift", lore: ["The Array fires in pairs, and twice across your line.",
            "Walls slide in from both edges over a bar: be in the gap when they land. Some lasers fire twice."],
        bpm: 122, bars: 18, warn: 1.5, phrases: ["cross", "stairs", "doubletap", "close", "double", "rain", "close+melody", "wall"],
        colors: ["solid", "pairs", "alt"], laser: [[4, 3], [11, 3]], targets: ["tune", "zigzag", "scatter"],
        dodges: 2 },
    { name: "Cold Fire", lore: ["The hottest flames burn blue.",
            "Some lasers hunt your height until the last half beat: move then. Others stutter a whole beat."],
        bpm: 123, bars: 18, warn: 1.5, phrases: ["wall", "rain", "stutter", "cross", "chase+cage", "stairs", "double", "chase"],
        colors: ["pairs", "alt"],
        laser: [[4, 3], [11, 3]], targets: ["tune", "zigzag", "scatter"], dodges: 2 },
    { name: "Overdrive", lore: ["The meter is full, and so is the sky. Spend it on the beat.",
            "Rings now, slants, and a spinning X: be inside a ring or outside it,",
            "off the slant, and in a wedge of the X, turning with it."],
        bpm: 125, bars: 18, warn: 1.5, phrases: ["ring+diagonal", "spin", "ring", "stairs", "diagonal", "double", "melody", "wall", "cross", "rain"],
        colors: ["solid", "pairs", "alt"], laser: [[4, 3], [11, 3]], boss: { name: "OVERDRIVE", kind: "chaser" }, targets: ["steps", "zigzag", "scatter"],
        dodges: 2 },
    // Act V, Ultraviolet: everything, with the shortest warnings
    { name: "Indigo", lore: ["The colour between blue and violet that no one can agree on.",
            "The bar ends in a fill of thin lasers now, as a drummer's does."],
        bpm: 126, bars: 18, warn: 1.5, phrases: ["cross", "fill", "chase", "chase+cage", "stairs", "rain", "double", "ring+diagonal", "wall", "ring"],
        colors: ["pairs", "alt"],
        laser: [[5, 4], [11, 3]], targets: ["tune", "zigzag", "scatter"], dodges: 2 },
    { name: "Black Light",
        lore: ["Invisible light, and everything glows under it.", "The warnings are shorter now. Trust the melody."],
        bpm: 128, bars: 20, warn: 1, phrases: ["spin+ring", "rain", "stutter", "sweep+cage", "wall", "spin", "diagonal", "stairs", "double", "cross", "close", "sweep"],
        colors: ["pairs", "alt"],
        laser: [[5, 4], [12, 4]], targets: ["tune", "zigzag", "scatter"], dodges: 2 },
    { name: "Fluorescence", lore: ["What you take in, you give back brighter."],
        bpm: 129, bars: 20, warn: 1,
        phrases: ["stairs", "chord", "melody", "mirror", "double", "pendulum+cage", "wall", "cross", "pendulum", "doubletap", "cage+mirror"],
        colors: ["pairs", "alt"], laser: [[5, 4], [12, 4]], targets: ["tune", "zigzag", "scatter"], dodges: 2 },
    { name: "Edge of Sight", lore: ["One more band, and the eye gives up.", "Keep climbing."],
        bpm: 131, bars: 22, warn: 1, phrases: ["spin", "double", "offbeat+segment", "fill", "radar", "ring+diagonal", "cross", "segment", "offbeat", "wall", "stairs", "ring"],
        colors: ["pairs", "alt"],
        laser: [[5, 4], [13, 4]], targets: ["zigzag", "scatter", "scatter"], dodges: 2 },
    { name: "Lazer Wave", lore: ["Coherent. In phase. One wavelength, one beat.", "This is what you were made for."],
        bpm: 132, bars: 22, warn: 1, phrases: ["wall", "corridor", "cross", "diagonal", "close", "ring", "chase", "corridor", "ring+diagonal", "spin+ring", "chase+cage", "fill"],
        colors: ["pairs", "alt"], laser: [[5, 4], [13, 4]], boss: { name: "LAZER WAVE", kind: "mirror" }, targets: ["tune", "zigzag", "scatter", "scatter"],
        dodges: 2 },
];

// Laser form (loop.js has the rules). A target slides in from the right edge and reaches TARGET_X on its beat, at
// its height; a gate is a white line sweeping in to the piece, a bar ahead of its beat
var TARGET_X = 0.72; // where a target meets the beam on its beat, as a fraction of the width
var TARGET_R = 0.035; // a target's size, as a fraction of the height
var TARGET_LEAD = 1; // beats more warning than a beam gets: a target has to be lined up with, not just stepped out of
var TARGET_GONE = 0.5; // beats a missed target takes to slide on out; it stays, unseen, while its beat can still be hit
var TARGET_BURST = 0.4; // beats a hit target's burst lasts
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
        // held note's pair holds the gap open for the note
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var top = tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM) - PINCER_GAP / 2; // the gap's top
                top = Math.max(BEAM_SIZE, Math.min(1 - PINCER_GAP - BEAM_SIZE, top));
                add(b0 + i, "h", top - BEAM_SIZE, BEAM_SIZE, { hold: tune.hold[i] });
                add(b0 + i, "h", top + PINCER_GAP, BEAM_SIZE, { hold: tune.hold[i] });
            }
        }
    },
    cage: function (b0, rnd, add, tune) { // four beams at once closing a cell on each note the tune starts: two across,
        // above and below the note's height, as a pincer's, and two down, either side of the bass's note, low on the
        // left and high on the right (bassAt). The two parts of the song place the cell between them, and inside it is
        // the place to be; anywhere off the four beams is safe too. A held note's cage holds for the note
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (tune.onset[i] !== null) {
                var top = tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM) - PINCER_GAP / 2;
                top = Math.max(BEAM_SIZE, Math.min(1 - PINCER_GAP - BEAM_SIZE, top));
                var left = bassAt(tune, i, CAGE_LEFT, CAGE_RIGHT) - CAGE_GAP / 2;
                left = Math.max(BEAM_SIZE_V, Math.min(1 - CAGE_GAP - BEAM_SIZE_V, left));
                var more = { hold: tune.hold[i] };
                add(b0 + i, "h", top - BEAM_SIZE, BEAM_SIZE, more);
                add(b0 + i, "h", top + PINCER_GAP, BEAM_SIZE, more);
                add(b0 + i, "v", left - BEAM_SIZE_V, BEAM_SIZE_V, more);
                add(b0 + i, "v", left + CAGE_GAP, BEAM_SIZE_V, more);
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
        // hole's height as it comes by
        var note = tune.sound[0];
        var hole = note === null ? 0.5 : tuneAt(tune, note, TUNE_TOP, TUNE_BOTTOM);
        hole = Math.max(SWEEP_GAP / 2 + 0.03, Math.min(0.97 - SWEEP_GAP / 2, hole));
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
        // on its last beat either side of the bass's column, a cell's width apart: be in the gap when they land
        var c = bassAt(tune, BEATS_PER_BAR - 1, CAGE_LEFT, CAGE_RIGHT);
        var left = Math.max(BEAM_SIZE_V, Math.min(1 - CAGE_GAP - BEAM_SIZE_V, c - CAGE_GAP / 2));
        add(b0 + BEATS_PER_BAR - 1, "v", left - BEAM_SIZE_V, BEAM_SIZE_V, { kind: "slide", from: -BEAM_SIZE_V, lead: CLOSE_LEAD });
        add(b0 + BEATS_PER_BAR - 1, "v", left + CAGE_GAP, BEAM_SIZE_V, { kind: "slide", from: 1, lead: CLOSE_LEAD });
    },
    pendulum: function (b0, rnd, add, tune) { // a band swinging over the bar from the height of the tune's highest note
        // in it to its lowest and back, at least a quarter of the screen, firing wherever it is on every beat: the bar
        // is its own
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
        // of it, or behind it, round the middle, and off the middle itself. The bar is the ray's alone
        add(b0, "radar", 0, 0, { beats: RADAR_BEATS });
    },
    spin: function (b0, rnd, add, tune) { // the spinning X: two lasers crossing at right angles at the point the bass's
        // column and the bar's first note make, and turning about it the bar through, half way round, one way or the
        // other: stay in your wedge and turn with it. The bar is its alone
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
        // which is at the tune's note where it starts one
        var gap = 0.3, last = null;
        for (var i = 0; i < BEATS_PER_BAR; i += 2) {
            var top = spread(rnd, 0.08, 0.92 - gap, last, 0.2);
            if (tune.onset[i] !== null) {
                var at = tuneAt(tune, tune.onset[i], TUNE_TOP, TUNE_BOTTOM) - gap / 2;
                top = away(Math.max(0.08, Math.min(0.92 - gap, at)), last, 0.2, 0.08, 0.92 - gap);
            }
            last = top;
            add(b0 + i, "h", 0, top);
            add(b0 + i, "h", top + gap, 1 - top - gap);
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

function buildTimeline(n) { // everything the level holds, in beat order: beams { fire, axis, pos, size, color, and a
    // held note's hold or a faller's kind },
    // targets (axis "target", pos their height) and gates (axis "gate", to the form they switch to, color "gate")
    var def = levelDef(n);
    var rnd = seededRandom(n * 9973 + 17);
    var paint = seededRandom(n * 7919 + 101); // the colours' own stream, so painting a level never moves its beams
    var aim = seededRandom(n * 6151 + 29); // and laser form's, so the wave bars around it keep the beams they had
    var laser = laserBars(def);
    var drop = function () {}; // a laser bar still draws its wave phrase, to keep the stream in step, and drops it
    var colors = def.colors || [];
    var b0 = 0, pattern = null; // the bar being filled, and its colours
    var out = [];
    var add = function (fire, axis, pos, size, more) { // a beam off the beat takes the colour of the beat before it;
        // more, if given, is carried on the event (a held note's hold, a faller's kind)
        var c = pattern ? BEAT_COLORS[pattern.charAt(Math.floor(fire) - b0)] : null;
        out.push(Object.assign({ fire: fire, axis: axis, pos: pos, size: size, color: c || null }, more || {}));
    };
    var previous = "rest";
    for (var bar = 0; bar < def.bars; bar++) {
        var name = "rest"; // the first bar is always a rest: the level opens on the beat, not on a laser
        if (bar > 0) {
            do {
                name = def.phrases[Math.floor(rnd() * def.phrases.length)];
            } while (name == "rest" && previous == "rest"); // never two rests running
        }
        previous = name;
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
        name.split("+").forEach(function (part) { // a combination, "a+b", deals both phrases into the bar together
            PHRASES[part](b0, rnd, laser[bar] ? drop : add, tune);
        });
        if (laser[bar]) {
            var targets = def.targets || ["hold"];
            TARGET_PHRASES[targets[Math.floor(aim() * targets.length)]](b0, aim, add, tune);
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
    out = out.filter(function (ev) { // a corridor, a sweeper, a radar, a pendulum or a spinning X only begins on its
        // beat, and stays
        return ev.axis == "corridor" || ev.axis == "sweep" || ev.axis == "radar" || ev.axis == "pendulum"
            || ev.axis == "spin" || !gates.some(function (g) { return g.fire == ev.fire; });
    }).concat(gates);
    out = out.concat(dodgeLasers(out, def, n));
    out.sort(function (a, b) { return a.fire - b.fire; });
    return out;
}

function dodgeLasers(events, def, n) { // laser form's lasers: in each laser bar, up to def.dodges of them, each on a
    // target's beat across the path to the next target, where the two are far enough apart
    var pick = seededRandom(n * 4099 + 53); // a stream of their own, so they never move a target
    var target = {}; // beat -> the target due on it
    events.forEach(function (ev) {
        if (ev.axis == "target") {
            target[ev.fire] = ev;
        }
    });
    var lasers = [];
    for (var bar in laserBars(def)) {
        var b0 = (COUNT_IN_BARS + Number(bar)) * BEATS_PER_BAR;
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

function eventLead(ev, warn) { // how many beats ahead of its beat an event comes on screen: its own, if it has one
    return ev.lead !== undefined ? ev.lead : ev.axis == "gate" ? GATE_LEAD : ev.axis == "target" ? warn + TARGET_LEAD : warn;
}

function makeHazard(ev, warn) { // the thing on screen for a timeline event
    var lead = eventLead(ev, warn);
    return ev.axis == "gate" ? new Gate(ev, lead) : ev.axis == "target" ? new Target(ev, lead)
        : ev.axis == "corridor" ? new Corridor(ev, lead) : ev.axis == "sweep" ? new Sweeper(ev, lead)
        : ev.axis == "radar" ? new Radar(ev, lead) : ev.axis == "pendulum" ? new Pendulum(ev, lead)
        : ev.axis == "ring" ? new Ring(ev, lead) : ev.axis == "diagonal" ? new Diagonal(ev, lead)
        : ev.axis == "spin" ? new Spinner(ev, lead) : new Beam(ev, lead);
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

function warnLook(fireAt) { // how a warning due at beat fireAt is drawn now: near, 0 until WARN_LAST beats before it and
    // 1 on its beat; blink, its flicker, once near; alpha, of full; width, of its line, in px; wash, of the faint fill of
    // its footprint; hatch, of the hatch over it, 0 until it is near
    var near = Math.max(0, Math.min(1, 1 - (fireAt - beatPos) / WARN_LAST));
    var blink = near > 0 && (beatPos * 4) % 1 >= 0.5 ? 0.6 : 1;
    return { near: near, blink: blink, alpha: (WARN_DIM + (1 - WARN_DIM) * near) * blink, width: 1 + 2 * near,
        wash: (0.03 + 0.12 * near) * blink, hatch: near > 0 ? WARN_HATCH * blink : 0 };
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
// a beat, its present at CORRIDOR_NOW: to the right is what is still to come, to the left what has gone by. It warns
// as an outline from `fire - warn`, burns from `fire` to the bar's end across the whole screen, so the piece rides
// four beats of it wherever it stands, and fades for BEAM_FADE. Nothing to run into by the plain test: hits does the
// work, at three points across the piece, forgiving the walls' edges as a beam's glow is (CORRIDOR_INSET). Overdrive
// can absorb it, as it can a beam.
function Corridor(ev, warn) {
    this.path = ev.pos;
    this.gap = ev.size;
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

Corridor.prototype.beatAt = function (x) { // the beat of its path at screen x, now
    return beatPos - this.fireAt + (x / gameArea.canvas.width - CORRIDOR_NOW) / CORRIDOR_BEAT;
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
// ev.gap of it tall) to be in as it comes by; ev.pos is the way it goes, 1 rightward from the left edge, -1 the
// other way. It warns as an outline at the edge it sets out from. Between one step and the next it moves further
// than the piece is wide, so it hits across everything it swept since the last step (lastX). Its sides and its
// hole's edges are forgiven as a beam's glow is (BEAM_INSET). Overdrive can absorb it, as it can a beam.
function Sweeper(ev, warn) {
    this.dir = ev.pos > 0 ? 1 : -1;
    this.size = ev.size; // of the width
    this.color = ev.color; // "cyan", "magenta" or null
    this.hole = ev.hole;
    this.gap = ev.gap;
    this.beats = ev.beats;
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + ev.beats;
    this.absorbedAt = null;
    this.fit();
}

Sweeper.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Sweeper.prototype.crossed = function () { // 0..1: how far across it has come, 0 until its beat
    return Math.max(0, Math.min(1, (beatPos - this.fireAt) / this.beats));
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

Sweeper.prototype.update = function () { // draw it: an outline at its edge, then the band wiping across, then fading
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.save();
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
    this.x = this.y = this.width = this.height = 0; // nothing to run into
}

Target.prototype.hits = function () {
    return false;
};

Target.prototype.step = function () { // false once its burst is over, or, missed, once it has slid out and its beat
    // is closed
    if (this.hitAt !== null) {
        return beatPos < this.hitAt + TARGET_BURST;
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
    // warning is), lit up while the beam is on it; a hit bursts white
    var c = this.center();
    var tint = this.color ? COLORS[this.color] : COLORS.laserCore;
    ctx.save();
    if (this.hitAt !== null) {
        var b = Math.min(1, (beatPos - this.hitAt) / TARGET_BURST);
        ctx.globalAlpha = 1 - b;
        ctx.strokeStyle = tint;
        ctx.lineWidth = 1 + 4 * (1 - b);
        ctx.beginPath();
        ctx.arc(this.hitX, c.y, c.r * (1 + 2.5 * b), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.8 * (1 - b) * (1 - b);
        ctx.fillStyle = COLORS.laserCore;
        ctx.beginPath();
        ctx.arc(this.hitX, c.y, c.r * (1 - b), 0, Math.PI * 2);
        ctx.fill();
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

// A radar: a ray from the middle of the screen, reaching past its corners, that comes round once in its beats,
// clockwise from pointing right, burning the whole way: keep ahead of it, or behind it, round the middle, whose hot
// disc (RADAR_CORE of the height across) burns throughout. It warns as the ray's outline where it will start. Between
// one step and the next the ray turns further, out at the edges, than the piece is wide, so it hits across the arc it
// swept since the last step (was, to at). It leaves a trail of phosphor behind it, which is only light. Nothing to run
// into by the plain test: hits does the work. Overdrive can absorb it, as it can a beam.
function Radar(ev, warn) {
    this.color = ev.color; // "cyan", "magenta" or null
    this.beats = ev.beats;
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + ev.beats;
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0;
    this.raw = this.at = this.was = this.angle(); // raw: where it would be unslowed (step)
}

Radar.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Radar.prototype.angle = function () { // where the ray points now: 0 to the right, and on round clockwise from its beat
    return Math.PI * 2 * Math.max(0, Math.min(1, (beatPos - this.fireAt) / this.beats));
};

Radar.prototype.step = function () { // on round, keeping where it was, at the pace a boss may have slowed it to
    // (bossSlow, boss.js): false once its afterglow is gone
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
        this.ray(this.at, 3);
        ctx.fillStyle = COLORS.laser;
        this.disc(1);
        ctx.fill();
        ctx.fillStyle = COLORS.laserCore;
        this.disc(0.5);
        ctx.fill();
    }
    ctx.restore();
};

// The spinning X: two lasers crossing at right angles at a point (ev.pos, as fractions of the screen) and turning about
// it, one way (ev.dir 1, clockwise) or the other (-1), SPIN_TURN beats to the full circle. Its outline turns already
// through its warning, harmless, which is how it shows which way it goes; it is an X at its beat, burns for its beats
// (ev.beats) turning on, and hits across what its arms swept since the last step. Stay in a wedge and turn with it.
// Overdrive can absorb it.
function Spinner(ev, warn) {
    this.cx = ev.pos[0];
    this.cy = ev.pos[1];
    this.dir = ev.dir;
    this.beats = ev.beats;
    this.color = ev.color; // "cyan", "magenta" or null
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + ev.beats;
    this.absorbedAt = null;
    this.x = this.y = this.width = this.height = 0;
    this.at = this.was = this.angle();
}

Spinner.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Spinner.prototype.angle = function () { // where one arm points now, the others a quarter turn on from it: an X at its
    // beat, turned on from there, and back from there through its warning
    return Math.PI / 4 + this.dir * Math.PI * 2 * (beatPos - this.fireAt) / SPIN_TURN;
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
        this.cross(3);
        ctx.fillStyle = COLORS.laser;
        this.hub(SPIN_WIDTH);
        ctx.fill();
        ctx.fillStyle = COLORS.laserCore;
        this.hub(SPIN_WIDTH / 2);
        ctx.fill();
    }
    ctx.restore();
};

// A pendulum: a band across the screen swinging from one height (ev.pos, its top as a fraction) to another (ev.to)
// and back over its beats, firing wherever it is on each of them for BEAM_FIRE, moving as it burns, so it hits across
// what it swept since the last step. Its outline shows from `fire - warn` at its start, with its other end marked, and
// it fades after its last beat. Overdrive can absorb it.
function Pendulum(ev, warn) {
    this.from = ev.pos;
    this.to = ev.to;
    this.size = ev.size;
    this.color = ev.color; // "cyan", "magenta" or null
    this.beats = ev.beats;
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + ev.beats - 1 + BEAM_FIRE; // its last beat's burn
    this.absorbedAt = null;
    this.fit();
}

Pendulum.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Pendulum.prototype.place = function () { // its top now, as a fraction: there and back over its beats from its beat
    var t = Math.max(0, Math.min(this.beats, beatPos - this.fireAt));
    return this.from + (this.to - this.from) * (0.5 - 0.5 * Math.cos(Math.PI * 2 * t / this.beats));
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

Pendulum.prototype.update = function () { // draw it: its outline swinging, burning on each beat, then fading
    var tint = this.color ? COLORS[this.color] : COLORS.laser;
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.save();
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
    ctx.restore();
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
