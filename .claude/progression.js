// Lazer Wave -- the tables in PROGRESSION.md, worked out again from the levels' charts: node .claude/progression.js
//
// It loads the game's own level code (layout.js, waves.js, story.js, music.js, run.js, world.js) into a sandbox, builds
// every level's timeline, counts what each bar fires, and measures each level's room as .claude/safegap.js does
// (validateAll at 1000 px/s: the same grid, the same steps and reach, the game's own lasers, laser form held to its
// line, a gate's grace, and the mirror boss firing at where the piece stands), here without the game around it; it
// matches the browser's figures, or comes within a point of them where drifting lasers are on screen. It measures on
// every difficulty, as each one's warnings and the pace of its moving lasers make the level (the tables show NORMAL's,
// and the room on each), and runs safegap.js's chart checks too (cellConflicts, driftDeals). Then it rewrites the tables in PROGRESSION.md, each
// between its <!-- begin NAME --> and <!-- end NAME --> markers, and leaves every word around them as it was: the
// notes under the tables are written by hand, and may need a look. About a minute; `--check` prints what it would
// write and changes nothing. It exits with 1 if a level has a moment with nowhere to reach, or a check finds a fault.
const fs = require("fs"), path = require("path"), vm = require("vm");

const root = path.resolve(__dirname, "..");
const outline = path.join(root, "PROGRESSION.md");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function number(file, name) { // a number a game script gives `name`
    const m = read(file).match(new RegExp("(?:const|var)\\s+" + name + "\\s*=\\s*([0-9.]+)"));
    if (!m) {
        throw new Error(name + " not found in " + file);
    }
    return Number(m[1]);
}

