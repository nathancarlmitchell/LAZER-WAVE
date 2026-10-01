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
// catches that (below).
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
function cellConflicts(levels) {
    var lines = [];
    levels.forEach(function (n) {
        var laser = laserBars(levelDef(n)), wrapped = {}, places = [], beams = [];
        Object.keys(PHRASES).forEach(function (name) { var f = PHRASES[name]; wrapped[name] = f; PHRASES[name] = function (b0, rnd, add, tune) {
            var bar = b0 / BEATS_PER_BAR - COUNT_IN_BARS, got = [];
            f(b0, rnd, function (fire, axis, pos, size, more) { if (!laser[bar] && (axis == "h" || axis == "v") && !(more && more.kind == "chase")) { got.push({ fire: fire, axis: axis, pos: pos, size: size, burn: BEAM_FIRE * (more && more.hold || 1), bar: bar, name: name }); } return add.apply(null, arguments); }, tune);
            beams = beams.concat(got);
            if (name == "cage" || name == "pincer") { var at = {}; got.forEach(function (e) { (at[e.fire] = at[e.fire] || []).push(e); });
                Object.keys(at).forEach(function (fire) { var h = at[fire].filter(function (e) { return e.axis == "h"; }).sort(function (a, b) { return a.pos - b.pos; }), v = at[fire].filter(function (e) { return e.axis == "v"; }).sort(function (a, b) { return a.pos - b.pos; });
                    if (h.length == 2) { places.push({ fire: +fire, burn: h[0].burn, bar: bar, name: name, y0: h[0].pos + h[0].size, y1: h[1].pos, x0: v.length == 2 ? v[0].pos + v[0].size : null, x1: v.length == 2 ? v[1].pos : null }); } }); } }; });
        try { buildTimeline(n); } finally { Object.keys(wrapped).forEach(function (name) { PHRASES[name] = wrapped[name]; }); }
        var hits = {};
        places.forEach(function (p) { beams.forEach(function (e) {
            if (e.bar != p.bar || e.name == p.name || e.fire >= p.fire + p.burn || p.fire >= e.fire + e.burn) { return; }
            var mid = e.pos + e.size / 2, inside = e.axis == "h" ? mid > p.y0 && mid < p.y1 : p.x0 !== null && mid > p.x0 && mid < p.x1;
            if (inside) { var k = "bar " + p.bar + ", " + e.name + " through the " + p.name + "'s " + (p.name == "cage" ? "cell" : "gap"); hits[k] = (hits[k] || 0) + 1; } }); });
        var found = Object.keys(hits).map(function (k) { return k + " x" + hits[k]; });
        lines.push("L" + n + ": " + (found.length ? found.join("; ") : "ok"));
    });
    return lines.join("\n");
}
