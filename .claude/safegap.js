// Lazer Wave -- a check that a level always leaves somewhere to stand. Serve the game (node .claude/serve.js), open
// http://localhost:8123/ and its console, paste this file in, and run, say, validateAll([10], 1000): it plays the level
// through with the real lasers, and every 30 ms tests a 16 px grid of piece positions against them, then keeps the
// positions a piece could have reached through safe ground from where it could stand 30 ms before, at a hand speed
// of 1000 px/s (through a change of form, anywhere, as nothing hits it then: switchGrace, loop.js); on a target's
// beat only the positions lined up with it count. It reports any moment with nowhere to
// reach ("trapped": safe ground exists but none of it can be reached; "nowhere": none exists) and the tightest moment
// in wave form, as the share of the grid reachable, with the phrase dealt into that bar. It disarms the level to run
// it (the piece can't be hurt, the meter can't drain, nothing is drawn), so reload the page afterwards.
// Room is not the whole of it: a cage's cell and a pincer's gap are where the player is asked to go, and a combination
// that fires through one leaves room elsewhere while burning the place everyone heads for. cellConflicts([n, ...])
// catches that (below), and driftDeals([n, ...]) the same of the drifting lasers, which cross the bars after their own.
// A boss's level is only played to the end of its own bars here; for a later round, run validateLevel's loop on past
// it (its `end` plus loopLen), as the drifting lasers late in a round cross into the next.
gameArea.canvas.width = 880; gameArea.canvas.height = 550; x = 880; y = 550;
hitHazard = function () { return false; }; steerPiece = function () { return false; }; perfMiss = function () {}; fxOverdrawn = function () { return true; };

function vSetup(n) { stopLevel(); clearObjects(); resultsUp = false; deathAnim = null; story = null; level = n; startGame({ pageX: 70, pageY: 275 }); story = null; playLevel(); pause = false; runLives = 3; }

function dealtPhrases(n) { // the phrase each bar of level n is dealt, by watching the level build
    var dealt = {}, wrapped = {};
    Object.keys(PHRASES).forEach(function (name) { var f = PHRASES[name]; wrapped[name] = f; PHRASES[name] = function (b0, rnd, add, tune) { var bar = b0 / BEATS_PER_BAR - COUNT_IN_BARS; dealt[bar] = (dealt[bar] ? dealt[bar] + "+" : "") + name; return f(b0, rnd, add, tune); }; });
    buildTimeline(n);
    Object.keys(wrapped).forEach(function (name) { PHRASES[name] = wrapped[name]; });
    return dealt;
}