function literal(file, name) { // the array or object literal a game script assigns to `name`, evaluated on its own
    const src = read(file), at = src.search(new RegExp("(?:const|var)\\s+" + name + "\\s*="));
    if (at < 0) {
        throw new Error(name + " not found in " + file);
    }
    const open = src.slice(at).search(/[[{]/) + at;
    let depth = 0, quote = null, end = open;
    for (; end < src.length; end++) { // to its closing bracket, skipping strings and comments
        const ch = src[end];
        if (quote) {
            if (ch == "\\") {
                end++;
            } else if (ch == quote) {
                quote = null;
            }
        } else if (ch == "/" && src[end + 1] == "/") {
            end = src.indexOf("\n", end);
        } else if (ch == "/" && src[end + 1] == "*") {
            end = src.indexOf("*/", end) + 1;
        } else if (ch == "\"" || ch == "'" || ch == "`") {
            quote = ch;
        } else if (ch == "[" || ch == "{") {
            depth++;
        } else if (ch == "]" || ch == "}") {
            depth--;
            if (depth == 0) {
                break;
            }
        }
    }
    return vm.runInNewContext("(" + src.slice(open, end + 1) + ")");
}

// ---- the game, as far as the levels go ----

const game = vm.createContext({ console: console, Math: Math, JSON: JSON });
["layout.js", "waves.js", "story.js", "music.js", "run.js", "world.js"].forEach(function (file) {
    vm.runInContext(read(file), game, { filename: file });
});
vm.runInContext(read("boss.js"), game, { filename: "boss.js" }); // a boss's par (bossPar)
const STEP_MS = number("loop.js", "STEP_MS"), BAD_MS = number("loop.js", "BAD_MS"), LASER_X = number("loop.js", "LASER_X");
const LASER_SLIDE_BEATS = number("loop.js", "LASER_SLIDE_BEATS"), LASER_REACH = number("loop.js", "LASER_REACH");
const ROOM_W = 880, ROOM_H = 550, ROOM_CELL = 16, ROOM_SPEED = 1000; // safegap.js's window, grid and hand speed
const PIECE_AT = [70, 275]; // and where its piece stands (vSetup): the mirror boss fires at it
// what the lasers ask of the game around them (loop.js, boss.js), as a level being measured stands: on safegap's
// window, the piece left where it started, a boss at full health
vm.runInContext([
    "var gameArea = { canvas: { width: " + ROOM_W + ", height: " + ROOM_H + " } };",
    "var beatPos = 0, facing = 1, form = 'wave', levelBpm = 120;",
    "var gamePiece = new component(PIECE_SIZE, PIECE_SIZE, '', " + PIECE_AT[0] + " - PIECE_SIZE / 2, " + PIECE_AT[1]
        + " - PIECE_SIZE / 2);",
    "function bossSlow() { return 1; }",
    "function targetX() { return facing > 0 ? TARGET_X : 1 - TARGET_X; }",
    "function beatOpen(n) { return (beatPos - n) * 60000 / levelBpm <= " + BAD_MS + "; }",
].join("\n"), game);
vm.runInContext(read(".claude/safegap.js"), game, { filename: "safegap.js" }); // its chart checks (its own set-up at the
// top disarms a game that isn't running here)

const LEVELS = vm.runInContext("LEVELS", game), LEVELS_PER_ACT = vm.runInContext("LEVELS_PER_ACT", game); // consts: in
// the sandbox's scope, not on its global object
const DIFFICULTIES = vm.runInContext("DIFFICULTIES", game), SHOWN = "normal"; // the tables' figures are NORMAL's
const levels = [];
for (let n = 1; n < LEVELS.length; n++) {
    levels.push(Object.assign({ n: n }, LEVELS[n]));
}
const lastLevel = levels.length;
const actOf = (n) => Math.ceil(n / LEVELS_PER_ACT);

function roomOf(n, name, everywhere) { // the least of the screen a piece could reach on difficulty `name`, over the
    // level's wave form, as a share; and how many moments had nowhere to reach at all. validateLevel's (safegap.js)
    // steps, one for one, but for testing a beam or a drifting laser only where its rectangle can reach (`everywhere`
    // tests every cell against every laser, as safegap does, and comes out the same)
    game.difficulty = name; // its warnings, and the pace of the lasers made from here on (laserPace)
    const def = game.levelDef(n), mpb = 60000 / def.bpm, warn = def.warn * game.mode().warn;
    const P = game.PIECE_SIZE, cs = ROOM_CELL, nx = Math.floor((ROOM_W - P) / cs) + 1, ny = Math.floor((ROOM_H - P) / cs) + 1;
    const N = nx * ny, walk = Math.max(1, Math.round(ROOM_SPEED * 0.03 / cs));
    const end = (game.COUNT_IN_BARS + def.bars) * game.BEATS_PER_BAR, first = game.COUNT_IN_BARS * game.BEATS_PER_BAR;
    const timeline = game.buildTimeline(n);
    const queue = timeline.filter((ev) => ev.fire >= first)
        .sort((a, b) => (a.fire - game.eventLead(a, warn)) - (b.fire - game.eventLead(b, warn)));
    const gates = {};
    timeline.forEach((ev) => { if (ev.axis == "gate") { gates[ev.fire] = ev; } });
    const mirror = def.boss && def.boss.kind == "mirror", echo = {}, laserAt = game.laserBars(def);
    const probe = new game.component(P, P, "", 0, 0);
    let hazards = [], next = 0, frame = 0, lastBeat = -1, judging = first, formAt = -Infinity, seen = -1;
    let R = null, least = Infinity, leastAt = 0, traps = 0, trapAt = [];
    game.form = "wave";
    game.facing = 1;
    game.levelBpm = def.bpm;
    while (game.beatPos < end || frame == 0) {
        for (let s = 0; s < 3; s++) { // three steps of the game (updateGameArea): the beat, what comes on, what moves,
            // the beat gone by, and a gate's window closing
            frame++;
            game.beatPos = frame * STEP_MS / mpb;
            while (next < queue.length && game.beatPos >= queue[next].fire - game.eventLead(queue[next], warn)) {
                hazards.push(game.makeHazard(queue[next], warn));
                next++;
            }
            hazards = hazards.filter((h) => !h.step || h.step() !== false);
            while (lastBeat < Math.floor(game.beatPos)) { // the mirror boss fires at where the piece was a bar ago
                const b = ++lastBeat;
                if (mirror) {
                    echo[b] = (game.gamePiece.y + P / 2) / ROOM_H;
                    const was = echo[b - game.BEATS_PER_BAR], lead = Math.ceil(warn);
                    const fireBar = Math.floor((b + lead) / game.BEATS_PER_BAR) - game.COUNT_IN_BARS; // none into laser form
                    if (was !== undefined && game.form == "wave" && b % 2 == 0 && b + lead < end && !laserAt[fireBar]) {
                        hazards.push(game.makeHazard({ fire: b + lead, axis: "h", size: game.BEAM_SIZE, color: null,
                            pos: Math.max(game.BEAM_TOP, Math.min(0.97 - game.BEAM_SIZE, was - game.BEAM_SIZE / 2)) }, warn));
                    }
                }
            }
            while (judging < end && (game.beatPos - judging) * mpb > BAD_MS) { // a gate let by switches the form anyway
                const g = gates[judging];
                if (g) {
                    if (game.form != g.to) {
                        game.form = g.to;
                        formAt = game.beatPos;
                    }
                    if (g.to == "laser") {
                        game.facing = g.facing || 1;
                    }
                }
                judging++;
            }
        }
        const near = Math.round(game.beatPos);
        const grace = game.beatPos - formAt < LASER_SLIDE_BEATS || (gates[near] && Math.abs(game.beatPos - near) * mpb <= BAD_MS);
        const radius = grace ? 25 : walk;
        const col = game.form == "laser" && !grace
            ? Math.round(((game.facing > 0 ? LASER_X : 1 - LASER_X) * ROOM_W - P / 2) / cs) : -1;
        const safe = new Uint8Array(N);
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                if (col < 0 || i == col) {
                    safe[j * nx + i] = 1;
                }
            }
        }
        for (let k = 0; !grace && k < hazards.length; k++) {
            const h = hazards[k], boxed = !everywhere && (h instanceof game.Beam || h instanceof game.Drifter);
            if (boxed && !h.firing()) {
                continue; // nothing burning to hit with
            }
            const i0 = boxed ? Math.max(0, Math.floor((h.x - P) / cs)) : 0, i1 = boxed ? Math.min(nx - 1, Math.ceil((h.x + h.width) / cs)) : nx - 1;
            const j0 = boxed ? Math.max(0, Math.floor((h.y - P) / cs)) : 0, j1 = boxed ? Math.min(ny - 1, Math.ceil((h.y + h.height) / cs)) : ny - 1;
            for (let j = j0; j <= j1; j++) {
                for (let i = i0; i <= i1; i++) {
                    if (safe[j * nx + i]) {
                        probe.x = i * cs;
                        probe.y = j * cs;
                        if (h.hits ? h.hits(probe) : probe.crashWith(h)) {
                            safe[j * nx + i] = 0;
                        }
                    }
                }
            }
        }
        const beat = Math.floor(game.beatPos);
        if (beat > seen) { // on a target's beat only the heights lined up with it count
            seen = beat;
            hazards.forEach(function (h) {
                if (h instanceof game.Target && h.fireAt == beat) {
                    const c = h.center(), reach = c.r + LASER_REACH;
                    for (let j = 0; j < ny; j++) {
                        if (Math.abs(j * cs + P / 2 - c.y) > reach) {
                            safe.fill(0, j * nx, j * nx + nx);
                        }
                    }
                }
            });
        }
        if (R === null) {
            R = safe;
            continue;
        }
        const reached = new Uint8Array(N);
        let frontier = [], any = 0;
        for (let q = 0; q < N; q++) {
            if (R[q] && safe[q]) {
                reached[q] = 1;
                frontier.push(q);
                any++;
            }
        }
        for (let d = 0; d < radius && frontier.length; d++) {
            const grow = [];
            frontier.forEach(function (q) {
                const qi = q % nx, qj = (q - qi) / nx;
                [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (m) {
                    const ii = qi + m[0], jj = qj + m[1];
                    if (ii >= 0 && ii < nx && jj >= 0 && jj < ny && safe[jj * nx + ii] && !reached[jj * nx + ii]) {
                        reached[jj * nx + ii] = 1;
                        grow.push(jj * nx + ii);
                        any++;
                    }
                });
            });
            frontier = grow;
        }
        if (any == 0) {
            traps++;
            trapAt.push({ beat: game.beatPos, burning: hazards.filter((h) => h.firing && h.firing()).map((h) => h.constructor.name) });
            R = safe;
        } else {
            R = reached;
            if (game.form == "wave" && any < least) {
                least = any;
                leastAt = game.beatPos;
            }
        }
    }
    return { share: least / N, bar: Math.floor(leastAt / game.BEATS_PER_BAR) - game.COUNT_IN_BARS, traps: traps,
        trapBars: Array.from(new Set(trapAt.map((t) => Math.floor(t.beat / game.BEATS_PER_BAR) - game.COUNT_IN_BARS))), trapAt: trapAt };
}

