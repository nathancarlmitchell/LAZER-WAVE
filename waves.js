// Lazer Wave -- the waves. What each level is (its tempo, its length, the phrases it is built from), the phrases
// themselves, the timeline a level is built into, and the Beam: a laser that warns, fires on the beat, and fades.
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

// The levels. bpm is the tempo; bars is how long the level runs after the count-in; warn is how many beats ahead a
// beam shows its outline; phrases is what the level's bars are drawn from (a repeat makes that one more common).
const LEVELS = [null,
    { name: "Signal", bpm: 100, bars: 12, warn: 2, phrases: ["rain", "rain", "rest"] },
    { name: "Carrier", bpm: 108, bars: 14, warn: 2, phrases: ["rain", "wall", "rain", "rest"] },
    { name: "Interference", bpm: 116, bars: 16, warn: 1.5, phrases: ["rain", "wall", "cross", "stairs"] },
    { name: "Overdrive", bpm: 124, bars: 16, warn: 1.5, phrases: ["rain", "wall", "cross", "stairs", "double"] },
    { name: "Lazer Wave", bpm: 132, bars: 20, warn: 1, phrases: ["wall", "cross", "stairs", "double", "double"] },
];

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

function levelDef(n) { // the level's table entry; past the last, the last one again
    return LEVELS[Math.max(1, Math.min(n, LEVELS.length - 1))];
}

function buildTimeline(n) { // every beam the level will fire, in firing order: { fire, axis, pos, size }
    var def = levelDef(n);
    var rnd = seededRandom(n * 9973 + 17);
    var out = [];
    var add = function (fire, axis, pos, size) {
        out.push({ fire: fire, axis: axis, pos: pos, size: size });
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
        PHRASES[name]((COUNT_IN_BARS + bar) * BEATS_PER_BAR, rnd, add);
    }
    out.sort(function (a, b) { return a.fire - b.fire; });
    return out;
}

// A laser. It shows its outline from `fire - warn` beats, burns from `fire` for BEAM_FIRE beats (the only time it
// can hit), and fades for BEAM_FADE more. Its place is kept as fractions of the screen, so a resize refits it.
function Beam(ev, warn) {
    this.axis = ev.axis;
    this.pos = ev.pos;
    this.size = ev.size;
    this.warnAt = ev.fire - warn;
    this.fireAt = ev.fire;
    this.endAt = ev.fire + BEAM_FIRE;
    this.fit();
}

Beam.prototype.fit = function () { // its rectangle on this window
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    if (this.axis == "h") {
        this.x = 0; this.width = W; this.y = this.pos * H; this.height = this.size * H;
    } else {
        this.y = 0; this.height = H; this.x = this.pos * W; this.width = this.size * W;
    }
};

Beam.prototype.step = function () { // false once its afterglow is gone
    return beatPos < this.endAt + BEAM_FADE;
};

Beam.prototype.firing = function () {
    return beatPos >= this.fireAt && beatPos < this.endAt;
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
    ctx.save();
    if (beatPos < this.fireAt) { // the warning
        var t = Math.max(0, Math.min(1, (beatPos - this.warnAt) / (this.fireAt - this.warnAt)));
        var blink = (beatPos * 4) % 1 < 0.5 ? 1 : 0.6; // flickers in sixteenths, so it reads as live
        ctx.globalAlpha = (0.05 + 0.12 * t) * blink;
        ctx.fillStyle = COLORS.laser;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.globalAlpha = (0.3 + 0.6 * t) * blink;
        ctx.strokeStyle = COLORS.laser;
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(this.x + 1, this.y + 1, this.width - 2, this.height - 2);
    } else { // burning, then its afterglow
        var fade = beatPos < this.endAt ? 1 : Math.max(0, 1 - (beatPos - this.endAt) / BEAM_FADE);
        var across = this.axis == "h" ? this.height : this.width;
        ctx.globalAlpha = 0.45 * fade; // the glow, the whole band
        ctx.fillStyle = COLORS.laser;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 0.95 * fade; // the core: what can actually hit
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
