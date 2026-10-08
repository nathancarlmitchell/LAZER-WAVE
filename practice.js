// Lazer Wave -- practice. A screen off the start screen in two sections, a tab each. LEVELS: any of the game's own
// levels, played whole, as a run plays it: its song, its lasers and its boss. CUSTOM: the makings of any level put
// together: up to three laser phrases dealt into the same bars, or none for the beat alone, in wave form, in laser form,
// or switching between them by
// turns, with laser form's targets and dodges, the beats' colours, an act's song, a tempo, a warning, a length and the
// difficulty. A preview plays the level or the pattern as it is chosen, with the game's own lasers and backdrop, in a
// panel of its own; the aids under it set how it is practised; PLAY plays it. A practice level can't be lost: a laser
// that gets the piece, or a gate let by, is counted rather than costing a shield, and the meter can't run out. It has
// no lives, and nothing it does is recorded (loop.js, levels.js). index.html loads this with a plain <script src>, as
// globals rather than modules, so the game still opens straight off disk.
//
// The preview runs the pattern by itself: its own timeline, beat and lasers, drawn by the game's own code onto a canvas
// of its own the size of the layout. While it steps and draws, the game's state is swapped for the preview's (the
// canvas, the context, the level, the beat, the lasers, the piece, the form) and put back after, so nothing it does
// reaches the game.

// The phrases, in the order the levels bring them in, each with what its tile says and a line on what it does
var PRACTICE_PHRASES = [
    { key: "melody", name: "MELODY", info: "a beam on each note the melody starts, as high as the note, held as long" },
    { key: "fall", name: "FALLERS", info: "the melody's beams dropping in from the top, landing on their outline early" },
    { key: "rain", name: "RAIN", info: "a beam on every beat, never twice in the same place" },
    { key: "pincer", name: "PINCER", info: "two beams closing on each note: the gap between them is the note" },
    { key: "cage", name: "CAGE", info: "four beams closing a cell on each note, round the bass's column: get inside it" },
    { key: "wall", name: "WALL", info: "the whole height burning but for a gap, on beats 1 and 3: get to the gap" },
    { key: "corridor", name: "CORRIDOR", info: "a corridor scrolling in, its gap riding the melody, the bar long" },
    { key: "cross", name: "CROSS", info: "down, across, down, across: the ones across on the tune's notes" },
    { key: "mirror", name: "MIRROR", info: "each note's beam and its mirror image, closing on the middle" },
    { key: "ripple", name: "RIPPLE", info: "four thin beams on a note's sixteenths, running to the next note" },
    { key: "radar", name: "RADAR", info: "a ray from the middle coming round, once a bar on TRUE: keep ahead of it" },
    { key: "stairs", name: "STAIRS", info: "four columns marching across the screen, one a beat" },
    { key: "crossfire", name: "CROSSFIRE", info: "columns closing in from both sides on the half beats, then opening" },
    { key: "sweep", name: "SWEEPER", info: "a band wiping across, over the bar on TRUE, with a hole at the note" },
    { key: "offbeat", name: "OFF-BEAT", info: "a beam on the \"and\" of every beat, at the note sounding on it" },
    { key: "segment", name: "SEGMENT", info: "the melody's beams across the bass's half of the screen only" },
    { key: "chord", name: "CHORD", info: "the bar's chord, every note a beam, all at once on the bar line" },
    { key: "pendulum", name: "PENDULUM", info: "a band swinging between its notes, over the bar on TRUE, firing every beat" },
    { key: "double", name: "DOUBLE", info: "two beams at once on 1 and 3, and a column on 2 and 4" },
    { key: "doubletap", name: "DOUBLE TAP", info: "a short burn on the beat and again on its \"and\", in the same place" },
    { key: "close", name: "CLOSE", info: "walls sliding in from both edges, to fire on the bar's last beat" },
    { key: "chase", name: "CHASERS", info: "beams that hunt your height until half a beat before they fire" },
    { key: "stutter", name: "STUTTER", info: "the melody's beams flickering on and off in sixteenths for a beat" },
    { key: "ring", name: "RING", info: "a ring growing round each note's point: be inside it, or outside" },
    { key: "diagonal", name: "DIAGONAL", info: "a band leaning through each note's point, the way the melody goes" },
    { key: "spin", name: "SPINNING X", info: "two lasers crossing, turning half way round, over the bar on TRUE" },
    { key: "fill", name: "FILL", info: "the melody's beams, then thin lasers filling the bar's last beat" },
    { key: "roll", name: "PIANO ROLL", info: "the melody's notes drifting in as lasers, each as long as it is held" },
    { key: "swarm", name: "SWARM", info: "small lasers drifting across, a lane through them following the tune" },
    { key: "mines", name: "MINES", info: "mines drifting in on the notes, each bursting into a cross a bar or so on" },
];
var PRACTICE_PICKS = 3; // the most lasers CUSTOM deals into the same bars, as the last levels deal; none is a pick too

// laser form's targets (TARGET_PHRASES, waves.js), with a line on each
var PRACTICE_TARGETS = { tune: "as high as the chorus's notes", hold: "four at one height", steps: "a stair, up or down",
    jump: "two at one height, then a leap", zigzag: "top, bottom, top, bottom", scatter: "anywhere, never twice close" };

// The boxes under the tiles: a press steps one to its next value. DIFFICULTY is the game's own setting, stepped here as
// it is on the level select
var PRACTICE_OPTIONS = [
    { name: "form", label: "FORM", values: ["wave", "laser", "switch"] },
    { name: "targets", label: "TARGETS", values: ["tune", "hold", "steps", "jump", "zigzag", "scatter"] },
    { name: "dodges", label: "DODGES", values: [0, 1, 2] },
    { name: "colors", label: "COLOURS", values: ["none", "solid", "pairs", "alt"] },
    { name: "act", label: "SONG", values: [1, 2, 3, 4, 5] },
    { name: "bpm", label: "TEMPO", values: [72, 84, 96, 102, 108, 114, 120, 126, 132] },
    { name: "warn", label: "WARNING", values: [2, 1.5, 1] },
    { name: "bars", label: "BARS", values: [4, 8, 16] },
    { name: "difficulty", label: "DIFFICULTY" },
];

// And the boxes under the preview: not what the pattern is, but how it is practised (loop.js reads them)
var PRACTICE_AIDS = [
    { name: "drive", label: "OVERDRIVE", values: ["off", "on", "auto"] },
    { name: "auto", label: "AUTO TIMING", values: [false, true] },
    { name: "restart", label: "RESTART ON HIT", values: [false, true] },
    { name: "loop", label: "LOOP", values: [false, true] },
];