// ---- what each level holds ----

const FIRES = { h: 1, v: 1, corridor: 1, sweep: 1, radar: 1, pendulum: 1, ring: 1, diagonal: 1, spin: 1, mine: 1 };
const firstSeen = {}, comboSeen = {}, targetSeen = {}, colorSeen = {};
let dodgesSeen = 0, sectionsSeen = 0, laserSeen = false;
levels.forEach(function (lv) {
    const laser = game.laserBars(lv), timeline = game.buildTimeline(lv.n), fires = {}, drifts = {};
    timeline.forEach(function (ev) {
        const bar = Math.floor(ev.fire / game.BEATS_PER_BAR) - game.COUNT_IN_BARS;
        if (!laser[bar] && FIRES[ev.axis]) {
            fires[bar] = (fires[bar] || 0) + 1;
        }
        if (!laser[bar] && ev.axis == "drift") {
            drifts[bar] = (drifts[bar] || 0) + 1;
        }
    });
    lv.new = [];
    lv.rests = 0;
    const played = [];
    lv.chart.forEach(function (entry, bar) {
        if (laser[bar]) {
            const t = lv.targetsAt[bar];
            if (!targetSeen[t]) {
                targetSeen[t] = lv.n;
                lv.new.push(laserSeen ? t + " targets" : "laser form, " + t + " targets");
                laserSeen = true;
            }
            return;
        }
        if (bar > 0 && entry == "rest") {
            lv.rests++;
        }
        if (entry == "rest") {
            return;
        }
        played.push(bar);
        entry.split("+").forEach(function (p) {
            if (!firstSeen[p]) {
                firstSeen[p] = { n: lv.n, bar: bar, levels: [] };
                lv.new.push(p + " (" + bar + ")");
            }
            if (firstSeen[p].levels.indexOf(lv.n) < 0) {
                firstSeen[p].levels.push(lv.n);
            }
        });
        if (entry.indexOf("+") >= 0) {
            if (!comboSeen[entry]) {
                comboSeen[entry] = { n: lv.n, bar: bar, levels: [] };
                lv.new.push(entry + " (" + bar + ")");
            }
            if (comboSeen[entry].levels.indexOf(lv.n) < 0) {
                comboSeen[entry].levels.push(lv.n);
            }
        }
    });
    (lv.colors || []).forEach(function (c) {
        if (!colorSeen[c]) {
            colorSeen[c] = lv.n;
            lv.new.push({ solid: "colours, a bar each", pairs: "colours in pairs", alt: "colours on every beat" }[c] || c);
        }
    });
    if (lv.laser.length && lv.dodges > dodgesSeen) {
        dodgesSeen = lv.dodges;
        lv.new.push(lv.dodges == 1 ? "a laser to dodge" : lv.dodges + " lasers to dodge");
    }
    if (lv.laser.length > sectionsSeen && lv.laser.length > 1) {
        lv.new.push(lv.laser.length + " laser sections");
    }
    sectionsSeen = Math.max(sectionsSeen, lv.laser.length);
    const counts = played.map((b) => fires[b] || 0), most = Object.keys(drifts).map((b) => drifts[b]);
    lv.lasers = played.length ? counts.reduce((a, b) => a + b, 0) / played.length : 0;
    lv.busiest = Math.max.apply(null, counts.concat([0]));
    lv.drifting = Math.max.apply(null, most.concat([0]));
    lv.rooms = {};
    DIFFICULTIES.forEach(function (d) { lv.rooms[d.name] = roomOf(lv.n, d.name); });
    lv.room = lv.rooms[SHOWN];
});
game.difficulty = SHOWN;