function validateLevel(n, speedPxPerSec) {
    vSetup(n);
    var W = gameArea.canvas.width, H = gameArea.canvas.height, cs = 16, nx = Math.floor((W - PIECE_SIZE) / cs) + 1, ny = Math.floor((H - PIECE_SIZE) / cs) + 1;
    var probe = new component(PIECE_SIZE, PIECE_SIZE, "#fff", 0, 0), R = null, events = [], minR = Infinity, minAt = 0, lastBeat = -1;
    var walk = Math.max(1, Math.round((speedPxPerSec || 1000) * 0.03 / cs)), end = (COUNT_IN_BARS + wave.bars) * BEATS_PER_BAR;
    var types = function () { var t = {}; hazards.forEach(function (h) { if (h.firing && h.firing()) { t[h.constructor.name] = (t[h.constructor.name] || 0) + 1; } }); return Object.keys(t).map(function (k) { return t[k] + " " + k; }).join(", "); };
    while (beatPos < end && !resultsUp) {
        for (var s = 0; s < 3; s++) { hp = 3; updateGameArea(); }
        var grace = switchGrace(), radius = grace ? 25 : walk; // through a change of form the piece goes anywhere, unhurt
        var safe = new Uint8Array(nx * ny), count = 0, col = form == "laser" && !grace ? Math.round((laserX() * W - PIECE_SIZE / 2) / cs) : -1;
        for (var j = 0; j < ny; j++) { for (var i = 0; i < nx; i++) {
            if (col >= 0 && i != col) { continue; }
            probe.x = i * cs; probe.y = j * cs; var hit = false;
            for (var k = 0; !grace && k < hazards.length && !hit; k++) { var h = hazards[k]; hit = h.hits ? h.hits(probe) : probe.crashWith(h); }
            if (!hit) { safe[j * nx + i] = 1; count++; }
        } }
        var b = Math.floor(beatPos);
        if (b > lastBeat) { lastBeat = b; hazards.forEach(function (h) { if (h instanceof Target && h.fireAt == b) { var c = h.center(), reach = c.r + LASER_REACH;
            for (var j2 = 0; j2 < ny; j2++) { if (Math.abs(j2 * cs + PIECE_SIZE / 2 - c.y) > reach) { for (var i2 = 0; i2 < nx; i2++) { if (safe[j2 * nx + i2]) { safe[j2 * nx + i2] = 0; count--; } } } } } }); }
        if (R === null) { R = safe; } else {
            var next = new Uint8Array(nx * ny), frontier = [], any = 0;
            for (var q = 0; q < nx * ny; q++) { if (R[q] && safe[q]) { next[q] = 1; frontier.push(q); any++; } }
            for (var d = 0; d < radius && frontier.length; d++) { var grow = [];
                frontier.forEach(function (q) { var qi = q % nx, qj = (q - qi) / nx;
                    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (m) { var ii = qi + m[0], jj = qj + m[1]; if (ii < 0 || ii >= nx || jj < 0 || jj >= ny) { return; } var p = jj * nx + ii; if (safe[p] && !next[p]) { next[p] = 1; grow.push(p); any++; } }); });
                frontier = grow; }
            if (any == 0) { events.push({ beat: +beatPos.toFixed(2), bar: Math.floor(beatPos / BEATS_PER_BAR) - COUNT_IN_BARS, kind: count ? "trapped" : "nowhere", safe: count, form: form, burning: types() }); R = safe; }
            else { R = next; if (form == "wave" && any < minR) { minR = any; minAt = beatPos; } }
        }
    }
    return { level: n, bars: wave.bars, events: events, minReach: minR, minAt: +minAt.toFixed(2), cells: nx * ny };
}

function validateAll(levels, speed) { // one line a level
    var lines = [];
    levels.forEach(function (n) { var dealt = dealtPhrases(n), laser = laserBars(levelDef(n)), r = validateLevel(n, speed);
        var bar = Math.floor(r.minAt / BEATS_PER_BAR) - COUNT_IN_BARS, what = laser[bar] ? "laser form" : (dealt[bar] || "rest");
        var bad = r.events.map(function (e) { return e.kind + " at bar " + e.bar + " (" + (laser[e.bar] ? "laser form" : dealt[e.bar] || "rest") + ", " + e.burning + ")"; });
        lines.push("L" + n + ": " + (bad.length ? bad.length + " IMPOSSIBLE: " + bad.join("; ") : "ok") + "; tightest " + (100 * r.minReach / r.cells).toFixed(1) + "% at bar " + bar + " (" + what + ")"); });
    return lines.join("\n");
}