// What each box does, for its tooltip
var PRACTICE_TIPS = {
    form: "How the bars are played. WAVE: you are the waves, dodging the lasers picked and hitting every beat in its "
        + "colour. LASER: laser form throughout, held to a line, lining up with each beat's target to hit it; the lasers "
        + "picked sit out. SWITCH: two bars of each by turns, with a gate between them to pass on its beat.",
    targets: "Where laser form's targets sit, one a beat. TUNE: as high as the chorus's notes. HOLD: four at one height. "
        + "STEPS: a stair, up or down. JUMP: two at one height, then a leap. ZIGZAG: top, bottom, top, bottom. "
        + "SCATTER: anywhere, never twice close. Laser form only: LASER or SWITCH.",
    dodges: "The lasers laser form fires across your path, at most this many a bar: each on a target's beat, across the "
        + "gap to the next target when the two are far apart. Hit the target, hold your line for the quarter beat it "
        + "burns, then cross. 0 leaves just the aiming. Laser form only: LASER or SWITCH.",
    colors: "The beats' colours, and so the key that hits each: Z for cyan, X for magenta. NONE: any key. SOLID: one "
        + "colour a bar. PAIRS: it changes on the half bar. ALT: it changes every beat.",
    act: "The act whose song plays, with its backdrop. The lasers fire on its melody's notes, as high on the screen as "
        + "each note, and laser form's targets follow its chorus, so the same lasers fall differently in each song.",
    bpm: "Beats a minute: the levels run from 96 to 132. Slow it down to learn a pattern, then bring it up to speed. The "
        + "song plays at it too.",
    warn: "How many beats ahead of firing a laser shows its outline: 2 in every level. Pick 1.5 or 1 for less time to "
        + "react. The difficulty scales it: longest on EASY, shortest on TRUE.",
    bars: "How long it runs: this many bars of the pattern, after the count-in and a bar's rest.",
    difficulty: "The game's own difficulty, so changing it here changes it for the game too. Here it sets the warnings, "
        + "how fast the moving lasers go, how wide the gaps in walls, corridors, pincers, cages and sweepers are, "
        + "and the points; nothing can be lost in practice, so its lives and shields don't count.",
    drive: "Overdrive in practice. OFF: the meter never fills. ON: it fills as hits charge it, and SPACE spends it, "
        + "as in a level. AUTO: it is spent the moment it is full. The OVERDRIVE setting in OPTIONS doesn't count here.",
    auto: "Every beat hit for you, exactly on it: all PERFECT, gates passed, in the colour each wants. You steer; in laser "
        + "form, lining up with each target is still yours. Your own Z and X do nothing; SPACE still spends overdrive.",
    restart: "A laser that gets you, or a gate let by, starts the practice again from the top, at once, rather than "
        + "being counted as a hit and played on.",
    loop: "The pattern goes round and round, its BARS a round, with no end and no results, until you pause and QUIT. "
        + "The HUD counts the rounds. In LEVELS, the whole level is the round.",
    levels: "The game's own levels, any of them, whole: their songs, their lasers, their laser form and their bosses, "
        + "as a run plays them, without lives and unrecorded. The preview plays the level picked, bar by bar.",
    bar: "Where the level starts. BAR 1 is the whole of it; the arrows step to the first bar of each laser it deals "
        + "that it hasn't dealt before, and of each laser form section, which starts there after the count-in, its song "
        + "as the level has it from that bar. The preview plays from it too. A boss has the health the targets still to "
        + "come can take, and LOOP goes round from it.",
    custom: "A pattern of your own, put together from the levels' makings: up to three lasers at once, or none, for the "
        + "beat alone, in the form, colours, song, tempo, warning and length you choose.",
};

var PRACTICE_STORE = "lazerwave.practice";
var PRACTICE_SECTIONS = ["levels", "custom"]; // the tabs, in order
var practiceOpts = { section: "levels", level: 1, bar: 1, phrases: ["rain"], form: "wave", targets: "tune", dodges: 1,
    colors: "solid", act: 1, bpm: 108, warn: 2, bars: 8, drive: "off", auto: false, restart: false, loop: false };

function practicePhrase(key) { // a phrase's entry, by its key, or null
    for (var i = 0; i < PRACTICE_PHRASES.length; i++) {
        if (PRACTICE_PHRASES[i].key == key) {
            return PRACTICE_PHRASES[i];
        }
    }
    return null;
}

function loadPractice() { // what was put together last time, field by field, each only if it is one the screen offers
    try {
        var got = JSON.parse(window.localStorage.getItem(PRACTICE_STORE));
        if (!got || typeof got != "object") {
            return;
        }
        PRACTICE_OPTIONS.concat(PRACTICE_AIDS).forEach(function (o) {
            if (o.values && o.values.indexOf(got[o.name]) >= 0) {
                practiceOpts[o.name] = got[o.name];
            }
        });
        if (Array.isArray(got.phrases)) {
            var ok = got.phrases.filter(function (k, i, all) { return practicePhrase(k) && all.indexOf(k) == i; });
            if (ok.length || !got.phrases.length) { // none picked was a choice; none left of what was is not
                practiceOpts.phrases = ok.slice(0, PRACTICE_PICKS);
            }
        }
        if (PRACTICE_SECTIONS.indexOf(got.section) >= 0) {
            practiceOpts.section = got.section;
        }
        if (got.level === Math.floor(got.level) && got.level >= 1 && got.level <= RUN_LEVELS) {
            practiceOpts.level = got.level;
        }
        if (got.bar === Math.floor(got.bar) && got.bar >= 1) { // held to the level's own bars where it is read
            practiceOpts.bar = got.bar;
        }
    } catch (e) { // a private window, or a value written by hand: the defaults stand
    }
}

function savePractice() {
    try {
        window.localStorage.setItem(PRACTICE_STORE, JSON.stringify(practiceOpts));
    } catch (e) { // not kept, then: it still plays
    }
}

loadPractice();

function practiceDef() { // the level the screen describes, as a LEVELS entry (waves.js), charted: the opening rest, then
    // the pattern for as many bars as asked, in the form asked; with no laser picked, rests, the beat alone
    var p = practiceOpts, bars = 1 + p.bars, wave = p.phrases.length ? p.phrases.join("+") : "rest";
    var laser = laserBars({ laser: p.form == "laser" ? [[1, p.bars]] : p.form == "switch" ? practiceSwitches(bars) : [] });
    var chart = ["rest"];
    for (var b = 1; b < bars; b++) {
        chart.push(laser[b] ? "laser:" + p.targets : wave);
    }
    return chartLevel({ name: "Practice", lore: [], bpm: p.bpm, warn: p.warn, chart: chart,
        colors: p.colors == "none" ? [] : [p.colors], dodges: p.dodges }, "Practice");
}

var PRACTICE_SWITCH = [2, 4]; // SWITCH: laser form for the first of these many bars in every second, from bar 2

function practiceSwitches(bars) { // SWITCH's laser sections, as LEVELS has them: [first bar, bars]
    var out = [];
    for (var b = 2; b < bars; b += PRACTICE_SWITCH[1]) {
        out.push([b, Math.min(PRACTICE_SWITCH[0], bars - b)]);
    }
    return out;
}

function practiceHost() { // the level whose song, colour and backdrop it borrows: the middle one of the act chosen
    return actFirstLevel(practiceOpts.act) + Math.floor(LEVELS_PER_ACT / 2);
}

function practiceLevels() { // the LEVELS section is up: a level of the game's own, rather than a pattern
    return practiceOpts.section == "levels";
}

function practiceWave() { // what a practice level plays (startLevel, loop.js): the level picked, or the pattern made
    return practiceLevels() ? levelDef(practiceOpts.level) : practiceDef();
}

function practiceLevelNo() { // the level whose song, colour, backdrop and seeds it plays in: the one picked, or the
    // pattern's host
    return practiceLevels() ? practiceOpts.level : practiceHost();
}

function practiceBarStops(n) { // the bars START AT offers on level n: its first after its rest, and the first bar of every
    // laser it deals that it hasn't dealt before, and of every laser form section -- not every bar, most of which deal
    // again what one before them did (level 1 is melody throughout)
    var dealt = practiceDealt(n), seen = {}, stops = [];
    for (var b = 1; b < dealt.length; b++) {
        var k = dealt[b];
        if (k == "rest" || (k == "laser" ? dealt[b - 1] == "laser" : seen[k])) {
            continue;
        }
        seen[k] = true;
        stops.push(b);
    }
    return stops;
}