// ---- the checks ----

const allLevels = levels.map((lv) => lv.n);
const faults = []; // what the checks found, a line each
levels.forEach(function (lv) {
    DIFFICULTIES.forEach(function (d) {
        const traps = lv.rooms[d.name].traps;
        if (traps) {
            faults.push("Level " + lv.n + " on " + d.name.toUpperCase() + ": " + traps + " moment" + (traps > 1 ? "s" : "")
                + " with nowhere to reach");
        }
    });
});
[game.cellConflicts(allLevels), game.driftDeals(allLevels)].forEach(function (lines) {
    lines.split("\n").forEach(function (line) {
        if (!/: ok$/.test(line)) {
            faults.push(line.replace(/^L(\d+):/, "Level $1:"));
        }
    });
});

// ---- the tables ----

const ranges = function (ns) { // [1, 2, 3, 5] -> "1-3, 5"
    const out = [];
    for (let i = 0; i < ns.length; i++) {
        let j = i;
        while (j + 1 < ns.length && ns[j + 1] == ns[j] + 1) {
            j++;
        }
        out.push(i == j ? String(ns[i]) : ns[i] + "-" + ns[j]);
        i = j;
    }
    return out.join(", ") || "none";
};
const where = (test) => ranges(levels.filter(test).map((lv) => lv.n));
const bars = (s) => s[1] > 1 ? s[0] + "-" + (s[0] + s[1] - 1) : String(s[0]);
const percent = (x) => Math.round(100 * x) + "%";
const tiles = {};
literal("practice.js", "PRACTICE_PHRASES").forEach(function (p) { tiles[p.key] = p.name; });
const tileName = (key) => tiles[key] && tiles[key].toLowerCase().replace(/[^a-z]/g, "") != key ? key + " (" + tiles[key] + ")" : key;
const version = (read("wordpress-plugin/lazer-wave-game/lazer-wave-game.php").match(/\*\s*Version:\s*(\S+)/) || [])[1];