// The place to be, kept clear: deals each level and reports every beam of a bar, across or down, from another phrase
// dealt with it, whose middle lies inside a cage's cell (across: in its rows, down: in its columns) or a pincer's gap
// while both burn. Chasers are left out, as they go where the piece is; so are the bars played in laser form. The
// melody's beam and the mirror's, on the cage's own note, did this in levels 11, 12, 15 and 23 (cage+melody, cage+mirror).
// The cells and gaps are as wide as each difficulty has them (gapRoom, flankPlace): an easier one's wider cell takes in
// more, so a beam is reported with the difficulties it lands inside on.
function cellConflicts(levels) {
    var lines = [], rooms = {};
    DIFFICULTIES.forEach(function (d) { var r = d.gap || 1; (rooms[r] = rooms[r] || []).push(d.name.toUpperCase()); });
    levels.forEach(function (n) {
        var laser = laserBars(levelDef(n)), wrapped = {}, groups = [], beams = [];
        Object.keys(PHRASES).forEach(function (name) { var f = PHRASES[name]; wrapped[name] = f; PHRASES[name] = function (b0, rnd, add, tune) {
            var bar = b0 / BEATS_PER_BAR - COUNT_IN_BARS, got = [];
            f(b0, rnd, function (fire, axis, pos, size, more) { if (!laser[bar] && (axis == "h" || axis == "v") && !(more && more.kind == "chase")) { got.push({ fire: fire, axis: axis, pos: pos, size: size, flank: more && more.flank, burn: BEAM_FIRE * (more && more.hold || 1), bar: bar, name: name }); } return add.apply(null, arguments); }, tune);
            beams = beams.concat(got);
            if (name == "cage" || name == "pincer") { var at = {}; got.forEach(function (e) { (at[e.fire] = at[e.fire] || []).push(e); });
                Object.keys(at).forEach(function (fire) { var h = at[fire].filter(function (e) { return e.axis == "h"; }).sort(function (a, b) { return a.pos - b.pos; }), v = at[fire].filter(function (e) { return e.axis == "v"; }).sort(function (a, b) { return a.pos - b.pos; });
                    if (h.length == 2) { groups.push({ fire: +fire, burn: h[0].burn, bar: bar, name: name, h: h, v: v.length == 2 ? v : null }); } }); } }; });
        try { buildTimeline(n); } finally { Object.keys(wrapped).forEach(function (name) { PHRASES[name] = wrapped[name]; }); }
        var hits = {}, on = {};
        Object.keys(rooms).forEach(function (room) {
            var place = function (e) { return e.flank ? flankPlace(e, +room) : e; };
            groups.forEach(function (g) {
                var y0 = place(g.h[0]).pos + place(g.h[0]).size, y1 = place(g.h[1]).pos;
                var x0 = g.v ? place(g.v[0]).pos + place(g.v[0]).size : null, x1 = g.v ? place(g.v[1]).pos : null;
                beams.forEach(function (e) {
                    if (e.bar != g.bar || e.name == g.name || e.fire >= g.fire + g.burn || g.fire >= e.fire + e.burn) { return; }
                    var mid = place(e).pos + place(e).size / 2, inside = e.axis == "h" ? mid > y0 && mid < y1 : x0 !== null && mid > x0 && mid < x1;
                    if (inside) { var k = "bar " + g.bar + ", " + e.name + " through the " + g.name + "'s " + (g.name == "cage" ? "cell" : "gap");
                        hits[k] = (hits[k] || 0) + 1; on[k] = (on[k] || []).concat(rooms[room].filter(function (d) { return (on[k] || []).indexOf(d) < 0; })); } }); }); });
        var found = Object.keys(hits).map(function (k) { return k + " (" + on[k].join(", ") + ")"; });
        lines.push("L" + n + ": " + (found.length ? found.join("; ") : "ok"));
    });
    return lines.join("\n");
}

// The drifting lasers' places in a chart (LEVELS, waves.js): one is still crossing in the bars after its own, two at
// TRUE's pace and more at a slower difficulty's (as many as the slowest difficulty's takes), so none
// should come just before a laser section or the level's end, where it would hardly get across (and a mine would never
// burst), nor within those bars before a cage, a pincer, a corridor or closing walls, whose place to be it would be
// drifting through, round into the next round on a boss's level. driftDeals([21, 22, 23, 24, 25]) reports any that do.
function driftDeals(levels) {
    var DRIFT = { roll: 1, swarm: 1, mines: 1 }, OWN = { cage: 1, pincer: 1, corridor: 1, close: 1 };
    var has = function (k, set) { return k.split("+").some(function (q) { return set[q]; }); };
    var slowest = Math.min.apply(null, DIFFICULTIES.map(function (d) { return d.speed || 1; }));
    var after = Math.ceil(DRIFT_BEATS / slowest / BEATS_PER_BAR); // the bars it may still be crossing, at its slowest
    return levels.map(function (n) {
        var def = levelDef(n), dealt = buildTimeline(n).dealt, laser = laserBars(def), round = loopFrom(def), bad = [];
        dealt.forEach(function (k, b) {
            if (b == 0 || laser[b] || !has(k, DRIFT)) { return; }
            if (laser[b + 1] || (b + 1 >= def.bars && round === null)) { bad.push("bar " + b + " (" + k + ") just before " + (laser[b + 1] ? "laser form" : "the end")); return; }
            for (var j = 1; j <= after; j++) {
                var e = b + j;
                if (e >= def.bars) { if (round === null) { break; } e = round + e - def.bars; }
                if (laser[e]) { break; }
                if (has(dealt[e], OWN)) { bad.push("bar " + b + " (" + k + ") drifting into bar " + e + " (" + dealt[e] + ")"); }
            }
        });
        return "L" + n + ": " + (bad.length ? bad.join("; ") : "ok");
    }).join("\n");
}