function practiceBar() { // START AT as the screen shows it: the stop at the bar kept, or the last before it
    var stops = practiceBarStops(practiceOpts.level), bar = stops[0];
    stops.forEach(function (s) {
        if (s <= practiceOpts.bar) {
            bar = s;
        }
    });
    return bar;
}

function practiceBarsOff() { // a level dealing one laser throughout has nowhere else to start
    return practiceBarStops(practiceOpts.level).length < 2;
}

function drawPracticeCaption() { // in a practice level, what the bar playing deals, at the top right, level with the
    // score: "BAR 9   CROSSFIRE + MELODY", as the preview and START AT name them; from the first bar played
    if (!practice || !timeline.dealt || beatPos < firstPlayBeat()) {
        return;
    }
    var bar = levelBar(Math.floor(beatPos / BEATS_PER_BAR) - COUNT_IN_BARS), k = timeline.dealt[bar];
    if (k === undefined) {
        return;
    }
    var s = hudScale(), x = gameArea.canvas.width - 50 * s, y = 70 * (1 - s) + 100 * s; // as the HUD is placed
    var name = k == "laser" ? "LASER FORM" : k == "rest" ? "REST" : practicePhraseName(k);
    var num = bar > 0 ? "BAR " + bar + "   " : "";
    ctx.save();
    ctx.shadowColor = COLORS.bg; // the HUD's dark halo, for a beam burning behind it
    ctx.shadowBlur = 6;
    ctx.textAlign = "right";
    ctx.font = Math.round(26 * s) + "px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText(name, x, y);
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(num, x - ctx.measureText(name).width, y);
    ctx.restore();
}

function practiceFromBar() { // the bar a practice level starts at (fromBar, loop.js): 0, from the top, rest and all, for
    // BAR 1 and in CUSTOM; a later bar, straight after the count-in
    return practiceLevels() && practiceBar() > 1 ? practiceBar() : 0;
}

function practiceLoopOff() { // LOOP has no say on a boss level, which goes round by itself until its boss falls
    return practiceLevels() && !!levelDef(practiceOpts.level).boss;
}

function practiceLoopOn() { // LOOP, where it has its say (practiceLoop, loop.js)
    return practiceOpts.loop && !practiceLoopOff();
}

function practiceLabel() { // what is being practised, as the HUD says it: "RAIN + CAGE", or "LEVEL 15 FROM BAR 5"
    if (practiceLevels()) {
        return "LEVEL " + practiceOpts.level + (practiceFromBar() ? " FROM BAR " + practiceFromBar() : "");
    }
    return practiceOpts.phrases.map(function (k) { return practicePhrase(k).name; }).join(" + ") || "NO LASERS";
}

function practiceTitle() { // and as the results say it, with a level's name: "LEVEL 15  STATIC BLOOM  FROM BAR 5"
    return practiceLevels() ? "LEVEL " + practiceOpts.level + "  " + levelDef(practiceOpts.level).name.toUpperCase()
        + (practiceFromBar() ? "  FROM BAR " + practiceFromBar() : "") : practiceLabel();
}

function practiceBarText(n, bar) { // what bar `bar` of level n deals, as START AT names it
    var k = practiceDealt(n)[bar];
    return k == "laser" ? "LASER FORM" : k == "rest" || !k ? "REST" : practicePhraseName(k);
}

function practicePhraseName(key) { // a bar's lasers, as the tiles name them: "SWEEPER + CAGE"
    return key.split("+").map(function (k) {
        var ph = practicePhrase(k);
        return ph ? ph.name : k.toUpperCase();
    }).join(" + ");
}

var practiceDealtCache = {};

function practiceDealt(n) { // what level n deals, bar by bar, as its timeline does (buildTimeline, waves.js)
    return practiceDealtCache[n] || (practiceDealtCache[n] = buildTimeline(n).dealt);
}

var PRACTICE_PLACES = ["", "first", "second", "third", "fourth", "fifth"];

function practiceLevelLines(n) { // what the description says of level n: its name and its place in the game; its tempo,
    // length and warnings and where laser form is; and the lasers it deals, in the order it first deals them
    var def = levelDef(n), a = levelAct(n), act = "ACT " + roman(a) + ", " + ACTS[a].name, deals = [];
    var laser = (def.laser || []).map(function (s) {
        return s[1] > 1 ? "bars " + s[0] + " to " + (s[0] + s[1] - 1) : "bar " + s[0];
    });
    practiceDealt(n).forEach(function (k) {
        if (k != "rest" && k != "laser" && deals.indexOf(k) < 0) {
            deals.push(k);
        }
    });
    return [[def.name.toUpperCase() + ": level " + n + ", " + (def.boss ? "the boss of " : "the "
            + PRACTICE_PLACES[levelInAct(n)] + " of ") + act, COLORS.text],
        [def.bpm + " BPM, " + (def.bars - 1) + " bars after its rest, warnings of " + def.warn + (def.warn == 1 ? " beat"
            : " beats") + "; " + (laser.length ? "laser form in " + laser.join(" and ") : "all in wave form"), COLORS.dim],
        ["LASERS: " + deals.map(practicePhraseName).join(", "), COLORS.dim]];
}

function practiceLevelTip(n) { // the same, for a level's tooltip, whose head says its name
    var l = practiceLevelLines(n), place = l[0][0].slice(l[0][0].indexOf(": ") + 2);
    return place.charAt(0).toUpperCase() + place.slice(1) + ". " + l[1][0] + ". " + l[2][0] + ".";
}

function practiceFormLine() { // what the form makes of it: "" for wave form, where the lasers picked are the bars
    var p = practiceOpts, none = !p.phrases.length;
    var dodge = p.dodges ? p.dodges + " laser" + (p.dodges > 1 ? "s" : "") + " to dodge a bar" : "no lasers to dodge";
    var targets = "targets " + p.targets.toUpperCase() + ", " + PRACTICE_TARGETS[p.targets] + "; " + dodge;
    return p.form == "laser" ? "LASER FORM throughout: " + targets + (none ? "" : ". The lasers picked sit out")
        : p.form == "switch" ? "SWITCH: two bars of " + (none ? "the beat alone" : "the lasers") + ", two of laser form, by"
        + " turns: " + targets : "";
}

function practiceLines() { // what CUSTOM says under the preview, as [text, colour] lines: what each laser picked does
    // (unless the form has them sit out), or that there are none, in wave form, but the beat; then what the form makes
    // of it, and a word on a pair the levels never deal. With more than fit, the lasers picked share a line
    var picked = practiceOpts.phrases, form = practiceFormLine(), note = practiceNote();
    var more = [[form, COLORS.dim], [note, COLORS.late]].filter(function (l) { return l[0]; });
    var each = practiceTilesOff() ? [] : picked.map(function (k) {
        var ph = practicePhrase(k);
        return [ph.name + ": " + ph.info, COLORS.text];
    });
    if (!picked.length && practiceOpts.form == "wave") {
        each = [["NO LASERS: the beat alone, every bar, to hit in time with the song", COLORS.text]];
    }
    if (each.length + more.length > PR_LINES_MAX) {
        each = [[practicePhraseName(picked.join("+")) + ": " + (picked.length > 2 ? "all three" : "both")
            + " dealt into the same bars", COLORS.text]];
    }
    return each.concat(more);
}