const blocks = {};
blocks.stamp = "_Tables worked out from the charts at plugin " + version + " by `node .claude/progression.js`._";
blocks.checks = faults.length ? faults.map((f) => "- " + f).join("\n")
    : "- All " + lastLevel + " levels, on every difficulty: somewhere to reach at every moment, no laser through a cage's "
    + "cell or a pincer's gap, and no drifting laser where it can't get across or would drift through one.";
const shown = DIFFICULTIES.find((d) => d.name == SHOWN), named = (d) => d.name.toUpperCase();
const ms = (lv) => Math.round(lv.warn * shown.warn * 60000 / lv.bpm);
const warns = Array.from(new Set(levels.map((lv) => lv.warn)));
const beats = (x) => String(Math.round(x * 10) / 10);
blocks["every-level"] = [
    "- Tempo from " + levels[0].bpm + " BPM in level 1 to " + levels[lastLevel - 1].bpm + " in level " + lastLevel
        + ". Length from " + Math.min.apply(null, levels.map((lv) => lv.bars)) + " bars to "
        + Math.max.apply(null, levels.map((lv) => lv.bars)) + ".",
    "- Warnings: a level's `warn` (" + (warns.length == 1 ? warns[0] + " beats in every level" : "from " + Math.min.apply(null, warns)
        + " to " + Math.max.apply(null, warns) + " beats") + ") times the difficulty's: "
        + DIFFICULTIES.map((d) => named(d) + " ×" + d.warn).join(", ") + ". On " + named(shown) + ", " + ms(levels[0])
        + " ms in level 1 to " + ms(levels[lastLevel - 1]) + " ms in level " + lastLevel + ".",
    "- Moving lasers go at the difficulty's pace, of TRUE's: " + DIFFICULTIES.map((d) => named(d) + " ×" + (d.speed || 1)).join(", ")
        + ". A corridor keeps its bar and gets that share of its path through it; a sweeper, the radar, a pendulum and the "
        + "spinning X make their whole way all the same, over " + DIFFICULTIES.map((d) => beats(game.BEATS_PER_BAR / (d.speed || 1))
        + " beats on " + named(d)).join(", ") + ", on into the bars after their own (sooner where laser form, the level's "
        + "end, another of them or a bar with a place of its own to be in comes first: see Moving lasers on each "
        + "difficulty); a drifting laser takes " + DIFFICULTIES.map((d) => beats(game.DRIFT_BEATS / (d.speed || 1))
        + " beats on " + named(d)).join(", ") + " to cross the screen.",
    "- The gaps the player is asked into widen at the difficulty's `gap`: " + DIFFICULTIES.map((d) => named(d) + " ×"
        + (d.gap || 1)).join(", ") + ". All but a corridor's widen about the same middle and are kept on the screen.",
    "",
    "| Gap | " + DIFFICULTIES.map(named).join(" | ") + " |",
    "|---|" + DIFFICULTIES.map(() => "---|").join(""),
].concat([["A corridor's, of the height", game.CORRIDOR_GAP], ["A wall's, of the height", game.WALL_GAP],
    ["A sweeper's hole, of the height", game.SWEEP_GAP],
    ["A pincer's, of the height", game.PINCER_GAP], ["A cage's cell, of the height × the width", game.PINCER_GAP, game.CAGE_GAP],
    ["Closing walls', of the width", game.CLOSE_GAP]].map((g) => "| " + g[0] + " | " + DIFFICULTIES.map((d) =>
        percent(g[1] * (d.gap || 1)) + (g.length > 2 ? " × " + percent(g[2] * (d.gap || 1)) : "")).join(" | ") + " |")).join("\n");
