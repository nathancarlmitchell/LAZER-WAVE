// Lazer Wave -- the waves. What each level is (its tempo, its length, the phrases it is built from), the phrases
// themselves, the timeline a level is built into, and what it puts on screen: the Beam, a laser that warns, fires on
// the beat, and fades; and for laser form, the Target to hit and the Gate that switches the form.
// index.html loads this with a plain <script src>, as globals rather than modules, so the game still opens straight
// off disk. Nothing here runs at load beyond building the tables.
//
// Time here is in beats, read from beatPos (loop.js), never in steps: a level is a piece of music, and everything in
// it lands on the grid. A level is built from a seeded random stream, so it is the same level every attempt -- a
// rhythm game is learned, and a death should send you back to the same bars, not new ones.
//
// The phrases are the extension point. A phrase fills one bar by calling add(); a new mechanic (a sweeping beam, a
// ring, or the "ride the wave" idea -- a waveform line the piece rides, with lasers crossing it) is a new hazard type
// plus the phrases that place it, and the loop, the beat clock and the judging don't change.

var BEATS_PER_BAR = 4;
var COUNT_IN_BARS = 1; // a bar of clicks before the level proper: time to find the beat
var BEAM_FIRE = 0.5; // beats a beam burns for once it fires
var BEAM_FADE = 0.35; // beats its afterglow takes to go, harmless
var BEAM_SIZE = 0.13; // how much of the screen a horizontal beam covers, as a fraction of the height
var BEAM_SIZE_V = 0.09; // and a vertical one, of the width
var BEAM_CORE_MAX = 8; // px: the white line down a beam's middle, at most
var BEAM_INSET = 0.15; // of a beam's thickness on each side that is glow rather than hitbox: grazes are forgiven
var BEAM_ABSORB = 0.3; // beats an absorbed beam takes to collapse (overdrive, loop.js)

// The levels. bpm is the tempo; bars is how long the level runs after the count-in; warn is how many beats ahead a
// beam shows its outline; phrases is what the level's bars are drawn from (a repeat makes that one more common);
// colors is the colour patterns its bars are painted from (see COLOR_PATTERNS), none for a colourless level; laser
// is the bars played in laser form, as [first bar, bars] pairs, each opened and closed by a gate; targets is what
// those bars are drawn from (TARGET_PHRASES); dodges is how many lasers each of them fires across the path between
// its targets, at most.
const LEVELS = [null,
    { name: "Signal", bpm: 100, bars: 12, warn: 2, phrases: ["rain", "rain", "rest"], colors: [],
        laser: [[6, 4]], targets: ["hold", "jump"], dodges: 1 },
    { name: "Carrier", bpm: 108, bars: 14, warn: 2, phrases: ["rain", "wall", "rain", "rest"], colors: ["solid"],
        laser: [[7, 4]], targets: ["hold", "steps", "jump"], dodges: 1 },
    { name: "Interference", bpm: 116, bars: 16, warn: 1.5, phrases: ["rain", "wall", "cross", "stairs"],
        colors: ["solid", "pairs"], laser: [[6, 4]], targets: ["steps", "zigzag", "jump"], dodges: 1 },
    { name: "Overdrive", bpm: 124, bars: 16, warn: 1.5, phrases: ["rain", "wall", "cross", "stairs", "double"],
        colors: ["solid", "pairs", "alt"], laser: [[4, 3], [11, 3]], targets: ["steps", "zigzag", "scatter"],
        dodges: 2 },
    { name: "Lazer Wave", bpm: 132, bars: 20, warn: 1, phrases: ["wall", "cross", "stairs", "double", "double"],
        colors: ["pairs", "alt"], laser: [[5, 4], [13, 4]], targets: ["zigzag", "scatter", "scatter"], dodges: 2 },
];

// Laser form (loop.js has the rules). A target slides in from the right edge and reaches TARGET_X on its beat, at
// its height; a gate is a white line sweeping in to the piece, a bar ahead of its beat
var TARGET_X = 0.72; // where a target meets the beam on its beat, as a fraction of the width
var TARGET_R = 0.035; // a target's size, as a fraction of the height
var TARGET_LEAD = 1; // beats more warning than a beam gets: a target has to be lined up with, not just stepped out of
var TARGET_GONE = 0.5; // beats a missed target takes to slide on out and go
var TARGET_BURST = 0.4; // beats a hit target's burst lasts
var GATE_LEAD = BEATS_PER_BAR; // a gate shows a bar ahead
var GATE_GONE = 0.5; // beats a gate takes to go after its beat
// A laser to dodge in laser form fires on a target's beat, across the path to the next one: it burns while the piece
// holds on the target it just hit, and is out before the next is due. It only goes where the two are far enough
// apart for it, and keeps DODGE_MARGIN clear round each, so lining up with a target never touches it
var DODGE_GAP = 0.3; // how far apart two targets must be for a laser between them, as a fraction of the height
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