function practiceNote() { // a word on a pair the levels never deal, and why; "" for any other
    var p = practiceOpts.phrases;
    if (p.length < 2) {
        return "";
    }
    if (p.indexOf("corridor") >= 0) {
        return "The levels deal a corridor alone: its gap is the only place to be";
    }
    if (p.indexOf("cage") >= 0 && (p.indexOf("melody") >= 0 || p.indexOf("mirror") >= 0)) {
        return "The levels never deal this pair: the laser on the note burns through the cage's cell";
    }
    var drifting = p.some(function (k) { return k == "roll" || k == "swarm" || k == "mines"; });
    if (drifting && p.some(function (k) { return k == "cage" || k == "pincer" || k == "close"; })) {
        return "The levels never deal this pair: the drifting lasers cross the place it asks you into";
    }
    return "";
}

// The session's bests: the most each setup has scored since the page was opened, held here and nowhere else, so a
// reload (or leaving the page) starts them again. A setup is everything that changes the level or its points
// (practiceKey); the best climbs with the score as it passes it, as an arcade's high score does, so a LOOP that is
// still going counts, and so does an attempt RESTART ON HIT cut short
var practiceBests = {}; // setup key -> best
var practiceRun = { key: "", from: 0 }; // the attempt being played: its setup's key, and the best it set out to beat

function practiceKey() { // the setup a best is kept for: the pattern as dealt (what the form makes no use of left out), the
    // difficulty, and the aids that change the points. RESTART ON HIT only ends attempts early, so it shares them
    var p = practiceOpts;
    if (practiceLevels()) { // a level is its own pattern, from the bar it starts at
        return ["level", p.level, practiceFromBar(), modeName(), p.drive, p.auto, practiceLoopOn()].join("|");
    }
    return [p.form == "laser" ? "" : p.phrases.join("+"), p.form, p.form == "wave" ? "" : p.targets + " " + p.dodges,
        p.colors, p.act, p.bpm, p.warn, p.bars, modeName(), p.drive, p.auto, p.loop].join("|");
}

function practiceAttempt() { // a practice level starts (startLevel, loop.js): its setup, and the best it has to beat
    practiceRun.key = practiceKey();
    practiceRun.from = practiceBests[practiceRun.key] || 0;
}

function notePracticeScore() { // the points so far, the setup's best if they are more: every step, and as a level stops
    if (practice && score > (practiceBests[practiceRun.key] || 0)) {
        practiceBests[practiceRun.key] = score;
    }
}

function practiceNewBest() { // is this attempt beating the best its setup had when it began
    return practice && score > practiceRun.from;
}

function practiceBestText(key) { // a setup's best as the HUD and the results show it ("-" before it has scored); the
    // attempt's own, by default
    var best = practiceBests[key === undefined ? practiceRun.key : key];
    return best === undefined ? "-" : scoreText(best);
}

// The screen, in layout coordinates from its middle: the tabs over the left column, and under them the tiles and the
// boxes, the section's own; on the right the preview, the aids' boxes, what is picked, and PLAY
var PR_LEFT = -570, PR_RIGHT = 20, PR_COL_W = 550; // the two columns' left edges, and how wide each is
var PR_TOP = -210; // the tiles' top, and the preview's
var PR_TAB_W = 120, PR_TAB_H = 32, PR_TAB_GX = 10, PR_TAB_TOP = -248; // the tabs, over the tiles' top left
var PR_HEAD_Y = -226; // the columns' headings' baseline: the hint beside the tabs, PREVIEW and the session best
var PR_LV_W = 102, PR_LV_H = 54, PR_LV_GX = 10; // LEVELS: a level's tile, five to an act's row
var PR_LV_ACT = 90, PR_LV_NAME = 15, PR_LV_TILES = 21; // an act's row: from its top, its name's baseline and its tiles'
var PR_BAR_ARROW = 50, PR_BAR_GAP = 6; // START AT, beside the difficulty: its arrows either side of its box
var PR_TILE_W = 130, PR_TILE_H = 32, PR_TILE_GX = 10, PR_TILE_GY = 6, PR_TILE_COLS = 4; // eight rows, over the boxes
var PR_OPT_TOP = 126, PR_OPT_W = 176, PR_OPT_H = 58, PR_OPT_GX = 11, PR_OPT_GY = 9, PR_OPT_COLS = 3;
var PR_BOX = { dx: PR_RIGHT, dy: PR_TOP, w: PR_COL_W, h: 344 }; // the preview, as the game is laid out, 16:10
var PR_AID_TOP = 144, PR_AID_W = 130, PR_AID_H = 44, PR_AID_GX = 10; // the aids' row, under it, the column across
var PR_LINES_TOP = 208, PR_LINES_PITCH = 19; // the lines on what the lasers picked do: the first's baseline, and apart
var PR_LINES_MAX = 3; // and how many fit between the aids and PLAY
var PR_PLAY_TOP = 260, PR_PLAY_H = 58; // PLAY and BACK, level with the boxes' last row
var PR_TIP_W = 440, PR_TIP_PAD = 12, PR_TIP_LINE = 20; // a tooltip: the most its text runs across, its edge, its lines
var practiceTables = {}; // each section's buttons, built once: they never move
var practiceTipFor = ""; // in touch play, the tile or box last tapped, whose tooltip stays up: a finger can't hover

function practiceTilesOff() { // laser form throughout deals no wave bars, so the lasers picked sit out
    return practiceOpts.form == "laser";
}

function practiceTargetsOff() { // and wave form has no targets, nor lasers fired between them
    return practiceOpts.form == "wave";
}

var PRACTICE_OFF_NOTES = { // a greyed-out tile's or box's tooltip says why it is off, and what turns it on
    tile: "Off in LASER form, which deals only targets: set FORM to WAVE or SWITCH to deal it.",
    laser: "Off in WAVE form, which has no targets: set FORM to LASER or SWITCH to use it.",
    loop: "Off on a boss level, which goes round by itself until its boss falls.",
    bar: "Off on a level that deals one laser throughout: it starts at BAR 1.",
};