// every sweeper, radar, pendulum and spinning X in the charts: how long it takes to make its whole way on each
// difficulty, and what hurries it where that is shorter than the slowest difficulty's pace would take
const moverName = { sweep: "sweeper", radar: "radar", pendulum: "pendulum", spin: "spinning X" };
const slowest = DIFFICULTIES.reduce((a, d) => ((d.speed || 1) < (a.speed || 1) ? d : a));
const moverRows = [];
levels.forEach((lv) => {
    const def = game.levelDef(lv.n), round = game.loopFrom(def), laserAt = game.laserBars(def), found = {};
    DIFFICULTIES.forEach((d) => {
        game.difficulty = d.name;
        game.buildTimeline(lv.n).filter((ev) => game.MOVERS[ev.axis]).forEach((ev) => {
            const f = found[ev.fire + ev.axis] = found[ev.fire + ev.axis] || { ev: ev, turn: {} };
            f.turn[d.name] = game.makeHazard(ev, 0).turn;
        });
    });
    Object.keys(found).map((k) => found[k]).sort((a, b) => a.ev.fire - b.ev.fire).forEach((f) => {
        const bar = Math.floor(f.ev.fire / game.BEATS_PER_BAR) - game.COUNT_IN_BARS;
        let by = "-";
        if (f.ev.life !== undefined && f.turn[slowest.name] < game.BEATS_PER_BAR / (slowest.speed || 1) - 1e-9) {
            let at = Math.round((f.ev.fire + f.ev.life) / game.BEATS_PER_BAR) - game.COUNT_IN_BARS;
            if (at >= def.bars) {
                at = round === null ? null : round + at - def.bars;
            }
            by = at === null ? "the level's end" : laserAt[at] ? "laser form, bar " + at : lv.chart[at] + ", bar " + at;
        }
        const entry = lv.chart[bar] == f.ev.axis ? "" : " (" + lv.chart[bar] + ")";
        moverRows.push("| " + lv.n + " | " + bar + " | " + moverName[f.ev.axis] + entry + " | "
            + DIFFICULTIES.map((d) => beats(f.turn[d.name])).join(" | ") + " | " + by + " |");
    });
});
game.difficulty = SHOWN;
blocks.movers = ["| # | Bar | Laser | " + DIFFICULTIES.map(named).join(" | ") + " | Done before |",
    "|---|---|---|" + DIFFICULTIES.map(() => "---|").join("") + "---|"].concat(moverRows).join("\n");
blocks.room = ["| # | Level | " + DIFFICULTIES.map(named).join(" | ") + " |", "|---|---|" + DIFFICULTIES.map(() => "---|").join("")]
    .concat(levels.map((lv) => "| " + lv.n + " | " + lv.name + " | " + DIFFICULTIES.map((d) => percent(lv.rooms[d.name].share)
        + (lv.rooms[d.name].traps ? ", TRAPPED" : "")).join(" | ") + " |")).join("\n");

const parOf = (lv) => game.bossPar(game.levelDef(lv.n), game.buildTimeline(lv.n), game.COUNT_IN_BARS * game.BEATS_PER_BAR,
    lv.boss.hp || 1); // the earliest round it can fall in
const bosses = levels.filter((lv) => lv.boss).map((lv) => lv.n + " " + lv.name + " (" + lv.boss.kind
    + (lv.boss.hp ? ", " + lv.boss.hp + " HP" : "") + ", round " + parOf(lv) + " at the earliest)").join(", ");