// Each phrase fills the bar starting at beat b0. add(fireBeat, axis, pos, size): axis "h" is a band across the screen
// at height pos (a fraction of the height), "v" a band down it at pos (a fraction of the width); size is its thickness
const PHRASES = {
    rest: function () {}, // a bar to breathe in, and to get the hits right
    rain: function (b0, rnd, add) { // a beam on every beat, never twice in the same place
        var last = null;
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            last = spread(rnd, 0.06, 0.94 - BEAM_SIZE, last, 0.25);
            add(b0 + i, "h", last, BEAM_SIZE);
        }
    },
    wall: function (b0, rnd, add) { // the whole height burns but for a gap, on beats 1 and 3: get to the gap
        var gap = 0.3, last = null;
        for (var i = 0; i < BEATS_PER_BAR; i += 2) {
            var top = spread(rnd, 0.08, 0.92 - gap, last, 0.2);
            last = top;
            add(b0 + i, "h", 0, top);
            add(b0 + i, "h", top + gap, 1 - top - gap);
        }
    },
    cross: function (b0, rnd, add) { // down, across, down, across
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (i % 2 == 0) {
                add(b0 + i, "v", 0.05 + rnd() * (0.9 - BEAM_SIZE_V), BEAM_SIZE_V);
            } else {
                add(b0 + i, "h", 0.06 + rnd() * (0.88 - BEAM_SIZE), BEAM_SIZE);
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
    double: function (b0, rnd, add) { // two beams at once on 1 and 3, a column on 2 and 4
        for (var i = 0; i < BEATS_PER_BAR; i++) {
            if (i % 2 == 0) {
                var a = spread(rnd, 0.06, 0.94 - BEAM_SIZE, null, 0);
                add(b0 + i, "h", a, BEAM_SIZE);
                add(b0 + i, "h", spread(rnd, 0.06, 0.94 - BEAM_SIZE, a, 0.35), BEAM_SIZE);
            } else {
                add(b0 + i, "v", 0.05 + rnd() * (0.9 - BEAM_SIZE_V), BEAM_SIZE_V);
            }
        }
    },
};

// Laser form's phrases: each fills the bar starting at b0 with targets, add(fireBeat, "target", pos, TARGET_R), pos
// being the height to line up at, as a fraction of the screen's
const TARGET_PHRASES = {
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

function buildTimeline(n) { // everything the level holds, in beat order: beams { fire, axis, pos, size, color },
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
    var add = function (fire, axis, pos, size) { // a beam off the beat takes the colour of the beat before it
        var c = pattern ? BEAT_COLORS[pattern.charAt(Math.floor(fire) - b0)] : null;
        out.push({ fire: fire, axis: axis, pos: pos, size: size, color: c || null });
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
        PHRASES[name](b0, rnd, laser[bar] ? drop : add);
        if (laser[bar]) {
            var targets = def.targets || ["hold"];
            TARGET_PHRASES[targets[Math.floor(aim() * targets.length)]](b0, aim, add);
        }
    }
    // the gates: the bar line into each laser section, and the one out of it unless it runs to the end. A gate's beat
    // is its own: whatever else fell on it goes
    var gates = [];
    (def.laser || []).forEach(function (s) {
        var into = (COUNT_IN_BARS + s[0]) * BEATS_PER_BAR;
        gates.push({ fire: into, axis: "gate", to: "laser", color: "gate" });
        if (s[0] + s[1] < def.bars) {
            gates.push({ fire: into + s[1] * BEATS_PER_BAR, axis: "gate", to: "wave", color: "gate" });
        }
    });
    out = out.filter(function (ev) {
        return !gates.some(function (g) { return g.fire == ev.fire; });
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
            lasers.push({ fire: at, axis: "h", pos: (lo + hi - size) / 2, size: size, color: target[at].color });
        }
    }
    return lasers;
}

function eventLead(ev, warn) { // how many beats ahead of its beat an event comes on screen
    return ev.axis == "gate" ? GATE_LEAD : ev.axis == "target" ? warn + TARGET_LEAD : warn;
}

function makeHazard(ev, warn) { // the thing on screen for a timeline event
    var lead = eventLead(ev, warn);
    return ev.axis == "gate" ? new Gate(ev, lead) : ev.axis == "target" ? new Target(ev, lead) : new Beam(ev, lead);
}

// A laser. It shows its outline from `fire - warn` beats, burns from `fire` for BEAM_FIRE beats (the only time it
// can hit), and fades for BEAM_FADE more. Its place is kept as fractions of the screen, so a resize refits it. A
// coloured beam warns in its colour -- cyan in a solid line, magenta dashed, so the two differ by more than colour --
// and burns with a glow of it round the laser core, which stays the laser's own colour: that is what can hit. A
// beam the piece absorbs in overdrive can't hit any more, and collapses to a white line and goes.
function Beam(ev, warn) {
    this.axis = ev.axis;
    this.pos = ev.pos;
    this.size = ev.size;
    this.color = ev.color; // "cyan", "magenta" or null
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + BEAM_FIRE;
    this.absorbedAt = null; // the beat it was absorbed on, if it has been
    this.fit();
}

Beam.prototype.absorb = function () {
    this.absorbedAt = beatPos;
};

Beam.prototype.fit = function () { // its rectangle on this window
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    if (this.axis == "h") {
        this.x = 0; this.width = W; this.y = this.pos * H; this.height = this.size * H;
    } else {
        this.y = 0; this.height = H; this.x = this.pos * W; this.width = this.size * W;
    }
};

Beam.prototype.step = function () { // false once its afterglow is gone, or it has been absorbed
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
        var t = Math.max(0, Math.min(1, (beatPos - this.warnAt) / (this.fireAt - this.warnAt)));
        var blink = (beatPos * 4) % 1 < 0.5 ? 1 : 0.6; // flickers in sixteenths, so it reads as live
        ctx.globalAlpha = (0.05 + 0.12 * t) * blink;
        ctx.fillStyle = tint;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.globalAlpha = (0.3 + 0.6 * t) * blink;
        ctx.strokeStyle = tint;
        ctx.lineWidth = this.color ? 3 : 2;
        ctx.setLineDash(this.color == "cyan" ? [] : [12, 8]);
        ctx.strokeRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
    } else { // burning, then its afterglow
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var across = this.axis == "h" ? this.height : this.width;
        ctx.globalAlpha = 0.45 * fade; // the glow, the whole band
        ctx.fillStyle = tint;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 0.95 * fade; // the core: what can actually hit
        ctx.fillStyle = COLORS.laser;
        var inset = across * BEAM_INSET;
        this.band(inset);
        ctx.fillStyle = COLORS.laserCore; // and a hot white line down its middle, thin however wide the beam
        this.band((across - Math.min(across * 0.2, BEAM_CORE_MAX)) / 2);
    }
    ctx.restore();
};

Beam.prototype.band = function (inset) { // fill the beam less `inset` px off each long side
    if (this.axis == "h") {
        ctx.fillRect(this.x, this.y + inset, this.width, Math.max(1, this.height - 2 * inset));
    } else {
        ctx.fillRect(this.x + inset, this.y, Math.max(1, this.width - 2 * inset), this.height);
    }
};

// A target, in laser form. It slides in from the right edge to reach TARGET_X on its beat, at its height, and can't
// hurt anything: the beam hits it, lined up and in its colour, on its beat (loop.js). Hit, it bursts; missed, it
// slides on out and goes. Its place is worked out from the window as it is drawn, so a resize needs nothing.
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

Target.prototype.step = function () { // false once its burst, or its slide out, is over
    return beatPos < (this.hitAt !== null ? this.hitAt + TARGET_BURST : this.fireAt + TARGET_GONE);
};

Target.prototype.center = function () { // where it is now: { x, y, r }
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var t = (beatPos - this.warnAt) / (this.fireAt - this.warnAt);
    var at = TARGET_X * W;
    return { x: at + (1 - t) * (W - at + this.size * H), y: this.pos * H, r: this.size * H };
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

// A gate: the bar line where the form switches. A white line sweeps in from the right edge to reach the piece on its
// beat, saying what to press and what it switches to; SPACE on the beat passes it (loop.js), and it flashes out from
// the piece. Unpassed, it runs on by. Nothing to run into either.
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

Gate.prototype.step = function () {
    return beatPos < (this.hitAt !== null ? this.hitAt : this.fireAt) + GATE_GONE;
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
    ctx.fillText(inputMode == "touch" ? "TAP GATE" : "SPACE", gx + 12, H - 92);
    ctx.font = "15px Arial";
    ctx.fillText(this.to == "laser" ? "TO LASER" : "TO WAVE", gx + 12, H - 72);
    ctx.restore();
};