function practiceButtons() { // the section's buttons: the tabs, "pr_tab_levels"; in LEVELS a tile a level, "pr_lv_15",
    // and the difficulty's box; in CUSTOM a tile a phrase, "pr_ph_rain", and a box an option, "pr_op_form"; in both an
    // aid's box, "pr_aid_loop" (an option too, marked aid), PLAY and BACK. A tile or box with no say in what is set up
    // says so (inactive), and is drawn greyed out and takes no press
    var section = practiceOpts.section;
    if (!practiceTables[section]) {
        var t = practiceTables[section] = {};
        PRACTICE_SECTIONS.forEach(function (s, i) {
            t["pr_tab_" + s] = { dx: PR_LEFT + i * (PR_TAB_W + PR_TAB_GX), dy: PR_TAB_TOP, w: PR_TAB_W, h: PR_TAB_H,
                tab: s, label: s.toUpperCase() };
        });
        if (section == "levels") {
            for (var n = 1; n <= RUN_LEVELS; n++) {
                t["pr_lv_" + n] = { dx: PR_LEFT + (levelInAct(n) - 1) * (PR_LV_W + PR_LV_GX),
                    dy: PR_TOP + (levelAct(n) - 1) * PR_LV_ACT + PR_LV_TILES, w: PR_LV_W, h: PR_LV_H, lv: n };
            }
            t.pr_lv_difficulty = { dx: PR_LEFT, dy: PR_PLAY_TOP, w: PR_OPT_W, h: PR_OPT_H,
                option: PRACTICE_OPTIONS[PRACTICE_OPTIONS.length - 1] }; // DIFFICULTY, the custom boxes' last
            var left = PR_LEFT + PR_OPT_W + PR_OPT_GX, right = PR_LEFT + PR_COL_W; // and START AT, the rest of the row:
            var off = { inactive: practiceBarsOff, offNote: PRACTICE_OFF_NOTES.bar }; // greyed out with one bar to offer
            t.pr_lv_bar_back = Object.assign({ dx: left, dy: PR_PLAY_TOP, w: PR_BAR_ARROW, h: PR_OPT_H, barStep: -1 }, off);
            t.pr_lv_bar = Object.assign({ dx: left + PR_BAR_ARROW + PR_BAR_GAP, dy: PR_PLAY_TOP, // the stop back, the bar
                w: right - left - 2 * (PR_BAR_ARROW + PR_BAR_GAP), h: PR_OPT_H, barStep: 1, barBox: true }, off); // (a press
            t.pr_lv_bar_on = Object.assign({ dx: right - PR_BAR_ARROW, dy: PR_PLAY_TOP, w: PR_BAR_ARROW, h: PR_OPT_H, // steps it
                barStep: 1 }, off); // on, as a box's does) and the stop on
        } else {
            PRACTICE_PHRASES.forEach(function (ph, i) {
                t["pr_ph_" + ph.key] = { dx: PR_LEFT + (i % PR_TILE_COLS) * (PR_TILE_W + PR_TILE_GX),
                    dy: PR_TOP + Math.floor(i / PR_TILE_COLS) * (PR_TILE_H + PR_TILE_GY), w: PR_TILE_W, h: PR_TILE_H,
                    phrase: ph, inactive: practiceTilesOff, offNote: PRACTICE_OFF_NOTES.tile };
            });
            PRACTICE_OPTIONS.forEach(function (o, i) {
                var laserOnly = o.name == "targets" || o.name == "dodges";
                t["pr_op_" + o.name] = { dx: PR_LEFT + (i % PR_OPT_COLS) * (PR_OPT_W + PR_OPT_GX),
                    dy: PR_OPT_TOP + Math.floor(i / PR_OPT_COLS) * (PR_OPT_H + PR_OPT_GY), w: PR_OPT_W, h: PR_OPT_H,
                    option: o, inactive: laserOnly ? practiceTargetsOff : null, offNote: laserOnly ? PRACTICE_OFF_NOTES.laser : "" };
            });
        }
        PRACTICE_AIDS.forEach(function (o, i) {
            var loop = o.name == "loop";
            t["pr_aid_" + o.name] = { dx: PR_RIGHT + i * (PR_AID_W + PR_AID_GX), dy: PR_AID_TOP, w: PR_AID_W,
                h: PR_AID_H, option: o, aid: true, inactive: loop ? practiceLoopOff : null, offNote: loop ? PRACTICE_OFF_NOTES.loop : "" };
        });
        t.pr_play = { dx: PR_RIGHT, dy: PR_PLAY_TOP, w: 360, h: PR_PLAY_H, play: true };
        t.pr_back = { dx: PR_RIGHT + 372, dy: PR_PLAY_TOP, w: PR_COL_W - 372, h: PR_PLAY_H, back: true };
    }
    return practiceTables[section];
}

function practiceValueText(o) { // what an option's box says it is set to
    if (o.name == "difficulty") {
        return modeName();
    }
    var v = practiceOpts[o.name];
    return v === true ? "ON" : v === false ? "OFF" : o.name == "act" ? "ACT " + roman(v) : o.name == "bpm" ? v + " BPM"
        : o.name == "warn" ? v + (v == 1 ? " BEAT" : " BEATS") : String(v).toUpperCase();
}

function practiceAidOn(o) { // is an aid doing anything: on, or OVERDRIVE at either of its settings that has a meter
    return practiceOpts[o.name] !== false && practiceOpts[o.name] != "off";
}

function drawPracticeAid(b) { // an aid's box: its setting over its name, as an option's is; while it is doing
    // something, washed in cyan and lettered in white, as a picked tile is
    var x0 = LAYOUT_W / 2 + b.dx, y0 = LAYOUT_H / 2 + b.dy, on = practiceAidOn(b.option);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(x0, y0, b.w, b.h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    if (on) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = COLORS.cyan;
        ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
        ctx.globalAlpha = 1;
    }
    ctx.textAlign = "center";
    ctx.font = (on ? "bold " : "") + "20px Arial";
    ctx.fillStyle = on ? COLORS.text : COLORS.magenta;
    ctx.fillText(practiceValueText(b.option), x0 + b.w / 2, y0 + 20, b.w - 16);
    ctx.font = "11px Arial";
    ctx.fillStyle = on ? COLORS.text : COLORS.dim;
    ctx.fillText(b.option.label, x0 + b.w / 2, y0 + 36, b.w - 16);
    ctx.textAlign = "start";
    dimPracticeBox(b);
}

function dimPracticeBox(b) { // a box with no say in what is set up, greyed out: dimmed to PR_OFF_ALPHA of itself, its
    // ground left dark, as a greyed-out tile's is (a box drawn see-through shows its frame's cyan through its ground, as
    // a lit one is washed)
    if (practiceOff(b)) {
        ctx.globalAlpha = 1 - PR_OFF_ALPHA;
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(LAYOUT_W / 2 + b.dx, LAYOUT_H / 2 + b.dy, b.w, b.h);
        ctx.globalAlpha = 1;
    }
}

function drawPracticeTab(b) { // a section's tab: lit, as a picked tile is, while its section is up
    var x0 = LAYOUT_W / 2 + b.dx, y0 = LAYOUT_H / 2 + b.dy, on = practiceOpts.section == b.tab;
    ctx.globalAlpha = on ? 1 : 0.45;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(x0, y0, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    if (on) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = COLORS.cyan;
        ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
        ctx.globalAlpha = 1;
    }
    ctx.font = (on ? "bold " : "") + "17px Arial";
    ctx.fillStyle = on ? COLORS.text : COLORS.dim;
    ctx.textAlign = "center";
    ctx.fillText(b.label, x0 + b.w / 2, y0 + b.h / 2 + 6, b.w - 10);
    ctx.textAlign = "start";
}