const twoSections = where((lv) => lv.laser.length > 1);
blocks.milestones = [
    "| | Levels |",
    "|---|---|",
    "| Colours | none: " + where((lv) => !lv.colors.length) + "; solid (the key changes at a bar line): "
        + where((lv) => lv.colors.indexOf("solid") >= 0) + "; pairs (every 2 beats): " + where((lv) => lv.colors.indexOf("pairs") >= 0)
        + "; alt (every beat): " + where((lv) => lv.colors.indexOf("alt") >= 0) + " |",
    "| Laser form | " + where((lv) => lv.laser.length) + " (first in " + levels.find((lv) => lv.laser.length).n + ", bars "
        + bars(levels.find((lv) => lv.laser.length).laser[0]) + "); two sections or more: " + twoSections + " |",
    "| Laser form targets | " + Object.keys(targetSeen).map((t) => t + ": " + where((lv) =>
        Object.keys(lv.targetsAt).some((b) => lv.targetsAt[b] == t))).join("; ") + " |",
    "| Lasers to dodge a laser bar | " + Array.from(new Set(levels.filter((lv) => lv.laser.length).map((lv) => lv.dodges)))
        .sort().map((d) => d + ": " + where((lv) => lv.laser.length && lv.dodges == d)).join("; ") + " |",
    "| Rest bars after bar 0 | " + where((lv) => lv.rests > 0) + " |",
    "| Combinations | two in a bar: " + where((lv) => lv.chart.some((e) => e.split("+").length == 2)) + "; three: "
        + where((lv) => lv.chart.some((e) => e.split("+").length == 3)) + " |",
    "| Drifting lasers | " + ["roll", "swarm", "mines"].filter((p) => firstSeen[p]).map((p) => tileName(p) + ": "
        + ranges(firstSeen[p].levels)).join("; ") + " |",
    "| Bosses | " + bosses + " |",
].join("\n");

const header = "| # | Level | BPM | Bars | Colours | Laser form | Dodge | New | Rests | Lasers a bar | Tightest |\n"
    + "|---|---|---|---|---|---|---|---|---|---|---|";
const acts = {};
levels.forEach(function (lv) {
    const targets = Array.from(new Set(Object.keys(lv.targetsAt).map((b) => lv.targetsAt[b])));
    const laser = lv.laser.length ? lv.laser.map(bars).join(", ") + ": " + targets.join(", ") : "-";
    const room = percent(lv.room.share) + (lv.room.traps ? ", " + lv.room.traps + " TRAPPED" : "");
    const row = "| " + [lv.n, lv.name + (lv.boss ? ", boss" : ""), lv.bpm, lv.bars, lv.colors.join(", ") || "none", laser,
        lv.laser.length ? lv.dodges : "-", lv.new.join(", ") || "-", lv.rests,
        lv.lasers.toFixed(1) + " / " + lv.busiest + (lv.drifting ? ", " + lv.drifting + " drifting" : ""), room].join(" | ") + " |";
    (acts[actOf(lv.n)] = acts[actOf(lv.n)] || [header]).push(row);
});
Object.keys(acts).forEach(function (a) { blocks["act-" + a] = acts[a].join("\n"); });

blocks.patterns = ["| Pattern | First (level, bar) | Levels |", "|---|---|---|"].concat(Object.keys(firstSeen).map(function (p) {
    const f = firstSeen[p];
    return "| " + tileName(p) + " | " + f.n + ", bar " + f.bar + " | " + ranges(f.levels) + " |";
})).join("\n");
blocks.combinations = ["| Combination | First (level, bar) | Levels |", "|---|---|---|"].concat(Object.keys(comboSeen).map(function (c) {
    const f = comboSeen[c];
    return "| " + c + " | " + f.n + ", bar " + f.bar + " | " + ranges(f.levels) + " |";
})).join("\n");

// ---- into the outline ----

let text = fs.readFileSync(outline, "utf8");
const crlf = text.indexOf("\r\n") >= 0;
text = text.replace(/\r\n/g, "\n");
Object.keys(blocks).forEach(function (name) {
    const begin = "<!-- begin " + name + " -->", end = "<!-- end " + name + " -->";
    const a = text.indexOf(begin), b = text.indexOf(end);
    if (a < 0 || b < a) {
        throw new Error("PROGRESSION.md has no " + begin + " ... " + end + " for the " + name + " table");
    }
    text = text.slice(0, a + begin.length) + "\n" + blocks[name] + "\n" + text.slice(b);
});
if (process.argv.indexOf("--check") >= 0) {
    console.log(text);
} else {
    fs.writeFileSync(outline, crlf ? text.replace(/\n/g, "\r\n") : text);
    console.log("PROGRESSION.md: " + Object.keys(blocks).length + " tables from " + lastLevel + " levels' charts, plugin "
        + version + ". Tightest room on " + named(shown) + ": " + levels.map((lv) => lv.n + " " + percent(lv.room.share)).join(", ")
        + ".\n" + (faults.length ? "Faults:\n  " + faults.join("\n  ") : "Checks: all clear."));
}
if (faults.length) {
    process.exitCode = 1;
}