function drawPracticeArrow(b) { // START AT's arrow, a bar back or on: a box with a triangle pointing the way
    var x0 = LAYOUT_W / 2 + b.dx, y0 = LAYOUT_H / 2 + b.dy, mx = x0 + b.w / 2, my = y0 + b.h / 2, s = 10;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(x0, y0, b.w, b.h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    ctx.fillStyle = COLORS.magenta;
    ctx.beginPath();
    ctx.moveTo(mx + b.barStep * s * 0.8, my);
    ctx.lineTo(mx - b.barStep * s * 0.6, my - s);
    ctx.lineTo(mx - b.barStep * s * 0.6, my + s);
    ctx.closePath();
    ctx.fill();
}

function drawPracticeAct(a) { // LEVELS: an act's row, its number and name over its tiles, in the colour of its intro
    ctx.textAlign = "start";
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = skyRGBA(levelColor(actFirstLevel(a) + Math.floor(LEVELS_PER_ACT / 2)), 1, 0.25);
    ctx.fillText("ACT " + roman(a) + "  " + ACTS[a].name, LAYOUT_W / 2 + PR_LEFT,
        LAYOUT_H / 2 + PR_TOP + (a - 1) * PR_LV_ACT + PR_LV_NAME);
}

function drawPracticeLevel(b) { // LEVELS: a level's tile, in its colour of the spectrum as on the level select: its
    // number and its name, and BOSS on an act's last; washed in its colour and framed in white while it is the one picked
    var x0 = LAYOUT_W / 2 + b.dx, y0 = LAYOUT_H / 2 + b.dy, n = b.lv, col = levelColor(n);
    var on = practiceOpts.level == n, name = on ? COLORS.text : skyRGBA(col, 1, 0.5);
    ctx.fillStyle = skyRGBA(col, 1);
    ctx.fillRect(x0, y0, b.w, b.h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    ctx.fillStyle = skyRGBA(col, on ? 0.45 : 0.12);
    ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    if (on) {
        ctx.strokeStyle = COLORS.laserCore;
        ctx.lineWidth = 2;
        ctx.strokeRect(x0 + 4, y0 + 4, b.w - 8, b.h - 8);
    }
    ctx.textAlign = "start";
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText(String(n), x0 + 10, y0 + 25);
    ctx.font = "13px Arial";
    ctx.fillStyle = name;
    ctx.fillText(levelDef(n).name, x0 + 10, y0 + 44, b.w - 18);
    if (levelDef(n).boss) {
        ctx.textAlign = "right";
        ctx.font = "bold 11px Arial";
        ctx.fillText("BOSS", x0 + b.w - 9, y0 + 20);
        ctx.textAlign = "start";
    }
}

function drawPracticeScreen() { // the screen: the tiles, the boxes, the preview and PLAY
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2, table = practiceButtons();
    useWindow();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);

    useScreenFrame();
    ctx.textAlign = "center";
    ctx.font = "64px Arial";
    ctx.fillStyle = COLORS.cyan; // the title printed twice, as the other menus' are
    ctx.fillText("PRACTICE", cx - 4, cy - 286);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText("PRACTICE", cx, cy - 282);
    ctx.font = "24px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("練習", cx, cy - 252);
    ctx.textAlign = "start";
    ctx.font = "16px Arial";
    ctx.fillStyle = COLORS.dim; // beside the tabs, what to do in the section up
    ctx.fillText(practiceLevels() ? "pick a level, and the bar to start at" : practiceTilesOff()
        ? "lasers: off in LASER form" : "pick up to three lasers, or none",
        cx + PR_LEFT + 2 * (PR_TAB_W + PR_TAB_GX) + 6, cy + PR_HEAD_Y, PR_COL_W - 2 * (PR_TAB_W + PR_TAB_GX) - 6);
    ctx.font = "18px Arial";
    ctx.fillText("PREVIEW", cx + PR_RIGHT, cy + PR_HEAD_Y);
    if (practiceBests[practiceKey()] !== undefined) { // and over its right edge, once this setup has scored, its best
        var bestText = practiceBestText(practiceKey()), right = cx + PR_RIGHT + PR_COL_W; // this session
        ctx.textAlign = "right";
        ctx.fillStyle = COLORS.text;
        ctx.fillText(bestText, right, cy + PR_HEAD_Y);
        ctx.fillStyle = COLORS.dim;
        ctx.fillText("SESSION BEST  ", right - ctx.measureText(bestText).width, cy + PR_HEAD_Y);
        ctx.textAlign = "start";
    }

    if (practiceLevels()) {
        for (var a = 1; a < ACTS.length; a++) {
            drawPracticeAct(a);
        }
    }
    for (var name in table) {
        var b = table[name];
        if (b.tab) {
            drawPracticeTab(b);
        } else if (b.lv) {
            drawPracticeLevel(b);
        } else if (b.barBox) {
            drawMenuButton(b, "BAR " + practiceBar(), "22px Arial",
                ["START AT · " + practiceBarText(practiceOpts.level, practiceBar())]);
            dimPracticeBox(b);
        } else if (b.barStep) {
            drawPracticeArrow(b);
            dimPracticeBox(b);
        } else if (b.phrase) {
            drawPracticeTile(b);
        } else if (b.aid) {
            drawPracticeAid(b);
        } else if (b.option) {
            drawMenuButton(b, practiceValueText(b.option), "22px Arial",
                [b.option.name == "act" ? "SONG · " + ACTS[practiceOpts.act].name : b.option.label]);
            dimPracticeBox(b); // greyed out when the form makes no use of it
        }
    }
    var play = table.pr_play; // the way on, washed in cyan as START is
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(cx + play.dx, cy + play.dy, play.w, play.h);
    ctx.globalAlpha = 1;
    drawMenuButton(play, "PLAY 練習開始", "30px Arial");
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(cx + play.dx + 2, cy + play.dy + 2, play.w - 4, play.h - 4);
    ctx.globalAlpha = 1;
    drawMenuButton(table.pr_back, "BACK", "28px Arial");

    var lines = practiceLevels() ? practiceLevelLines(practiceOpts.level) : practiceLines(); // under the preview
    ctx.font = "15px Arial";
    lines.slice(0, PR_LINES_MAX).forEach(function (line, i) {
        ctx.fillStyle = line[1];
        ctx.fillText(line[0], cx + PR_RIGHT, cy + PR_LINES_TOP + i * PR_LINES_PITCH, PR_COL_W);
    });

    drawScreenBanners();
    drawPracticePreview(performance.now()); // the preview as it stands, and its loop to keep it moving
    drawPracticeTip();
    practicePreviewRun();
}

function practiceOpened() { // the screen comes up: the preview from the top, and no tooltip held over from last time
    practiceTipFor = "";
    previewReset();
}

function practiceTip(name) { // the tooltip for a button: { head, text, b }, or null for one without
    var b = name ? practiceButtons()[name] : null;
    if (b && b.tab) {
        return { head: b.label, text: PRACTICE_TIPS[b.tab], b: b };
    }
    if (b && b.lv) {
        return { head: "LEVEL " + b.lv + "  " + levelDef(b.lv).name.toUpperCase(), text: practiceLevelTip(b.lv), b: b };
    }
    if (b && b.barStep) {
        return { head: "START AT", text: PRACTICE_TIPS.bar, b: b };
    }
    if (b && b.phrase) {
        return { head: b.phrase.name, text: b.phrase.info.charAt(0).toUpperCase() + b.phrase.info.slice(1) + ".", b: b };
    }
    if (b && b.option) {
        return { head: b.option.label, text: PRACTICE_TIPS[b.option.name], b: b };
    }
    return null;
}

function drawPracticeTip() { // the tooltip for the tile or box under the pointer, or lit for a controller, or in touch
    // play the one tapped last: a panel beside it, kept in the left column, clear of the preview
    var tip = practiceTip(hoveredButton) || (inputMode == "touch" ? practiceTip(practiceTipFor) : null);
    if (!tip || menuScreen != "practice") {
        return;
    }
    var f = screenFrame(), b = tip.b;
    ctx.save();
    ctx.setTransform(f.scale, 0, 0, f.scale, f.x, f.y);
    ctx.font = "16px Arial";
    var wrap = function (text, color) { // a text wrapped to the tooltip's width, as [line, colour] pairs
        var out = [], line = "";
        text.split(" ").forEach(function (word) {
            var next = line ? line + " " + word : word;
            if (ctx.measureText(next).width > PR_TIP_W && line) {
                out.push([line, color]);
                line = word;
            } else {
                line = next;
            }
        });
        out.push([line, color]);
        return out;
    };
    var lines = wrap(tip.text, COLORS.text); // what it does, and when it is greyed out why, and what turns it on
    if (practiceOff(b) && b.offNote) {
        lines = lines.concat(wrap(b.offNote, COLORS.late));
    }
    var w = 0;
    lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l[0]).width); });
    ctx.font = "bold 16px Arial";
    w = Math.max(w, ctx.measureText(tip.head).width) + 2 * PR_TIP_PAD;
    var h = (lines.length + 1) * PR_TIP_LINE + 2 * PR_TIP_PAD - 4;
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2;
    var left = b.aid ? Math.min(b.dx, PR_RIGHT + PR_COL_W - w) // an aid's over the preview's foot, which it doesn't change
        : Math.max(PR_LEFT, Math.min(PR_RIGHT - 40 - w, b.dx)); // the rest in the left column, over the tiles and boxes
    var below = b.tab || b.phrase && b.dy < PR_TOP + 3 * (PR_TILE_H + PR_TILE_GY) // a tab, or a tile in the top rows:
        || b.lv && b.dy < PR_TOP + 2 * PR_LV_ACT; // under it; anything else over it
    var top = below ? b.dy + b.h + 8 : b.dy - 8 - h;
    var x0 = cx + left, y0 = cy + top;
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0, y0, w, h);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = b.lv ? skyRGBA(levelColor(b.lv), 1) : b.phrase ? COLORS.magenta : COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0, w, h);
    ctx.textAlign = "start";
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(tip.head, x0 + PR_TIP_PAD, y0 + PR_TIP_PAD + 14);
    ctx.font = "16px Arial";
    lines.forEach(function (l, i) {
        ctx.fillStyle = l[1];
        ctx.fillText(l[0], x0 + PR_TIP_PAD, y0 + PR_TIP_PAD + 14 + (i + 1) * PR_TIP_LINE);
    });
    ctx.restore();
}

var PR_OFF_ALPHA = 0.3; // a greyed-out tile or box: drawn at this much of itself

function practiceOff(b) { // is a tile or box one the form makes no use of
    return !!(b && b.inactive && b.inactive());
}

function drawPracticeTile(b) { // a phrase's tile: lit cyan when it is the first picked, magenta the second, white the
    // third; greyed out, its pick still showing, when the form deals no lasers
    var x0 = LAYOUT_W / 2 + b.dx, y0 = LAYOUT_H / 2 + b.dy, at = practiceOpts.phrases.indexOf(b.phrase.key);
    var tint = [COLORS.cyan, COLORS.magenta, COLORS.text][at] || null, k = practiceOff(b) ? PR_OFF_ALPHA : 1;
    ctx.globalAlpha = k * (tint ? 1 : 0.45);
    ctx.fillStyle = tint || COLORS.cyan;
    ctx.fillRect(x0, y0, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    if (tint) {
        ctx.globalAlpha = k * 0.25;
        ctx.fillStyle = tint;
        ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    }
    ctx.globalAlpha = k;
    ctx.font = (tint ? "bold " : "") + "16px Arial";
    ctx.fillStyle = tint ? COLORS.text : COLORS.dim;
    ctx.textAlign = "center";
    ctx.fillText(b.phrase.name, x0 + b.w / 2, y0 + b.h / 2 + 6, b.w - 10);
    ctx.textAlign = "start";
    ctx.globalAlpha = 1;
}

function practicePress(name, p) { // a press on the screen: a tile picks or drops its laser, a box steps its option, PLAY
    // plays, BACK leaves (p: where the pointer was, for the mouse's piece)
    var b = practiceButtons()[name];
    if (!b) {
        return;
    }
    if (b.back) {
        closeMenu();
        return;
    }
    if (b.play) {
        startPracticeRun(p);
        return;
    }
    practiceTipFor = name; // what it does stays up, for a finger that can't hover
    if (practiceOff(b)) { // greyed out: nothing to change, but its tooltip says why
        drawStartScreen();
        return;
    }
    if (b.tab) { // the other section, as it was left
        practiceOpts.section = b.tab;
    } else if (b.lv) { // another level starts from its top
        if (practiceOpts.level != b.lv) {
            practiceOpts.level = b.lv;
            practiceOpts.bar = 1;
        }
    } else if (b.barStep) { // START AT: the stop back or on, round from the last to the first
        var stops = practiceBarStops(practiceOpts.level), at = stops.indexOf(practiceBar());
        practiceOpts.bar = stops[(at + b.barStep + stops.length) % stops.length];
    } else if (b.phrase) { // picked, dropped, the last one too, leaving the beat alone (practiceDef)
        var list = practiceOpts.phrases, at = list.indexOf(b.phrase.key);
        if (at >= 0) {
            list.splice(at, 1);
        } else if (list.length < PRACTICE_PICKS) {
            list.push(b.phrase.key);
        } else {
            list[PRACTICE_PICKS - 1] = b.phrase.key; // one more: it takes the last one's place
        }
    } else if (b.option.name == "difficulty") {
        storeSetting("difficulty", SETTINGS.difficulty.next());
    } else {
        var o = b.option, i = o.values.indexOf(practiceOpts[o.name]);
        practiceOpts[o.name] = o.values[(i + 1) % o.values.length];
    }
    savePractice();
    playSound(aud_click);
    if (!b.aid) { // an aid changes how it is played, not the pattern: the preview plays on
        previewReset();
    }
    drawStartScreen();
}

function practiceRestart() { // RESTART ON HIT, from the step a hit came in: the level stops there and starts again from
    // the top, from nothing, as the pause's RETRY does. Started once that step's frame is through, so the loop it was
    // running in has ended and the new one runs alone
    stopLevel();
    score = 0;
    setTimeout(function () {
        if (practice && gameStart && !alive) {
            bossSirenQuiet = true; // a boss level's siren once, not at every restart (boss.js)
            startNextLevel();
        }
    }, 0);
}

function startPracticeRun(p) { // PLAY: the pattern as a level, started as START starts a run for the input in use
    menuScreen = ""; // it goes without being drawn again: the level comes straight up
    hoveredButton = "";
    practice = true;
    bossRush = false;
    level = practiceLevelNo();
    if (inputMode == "touch") {
        startTouchGame();
    } else if (inputMode == "pad") {
        startPadGame();
    } else {
        startGame({ pageX: p ? p.x : gameArea.canvas.width / 4, pageY: p ? p.y : gameArea.canvas.height / 2 });
    }
}

// The preview: the pattern's first two bars (three when it switches form, so the switch is in them), or a level's every
// bar after its rest, played round and round, warnings and all, with a piece to show where the player would be:
// drifting in wave form, lining up with each target in laser form
var PREVIEW_W = 1280, PREVIEW_H = 800; // its canvas: the layout's size, so it is the game as laid out, whatever the window
var pv = null; // { canvas, ctx, def, level, timeline, queue, next, hazards, from, to, end, at, now, round, piece, frame }

function previewReset() { // build the pattern the screen describes, and play it from the top
    if (!pv) {
        var c = document.createElement("canvas");
        c.width = PREVIEW_W;
        c.height = PREVIEW_H;
        pv = { canvas: c, ctx: c.getContext("2d"), frame: 0 };
    }
    pv.def = practiceWave();
    pv.level = practiceLevelNo();
    pv.timeline = buildTimeline(pv.level, pv.def);
    var first = (COUNT_IN_BARS + Math.max(1, practiceFromBar())) * BEATS_PER_BAR; // the pattern's first bar, after the
    pv.first = first; // opening rest, or the bar START AT starts at
    pv.end = practiceLevels() ? (COUNT_IN_BARS + pv.def.bars) * BEATS_PER_BAR
        : first + (practiceOpts.form == "switch" ? 3 : 2) * BEATS_PER_BAR;
    var warn = pv.def.warn * mode().warn, shows = first;
    pv.queue = pv.timeline.filter(function (ev) { return ev.fire >= first && ev.fire < pv.end; });
    pv.queue.forEach(function (ev) { shows = Math.min(shows, ev.fire - eventLead(ev, warn)); }); // a mine shows itself
    // bars before it bursts
    pv.queue.sort(function (a, b) { return (a.fire - eventLead(a, warn)) - (b.fire - eventLead(b, warn)); });
    pv.from = shows - 0.25; // round from just before the first of them shows itself
    pv.to = pv.end + 1.25; // to just after the last has burned out
    pv.next = 0;
    pv.hazards = [];
    pv.at = performance.now();
    pv.now = pv.at; // the latest time it has been drawn at: its clock only goes forward
    pv.round = 0; // which time round it is
    pv.piece = { x: 0.25 * PREVIEW_W - PIECE_SIZE / 2, y: 0.5 * PREVIEW_H - PIECE_SIZE / 2, width: PIECE_SIZE,
        height: PIECE_SIZE };
}

function practicePreviewRun() { // keep it moving while the screen is up: it stops itself when the screen goes
    if (pv && !pv.frame) {
        pv.frame = requestAnimationFrame(practicePreviewFrame);
    }
}

function practicePreviewFrame(now) {
    pv.frame = 0;
    if (menuScreen != "practice" || gameStart) {
        return;
    }
    drawPracticePreview(now);
    drawPracticeTip(); // over it again, should it reach that far
    pv.frame = requestAnimationFrame(practicePreviewFrame);
}

function previewForm(beat) { // the form at a beat of the preview, and the way laser form faces: the last gate passed
    // says them (a twin boss's second section faces left), or the wave's
    var at = { form: "wave", at: -Infinity, facing: 1 };
    pv.timeline.forEach(function (ev) {
        if (ev.axis == "gate" && ev.fire <= beat) {
            at = { form: ev.to, at: ev.fire, facing: ev.facing || 1 };
        }
    });
    return at;
}

function drawPracticePreview(now) { // step the preview to now and draw it into its panel. It is drawn by its own frames
    // and again whenever the screen is (a hover, a press, the menu's timers), so everything in it goes by the time, never
    // by how often it is drawn, and the time never goes back: a frame's stamp can be older than a redraw just before it
    if (!pv) {
        previewReset();
    }
    var dt = Math.max(0, now - pv.now);
    pv.now = Math.max(pv.now, now);
    var mpb = 60000 / pv.def.bpm, round = mpb * (pv.to - pv.from), since = pv.now - pv.at;
    var beat = pv.from + (since % round) / mpb;
    if (Math.floor(since / round) != pv.round) { // round again: from the top, nothing up
        pv.round = Math.floor(since / round);
        pv.hazards = [];
        pv.next = 0;
    }
    var keep = { canvas: gameArea.canvas, ctx: ctx, wave: wave, level: level, beatPos: beatPos, hazards: hazards,
        gamePiece: gamePiece, form: form, formAt: formAt, facing: facing, boss: boss };
    gameArea.canvas = pv.canvas; // into the preview's world
    ctx = pv.ctx;
    wave = pv.def;
    level = pv.level;
    beatPos = beat;
    hazards = pv.hazards;
    gamePiece = pv.piece;
    boss = null;
    try {
        var f = previewForm(beat);
        form = f.form;
        formAt = f.at;
        facing = f.facing;
        previewSteer(pv.now, dt);
        var warn = warnBeats();
        while (pv.next < pv.queue.length && beat >= pv.queue[pv.next].fire - eventLead(pv.queue[pv.next], warn)) {
            hazards.push(makeHazard(pv.queue[pv.next], warn));
            pv.next++;
        }
        hazards = pv.hazards = hazards.filter(function (h) { return !h.step || h.step() !== false; });
        drawSky(level, beat * mpb / 1000, beat);
        drawStrikeLine();
        drawWorld();
        drawPreviewPiece();
    } finally { // and back into the game's, whatever happened
        gameArea.canvas = keep.canvas;
        ctx = keep.ctx;
        wave = keep.wave;
        level = keep.level;
        beatPos = keep.beatPos;
        hazards = keep.hazards;
        gamePiece = keep.gamePiece;
        form = keep.form;
        formAt = keep.formAt;
        facing = keep.facing;
        boss = keep.boss;
    }
    var fr = screenFrame(), bx = LAYOUT_W / 2 + PR_BOX.dx, by = LAYOUT_H / 2 + PR_BOX.dy;
    ctx.save();
    ctx.setTransform(fr.scale, 0, 0, fr.scale, fr.x, fr.y);
    ctx.globalAlpha = 1;
    ctx.drawImage(pv.canvas, bx, by, PR_BOX.w, PR_BOX.h);
    ctx.strokeStyle = COLORS.cyan;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx - 1, by - 1, PR_BOX.w + 2, PR_BOX.h + 2);
    var first = pv.first; // what is playing, and where it is in the pattern, as a bar and a beat
    var bar = Math.floor(beat / BEATS_PER_BAR) - COUNT_IN_BARS, dealt = pv.timeline.dealt[bar];
    ctx.font = "bold 15px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText(practiceLevels() ? (beat < first || !dealt ? practiceTitle() // a level: what this bar deals
        : dealt == "laser" ? "LASER FORM" : practicePhraseName(dealt))
        : previewForm(beat).form == "laser" || practiceTilesOff() ? "LASER FORM: TARGETS "
        + practiceOpts.targets.toUpperCase() : practiceLabel(), bx + 10, by + PR_BOX.h - 12, PR_BOX.w - 170);
    if (beat >= first && beat < pv.end) {
        ctx.textAlign = "right";
        ctx.fillText("BAR " + bar + "   BEAT "
            + (Math.floor(beat) % BEATS_PER_BAR + 1), bx + PR_BOX.w - 10, by + PR_BOX.h - 12);
    }
    ctx.restore();
}

var PREVIEW_STEER = 0.2; // of the way to where it is going the preview's piece goes in a sixtieth of a second

function previewSteer(now, dt) { // the preview's piece, dt ms on: in laser form held to its line and lining up with the
    // next target, in wave form drifting slowly up and down a quarter of the way in. It eases there by the time gone,
    // so a redraw that takes no time moves it nowhere
    var p = pv.piece, W = PREVIEW_W, H = PREVIEW_H, ty = H * (0.5 + 0.22 * Math.sin(now / 900));
    var k = 1 - Math.pow(1 - PREVIEW_STEER, dt * 60 / 1000);
    var tx = (form == "laser" ? laserX() : 0.25) * W;
    if (form == "laser") {
        var next = null;
        hazards.forEach(function (h) {
            if (h instanceof Target && h.fireAt >= beatPos - 0.2 && (!next || h.fireAt < next.fireAt)) {
                next = h;
            }
        });
        if (next) {
            ty = next.center().y;
        }
    }
    p.x += (tx - PIECE_SIZE / 2 - p.x) * k;
    p.y += (ty - PIECE_SIZE / 2 - p.y) * k;
}

function drawPreviewPiece() { // the piece as a core and its glow, and in laser form the beam it fires ahead
    var cx = gamePiece.x + PIECE_SIZE / 2, cy = gamePiece.y + PIECE_SIZE / 2;
    ctx.save();
    if (form == "laser") {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = COLORS.laserCore;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(PREVIEW_W, cy);
        ctx.stroke();
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = COLORS.cyan;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.laserCore;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
