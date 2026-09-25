// Lazer Wave -- the loop. The game's state, the boot, the fixed-step loop and the step itself, and the hooks the
// engine calls into the game through: startLevel and endLevel at a level's edges, and onActionPress and
// onActionRelease for the actions input.js defines. The player's look is player.js. Everything else is one of the plain scripts index.html loads
// before this one, in the order its tags give, reached as globals. This is the last script the page loads; onLoad,
// below, is what its body calls once it has.


// game play variables
var x = window.innerWidth;
var y = window.innerHeight;
var startTime; // when the run started (ms); moved forward by time spent paused
var pauseStart;
var restFrame = null; // uncropped copy of the between-levels screen, for redrawing after resizes
var gamePiece;

var gameStart = false;
var alive = false;
var pause = false;

var score = 0;
var deaths = 0;
var runFinished = false; // the last level cleared; the finish screen is showing
var restartArmed = false; // a click began on the finish screen
var finishTime = 0; // when the finish screen appeared
var level = 1;
var showFrame = true; // is this step's picture going to be seen, or is another step already due to replace it


function onLoad() {
    loadSettings(); // before anything is drawn, so the start screen opens on the settings that are in force
    loadRecords(); // and on whatever previous runs left behind
    gameArea.load();
    updateSloganText();
    startMenuTimers(); // the start screen's flashers and glitches, now that everything they draw with exists
    playSound(aud_startup); // startup sound; browsers usually block it until the first click
}


var gameArea = {
    canvas: document.createElement("canvas"),
    load: function () {
        this.tall = window.innerHeight > window.innerWidth;
        // phones and tablets always play landscape: held upright, the canvas is turned a quarter clockwise
        // (orientation locking needs fullscreen on Android and isn't available on iOS)
        rotated = this.tall && screenUpright() && !!(window.matchMedia && window.matchMedia("(hover: none) and (pointer: coarse)").matches);
        this.canvas.width = rotated ? window.innerHeight : window.innerWidth;
        this.canvas.height = rotated ? window.innerWidth : window.innerHeight;
        this.canvas.style.transformOrigin = "0 0";
        this.canvas.style.transform = rotated ? "rotate(90deg) translateY(-100%)" : "";
        x = this.canvas.width; // the screens are drawn across the whole canvas
        y = this.canvas.height;
        if (this.inputBound) {
            return; // load() re-runs on resize; only insert the canvas and register input listeners once
        }
        this.inputBound = true;
        document.body.insertBefore(this.canvas, document.body.childNodes[0]);
        bindInput(); // the touch, mouse, keyboard and page listeners, in input.js
    },
    start: function () {
        this.canvas.style.cursor = "none"; // hide the original cursor
        this.frameNo = 0;
        fxReset();
        this.stop(); // never run two loops
        this.running = true;
        this.lastTime = performance.now();
        this.pendingTime = 0;
        this.frameRequest = requestAnimationFrame(runSteps);
    },
    clear: function () { // the ground every frame and screen is drawn on
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    },
    stop: function () {
        this.running = false;
        cancelAnimationFrame(this.frameRequest);
    }
};

// The game advances in fixed 10ms steps, 100 a second: every display frame runs as many steps as real time has
// covered, so a slow or busy machine doesn't slow the game down.
var STEP_MS = 10;
var MAX_CATCH_UP_MS = 100; // after a longer stall, resume instead of fast-forwarding through it

function runSteps(now) {
    if (!gameArea.running) {
        return;
    }
    gameArea.pendingTime += Math.min(Math.max(now - gameArea.lastTime, 0), MAX_CATCH_UP_MS);
    gameArea.lastTime = now;
    while (gameArea.running && gameArea.pendingTime >= STEP_MS) { // a step can end the level, which stops the loop
        gameArea.pendingTime -= STEP_MS;
        updateGameArea();
    }
    if (gameArea.running) {
        gameArea.frameRequest = requestAnimationFrame(runSteps);
    }
}
var ctx = gameArea.context = gameArea.canvas.getContext("2d"); // the one drawing context (resizing resets its state, not the object)


// ---- the game: what Lazer Wave does with the engine ----

// Time is in beats: beatPos is where the level is on its own grid, worked out from the step count, so a pause stops
// it and a slow machine doesn't bend it. Every beam, every judgment and every sound is placed on it.
var beatPos = 0;
var wave = null; // this level's LEVELS entry (waves.js)
var timeline = []; // its beams, targets and gates, in beat order
var spawnQueue = []; // the same, in the order they come on screen (a gate shows a bar ahead), and the next not yet up
var nextSpawn = 0;
var totalBeats = 0; // count-in and bars together: the level is cleared when beatPos reaches this
var lastBeat = -1; // the last whole beat the step has crossed
var scheduledBeat = -1; // the last beat whose sound has been handed to the audio clock
var AUDIO_LOOKAHEAD_MS = 80; // how far ahead beats are scheduled: enough to ride out a late frame, short enough that a
                             // pause doesn't leave much still to play

// Hitting on the beat. A press is judged against the nearest beat: inside PERFECT_MS or GOOD_MS it scores, times the
// multiplier; outside, or a second press on a beat already hit, is a miss. A beat that goes by unhit breaks the combo.
// A coloured beat also wants the key of its colour: the other one, on the beat, is WRONG -- it spends the beat and
// breaks the combo, and the rank counts it as a press off the beat. A gate's beat wants SPACE, and a target's wants
// the beam lined up with it as well: on the beat, in its colour, but off it, is OFF TARGET, as WRONG is.
var PERFECT_MS = 50;
var GOOD_MS = 110;
var POINTS = { perfect: 100, good: 50 };
var COMBO_STEP = 8; // hits in a row per step of multiplier
var MULT_MAX = 4;
var SURVIVE_POINTS = 10; // for every beat of the level lived through
var combo = 0;
var bestCombo = 0; // this level's longest
var perfects = 0, goods = 0, strays = 0; // this attempt's hits by grade, and presses off the beat, for its rank
var judged = {}; // beat number -> how its one press went: "hit", "wrong" or "wide" (off target), so it only gets one
var beatColors = {}; // beat number -> what it wants: "cyan" or "magenta" (its beams' or target's colour), or "gate"
                     // for SPACE; a beat not in it takes either colour
var nextJudge = 0; // the next beat to check for having gone by unhit
var judgment = null; // the last grade, shown over the piece: { grade, age }
var JUDGE_SHOW = 45; // steps it stays up
var timingSum = 0, timingCount = 0; // this attempt's presses, how far off the beat they were on average: early or
                                    // late by the same amount every time is a latency, not the player

// Shields: a hit costs one and breaks the combo, and the piece flickers through anything for a moment; the last one
// ends the attempt
var HP_MAX = 3;
var INVULN_STEPS = 120;
var hp = HP_MAX;
var invuln = 0;
var deathProgress = 0; // how far through the level the last attempt got, for the death screen

// Overdrive: hits charge a meter, and SPACE spends a full one. It always starts on a bar line -- the one it is
// pressed on, or else the next, so it never asks for SPACE and a colour at once -- and runs OVERDRIVE_BEATS. For that
// long the piece is a laser: the lasers can't hurt it, hits score double, and a laser it flies through is absorbed
// for ABSORB_POINTS more. The colours still count.
var OVERDRIVE_PERFECTS = 16; // PERFECTs from empty to full; nothing charges it while it runs
var OVERDRIVE_GOOD = 0.5; // what a GOOD charges, against a PERFECT's 1 (as their points are)
var OVERDRIVE_BEATS = 2 * BEATS_PER_BAR;
var OVERDRIVE_SCORE = 2; // what it multiplies the points for hits and absorbs by
var ABSORB_POINTS = 50; // a laser absorbed, before the multipliers: half a PERFECT, a bonus rather than the point
var drive = emptyDrive();

function emptyDrive() { // meter 0..1; start and end: the beats it runs between once spent; lit: its start announced
    return { meter: 0, start: null, end: null, lit: false };
}

function driveReady() { // full, and not yet spent
    return drive.start === null && drive.meter >= 1;
}

function driveArmed() { // spent, waiting for its bar line
    return drive.start !== null && beatPos < drive.start;
}

function driveOn() { // running
    return drive.start !== null && beatPos >= drive.start && beatPos < drive.end;
}

function driveMeter() { // how full to show it: charging, full while it waits for its bar, then running down
    return driveOn() ? Math.max(0, (drive.end - beatPos) / OVERDRIVE_BEATS) : drive.meter;
}

function pointsMult() { // what a point is multiplied by: the combo's multiplier, doubled in overdrive
    return multiplier() * (driveOn() ? OVERDRIVE_SCORE : 1);
}

function chargeDrive(n, worth) { // a hit on beat n charges the meter by `worth` PERFECTs, unless it is spent over
    // that beat
    if (drive.start !== null && n < drive.end) {
        return; // waiting for its bar line, or running
    }
    if (drive.start !== null) { // it ran out before beat n, though the step hasn't put it out yet
        drive = emptyDrive();
    }
    drive.meter = Math.min(1, drive.meter + worth / OVERDRIVE_PERFECTS);
}

function spendDrive(time) { // SPACE at real time `time`: a full meter starts on this bar line if the press is on it,
    // or else on the next
    if (!driveReady()) {
        return;
    }
    var b = pressBeat(time);
    var one = Math.round(b / BEATS_PER_BAR) * BEATS_PER_BAR;
    if (Math.abs(b - one) * msPerBeat() > GOOD_MS) {
        one = Math.ceil(b / BEATS_PER_BAR) * BEATS_PER_BAR;
    }
    if (one >= totalBeats) {
        return; // no bar left to run it in: the meter keeps
    }
    drive.start = one;
    drive.end = one + OVERDRIVE_BEATS;
    drive.lit = false;
}

function driveStep() { // each step: announce it when its bar comes, and put it out when its time is up
    if (drive.start === null) {
        return;
    }
    if (!drive.lit && beatPos >= drive.start) {
        drive.lit = true;
        playSound(aud_powerUp);
    }
    if (beatPos >= drive.end) {
        drive = emptyDrive();
    }
}

function absorbHazards() { // in overdrive: every laser the piece is in is absorbed, for points, which pop up off it
    var n = 0;
    hazards.forEach(function (h) {
        if (h.absorb && h.hits(gamePiece)) {
            h.absorb();
            n++;
        }
    });
    if (n > 0) {
        var points = n * ABSORB_POINTS * pointsMult();
        score += points;
        popPoints(points, gamePiece.x + gamePiece.width / 2 + 44, gamePiece.y + gamePiece.height / 2 - 6);
        playSound(aud_pickupCoin);
    }
}

// Points popping up where they were won (an absorbed laser's bonus): they swell for a moment, rise and fade, and stay
// where they were won rather than following the piece
var POP_SHOW = 70; // steps one stays up
var POP_SWELL = 8; // steps it takes to settle to its size
var pops = []; // { text, x, y, age }

function popPoints(points, x, y) { // kept far enough inside the screen to rise and still be read
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    pops.push({ text: "+" + points, x: Math.max(50, Math.min(W - 50, x)), y: Math.max(80, Math.min(H - 30, y)), age: 0 });
}

function agePops() {
    pops.forEach(function (p) { p.age++; });
    pops = pops.filter(function (p) { return p.age < POP_SHOW; });
}

function drawPops() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.strokeStyle = COLORS.bg; // edged, like a judgment, so it reads over a laser
    pops.forEach(function (p) {
        var t = p.age / POP_SHOW;
        var swell = p.age < POP_SWELL ? 1.5 - 0.5 * p.age / POP_SWELL : 1;
        var y = p.y - 40 * t;
        ctx.globalAlpha = 1 - t * t;
        ctx.font = "bold " + Math.round(26 * swell) + "px Arial";
        ctx.lineWidth = 5;
        ctx.strokeText(p.text, p.x, y);
        ctx.fillStyle = COLORS.laserCore;
        ctx.fillText(p.text, p.x, y);
        ctx.font = "bold 12px Arial";
        ctx.lineWidth = 3;
        ctx.strokeText("ABSORBED", p.x, y + 16);
        ctx.fillStyle = COLORS.dim;
        ctx.fillText("ABSORBED", p.x, y + 16);
    });
    ctx.restore();
}

// Wave and laser. A level switches between two ways to play at its gates (waves.js). In wave form the piece is
// steered anywhere and the lasers are dodged, as ever. In laser form it locks to LASER_X, steers only up and down, and
// fires a beam across the screen; each beat brings a target, and a hit counts only lined up with it, and in its
// colour. The lasers can't touch a laser. A gate is a beat SPACE hits, and passing it switches the form; one gone by
// unpassed switches it anyway, and costs a shield.
var LASER_X = 0.3; // where the piece locks in laser form, as a fraction of the width: clear of the HUD's column
var LASER_REACH = 8; // px past a target's own size that still counts as lined up with it; overdrive doubles the lot
var LASER_SLIDE = 0.2; // of the way to its place a step, while the piece slides into or out of laser form...
var LASER_SLIDE_BEATS = 0.5; // ...which lasts this long after the switch: a glide, not a jump
var LASER_GROW = 0.25; // beats the piece's beam takes to reach across the screen, or to go
var form = "wave"; // "wave" or "laser"
var formAt = -Infinity; // the beat the form last switched on
var gateTo = {}; // gate beat -> the form it switches to

function switchForm(to) {
    if (form != to) {
        form = to;
        formAt = beatPos;
    }
}

function beamReach() { // 0..1: how far across the screen the piece's beam reaches, as it comes and goes
    var grown = (beatPos - formAt) / LASER_GROW;
    return form == "laser" ? Math.min(1, grown) : Math.max(0, 1 - grown);
}

function onBeatOf(kind, n) { // the target, or gate, due on beat n, if it is up
    for (var i = 0; i < hazards.length; i++) {
        if (hazards[i] instanceof kind && hazards[i].fireAt == n) {
            return hazards[i];
        }
    }
    return null;
}

function linedUp(target) { // is the piece's beam on the target
    var c = target.center();
    var reach = (c.r + LASER_REACH) * (driveOn() ? 2 : 1);
    return Math.abs(gamePiece.y + gamePiece.height / 2 - c.y) <= reach;
}

function passGate(n) { // SPACE on a gate's beat: it flashes, and the form switches
    var gate = onBeatOf(Gate, n);
    if (gate) {
        gate.hitAt = beatPos;
        gate.hitX = gamePiece.x + gamePiece.width / 2;
    }
    switchForm(gateTo[n]);
    synthGate(0);
}

function missGate(n) { // a gate gone by unpassed: the form switches anyway, and it costs a shield. True if the last
    switchForm(gateTo[n]);
    hp--;
    judge("gate");
    if (hp > 0) {
        playSound(aud_danger);
    }
    return hp <= 0;
}

function gateAhead() { // is a gate in the coming bar, or still inside its window: the touch button says GATE, so the
    // player gets ready for it (what SPACE does is still the nearest beat's to say: see onActionPress)
    var late = GOOD_MS / msPerBeat();
    for (var g in gateTo) {
        var d = Number(g) - beatPos;
        if (d >= -late && d <= BEATS_PER_BAR) {
            return true;
        }
    }
    return false;
}

function firstPlayBeat() { // the first beat after the count-in: the first one that is judged and scored
    return COUNT_IN_BARS * BEATS_PER_BAR;
}

function msPerBeat() {
    return 60000 / wave.bpm;
}

function multiplier() {
    return Math.min(MULT_MAX, 1 + Math.floor(combo / COMBO_STEP));
}

function beatColor(n) { // the colour beat n wants, or null for either
    return beatColors[n] || null;
}

function cueBeat() { // the beat the player is heading for: the next one, once the last is past its window
    return Math.ceil(beatPos - GOOD_MS / msPerBeat());
}

function keyText(color) { // how to hit a beat of `color`: "Z  CYAN" or "SPACE  GATE" at the keyboard, and by touch
    // the button's label
    var a = ACTIONS[color];
    return inputMode == "touch" ? a.label : (a.keys[0] == " " ? "SPACE" : a.keys[0].toUpperCase()) + "  " + a.label;
}

function timingText() { // how this attempt's presses sat against the beat, on average, or "" with too few to say
    if (timingCount < 4) {
        return "";
    }
    var avg = Math.round(timingSum / timingCount);
    return Math.abs(avg) < 10 ? "timing: on the beat" : "timing: " + Math.abs(avg) + "ms " + (avg < 0 ? "early" : "late")
        + " on average";
}

function timingColor() { // the average's colour: early, late, or on the beat
    var avg = timingSum / Math.max(1, timingCount);
    return Math.abs(avg) < 10 ? COLORS.good : avg < 0 ? COLORS.early : COLORS.late;
}

// The rank for a cleared level, from how its beats were hit: a PERFECT is worth the beat, a GOOD half of it (as their
// points are), a press off the beat takes half a beat back, and each shield lost costs RANK_SHIELD_COST of the whole.
// S+ is an S with nothing missed at all: every beat hit, no press off one, no shield lost
var RANKS = [
    { grade: "S", min: 0.90 }, // an S or S+ is printed as the title is, and needs no colour
    { grade: "A", min: 0.80, color: COLORS.good },
    { grade: "B", min: 0.65, color: COLORS.early },
    { grade: "C", min: 0.50, color: COLORS.late },
    { grade: "D", min: 0.35, color: COLORS.dim },
];
var RANK_TOP = { grade: "S+", min: 0.95 };
var RANK_FAIL = { grade: "F", color: COLORS.warn };
var RANK_SHIELD_COST = 0.05;

function rankValue(grade) { // where a grade stands, F lowest; -1 for anything that isn't one (nothing recorded yet)
    return [RANK_FAIL].concat(RANKS.slice().reverse(), [RANK_TOP]).map(function (r) { return r.grade; }).indexOf(grade);
}

function levelRating() { // 0..1: how well this attempt's beats were hit
    var beats = totalBeats - firstPlayBeat();
    if (beats <= 0) {
        return 0;
    }
    var hitWorth = (perfects + goods / 2 - strays / 2) / beats;
    return Math.max(0, Math.min(1, hitWorth - (HP_MAX - hp) * RANK_SHIELD_COST));
}

function levelRank() { // this attempt's rank: { grade, color }
    var r = levelRating();
    var flawless = perfects + goods == totalBeats - firstPlayBeat() && strays == 0 && hp == HP_MAX;
    if (flawless && r >= RANK_TOP.min) {
        return RANK_TOP;
    }
    for (let i = 0; i < RANKS.length; i++) {
        if (r >= RANKS[i].min) {
            return RANKS[i];
        }
    }
    return RANK_FAIL;
}

function levelComplete() { // every bar survived
    return !!wave && beatPos >= totalBeats;
}

function levelProgress() { // 0..1 through the level, count-in included
    return wave ? Math.max(0, Math.min(1, beatPos / totalBeats)) : 0;
}

function startLevel() { // a level is about to be played: from the start, or again after a death
    wave = levelDef(level);
    timeline = buildTimeline(level);
    spawnQueue = timeline.slice().sort(function (a, b) {
        return (a.fire - eventLead(a, wave.warn)) - (b.fire - eventLead(b, wave.warn));
    });
    nextSpawn = 0;
    gateTo = {};
    timeline.forEach(function (ev) {
        if (ev.axis == "gate") {
            gateTo[ev.fire] = ev.to;
        }
    });
    form = "wave";
    formAt = -Infinity;
    pops = [];
    totalBeats = (COUNT_IN_BARS + wave.bars) * BEATS_PER_BAR;
    beatPos = 0;
    lastBeat = -1;
    scheduledBeat = -1;
    combo = bestCombo = 0;
    perfects = goods = strays = 0;
    judged = {};
    beatColors = {};
    timeline.forEach(function (ev) {
        if (ev.color) {
            beatColors[ev.fire] = ev.color;
        }
    });
    nextJudge = firstPlayBeat();
    judgment = null;
    hp = HP_MAX;
    invuln = 0;
    drive = emptyDrive(); // every attempt charges its own
    timingSum = timingCount = 0;
    playerReset();
}

function endLevel() { // the level is over, cleared or lost
    deathProgress = levelProgress();
}

function simNowMs(at) { // the level's clock, in ms, at real time `at` (performance.now()'s clock; now by default).
    // The steps run in a batch at each frame, so while they run the step count is behind real time, by a different
    // amount for each step of the batch; what is left in pendingTime, plus the time since the frame began, is exactly
    // that gap. A time before the frame began (a press that waited out a busy frame) comes out before it, as it should
    var real = at === undefined ? performance.now() : at;
    var since = gameArea.running ? gameArea.pendingTime + real - gameArea.lastTime : 0;
    return gameArea.frameNo * STEP_MS + Math.max(-MAX_CATCH_UP_MS, Math.min(since, MAX_CATCH_UP_MS));
}

function scheduleBeats() { // hand the audio clock every beat due within the lookahead, at the moment it falls. Timed
    // from the level's clock as it stands in real time, not from the step count, which is up to a frame behind it
    var now = simNowMs();
    var mpb = msPerBeat();
    while (scheduledBeat + 1 < totalBeats && (scheduledBeat + 1) * mpb - now < AUDIO_LOOKAHEAD_MS) {
        var b = ++scheduledBeat;
        var delay = Math.max(0, (b * mpb - now) / 1000);
        if (b < firstPlayBeat()) {
            synthTick(delay, b % BEATS_PER_BAR == 0); // the count-in
            continue;
        }
        synthKick(delay, b % BEATS_PER_BAR == 0);
        synthHat(delay + mpb / 2000); // and the off-beat
        if (timeline.some(function (ev) { return ev.fire == b && (ev.axis == "h" || ev.axis == "v"); })) {
            synthZap(delay); // a beam fires on this one
        }
    }
}

function spawnDue() { // put up everything whose time to show has come
    while (nextSpawn < spawnQueue.length
        && beatPos >= spawnQueue[nextSpawn].fire - eventLead(spawnQueue[nextSpawn], wave.warn)) {
        hazards.push(makeHazard(spawnQueue[nextSpawn], wave.warn));
        nextSpawn++;
    }
}

function onBeat(b) { // a whole beat just went by
    if (b >= firstPlayBeat() && b < totalBeats) {
        score += SURVIVE_POINTS;
    }
}

function judge(grade, off, color) { // off: how far off the beat, in ms (negative early), if it was a press; color:
    // the colour it was hit in, or for WRONG the colour it wanted
    judgment = { grade: grade, age: 0, off: off, color: color };
}

function breakCombo(show, off) { // show: say MISS even with no combo to lose (a press off the beat)
    if (combo > 0 || show) {
        judge("miss", off);
    }
    combo = 0;
}

function pressBeat(time) { // the beat position of a press at real time `time`, less the time the audio takes to
    // reach the ears (the player taps along to what they hear) and the player's own timing offset (OPTIONS)
    return (simNowMs(time) - audioLatencyMs() - timingOffset) / msPerBeat();
}

function hitBeat(time, color) { // a hit in `color`: judge it against the nearest beat
    var b = pressBeat(time);
    var n = Math.round(b);
    if (n < firstPlayBeat() || n >= totalBeats) {
        return; // the count-in, and after the last beat: tap along freely
    }
    var signed = (b - n) * msPerBeat(); // negative early, positive late
    var off = Math.abs(signed);
    if (judged[n]) { // mashing one already hit
        strays++;
        breakCombo(true);
        return;
    }
    timingSum += signed;
    timingCount++;
    if (off > GOOD_MS) { // off the beat
        strays++;
        breakCombo(true, signed);
        return;
    }
    var want = beatColor(n);
    if (want && color != want) { // on the beat, in the wrong colour: the beat is spent
        judged[n] = "wrong";
        strays++;
        combo = 0;
        judge("wrong", signed, want);
        return;
    }
    var target = onBeatOf(Target, n);
    if (target && !linedUp(target)) { // on the beat and in its colour, but the beam isn't on it: spent as WRONG is
        judged[n] = "wide";
        strays++;
        combo = 0;
        judge("wide", signed, color);
        return;
    }
    judged[n] = "hit";
    var grade = off <= PERFECT_MS ? "perfect" : "good";
    if (grade == "perfect") {
        perfects++;
        chargeDrive(n, 1);
    } else {
        goods++;
        chargeDrive(n, OVERDRIVE_GOOD);
    }
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    score += POINTS[grade] * pointsMult();
    judge(grade, signed, color);
    playerHitFlash(grade, color);
    if (target) { // the beam strikes it
        target.hitX = target.center().x;
        target.hitAt = beatPos;
        synthShot(0);
    }
    if (want == "gate") {
        passGate(n);
    }
}

function checkMissed() { // beats that have gone by past the window unhit break the combo, and a gate gone by
    // unpassed switches the form anyway and costs a shield. True if that was the last one
    var mpb = msPerBeat();
    var dead = false;
    while (nextJudge < totalBeats && (beatPos - nextJudge) * mpb > GOOD_MS) {
        if (!judged[nextJudge]) {
            breakCombo(false);
        }
        if (beatColor(nextJudge) == "gate" && judged[nextJudge] != "hit") {
            dead = missGate(nextJudge) || dead;
        }
        nextJudge++;
    }
    return dead;
}

function takeHit() { // a laser got the piece: returns true if that was the last shield
    if (invuln > 0) {
        return false;
    }
    hp--;
    breakCombo(false);
    judge("hit");
    invuln = INVULN_STEPS;
    if (hp > 0) {
        playSound(aud_danger);
    }
    return hp <= 0;
}

function onActionPress(name, time) { // an action went down while playing, at real time `time`. SPACE hits a gate
    // when the beat nearest the press is one, and spends overdrive when it isn't
    if (name == "gate" && beatColor(Math.round(pressBeat(time))) != "gate") {
        spendDrive(time);
    } else {
        hitBeat(time, ACTIONS[name].beat);
    }
}

function onActionRelease(name) { // and came up again
}

function beatFrac() { // how far through the current beat, 0 on it
    return beatPos - Math.floor(beatPos);
}

function drawBeatPulse() { // a stripe under each banner flashes on every beat, harder on the bar, white in overdrive
    var kick = Math.max(0, 1 - beatFrac() * 4);
    var bar = Math.floor(beatPos) % BEATS_PER_BAR == 0 ? 1 : 0.5;
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.6 * kick * bar;
    ctx.fillStyle = driveOn() ? COLORS.laserCore : COLORS.magenta;
    drawBanners(70, 4);
    ctx.restore();
}

function drawDriveCall() { // OVERDRIVE across the screen as it starts, gone by the end of its first beat
    if (!driveOn() || beatPos >= drive.start + 1) {
        return;
    }
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var s = Math.min(1, W / 900, H / 500);
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = 1 - (beatPos - drive.start);
    ctx.font = Math.round(110 * s) + "px Arial";
    ctx.fillStyle = COLORS.cyan; // split either side of a white one, like a beam through a prism
    ctx.fillText("OVERDRIVE", W / 2 - 5, H / 2 - 3);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText("OVERDRIVE", W / 2 + 5, H / 2 + 3);
    ctx.fillStyle = COLORS.laserCore;
    ctx.fillText("OVERDRIVE", W / 2, H / 2);
    ctx.font = Math.round(32 * s) + "px Arial";
    ctx.fillText("オーバードライブ", W / 2, H / 2 + 60 * s);
    ctx.restore();
}

function drawStrikeLine() { // laser form: the line down the screen where each target meets the beam on its beat
    var reach = beamReach();
    if (reach <= 0) {
        return;
    }
    var x = TARGET_X * gameArea.canvas.width;
    ctx.save();
    ctx.globalAlpha = 0.25 * reach;
    ctx.strokeStyle = COLORS.laserCore;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, gameArea.canvas.height);
    ctx.stroke();
    ctx.restore();
}

function drawFormCall() { // the form it has just switched to, across the top, gone by the end of the beat
    if (beatPos - formAt >= 1) {
        return;
    }
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var s = Math.min(1, W / 900, H / 500);
    var name = form == "laser" ? "LASER FORM" : "WAVE FORM";
    var y = H * 0.3;
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = 1 - (beatPos - formAt);
    ctx.font = Math.round(64 * s) + "px Arial";
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(name, W / 2 - 4, y - 2);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText(name, W / 2 + 4, y + 2);
    ctx.fillStyle = COLORS.laserCore;
    ctx.fillText(name, W / 2, y);
    ctx.font = Math.round(24 * s) + "px Arial";
    ctx.fillText(form == "laser" ? "レーザー" : "ウェーブ", W / 2, y + 36 * s);
    ctx.restore();
}

function drawCountIn() { // 4, 3, 2, 1 over the count-in, the level's name and tempo with it, then GO
    var first = firstPlayBeat();
    if (beatPos >= first + 1) {
        return;
    }
    var text = beatPos < first ? String(first - Math.floor(beatPos)) : "GO";
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var s = Math.min(1, W / 900, H / 500);
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = 1 - beatFrac() * 0.7;
    ctx.font = Math.round(140 * s) + "px Arial";
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText(text, W / 2 - 4, H / 2 - 4);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText(text, W / 2, H / 2);
    ctx.globalAlpha = 1;
    ctx.font = Math.round(32 * s) + "px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText(wave.name + "   " + wave.bpm + " BPM", W / 2, H / 2 + 70 * s);
    if (wave.colors && wave.colors.length) { // a coloured level: which key hits which colour, each in its own
        ctx.font = "bold " + Math.round(28 * s) + "px Arial";
        ctx.textAlign = "right";
        ctx.fillStyle = COLORS.cyan;
        ctx.fillText(keyText("cyan"), W / 2 - 24 * s, H / 2 + 120 * s);
        ctx.textAlign = "left";
        ctx.fillStyle = COLORS.magenta;
        ctx.fillText(keyText("magenta"), W / 2 + 24 * s, H / 2 + 120 * s);
    }
    ctx.restore();
}

// A hit is shown in the colour it was hit in (a style's colour of null); WRONG, in its own, says what the beat wanted
const JUDGE_STYLE = { perfect: ["PERFECT", null], good: ["GOOD", null], miss: ["MISS", COLORS.dim],
    hit: ["HIT!", COLORS.laser], wrong: ["WRONG", COLORS.warn], wide: ["OFF TARGET", COLORS.dim],
    gate: ["MISSED GATE", COLORS.laser] };

function drawJudgment() { // the last grade, rising off the piece and fading
    if (!judgment || judgment.age >= JUDGE_SHOW) {
        return;
    }
    var st = JUDGE_STYLE[judgment.grade];
    var t = judgment.age / JUDGE_SHOW;
    var jx = gamePiece.x + gamePiece.width / 2, jy = gamePiece.y - 18 - 20 * t;
    var line = function (text, y) { // edged in the ground's colour, so it still reads over a burning laser
        ctx.strokeText(text, jx, y);
        ctx.fillText(text, jx, y);
    };
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = 1 - t * t;
    ctx.strokeStyle = COLORS.bg;
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = st[1] || COLORS[judgment.color] || COLORS.text;
    line(st[0], jy);
    ctx.lineWidth = 3;
    if (judgment.grade == "wrong") { // the key it wanted, in its colour (a gate's is white)
        ctx.font = "bold 15px Arial";
        ctx.fillStyle = COLORS[judgment.color] || COLORS.laserCore;
        line(keyText(judgment.color), jy + 18);
    } else if (judgment.off !== undefined && judgment.grade != "perfect") { // which way it was off, and by how much
        ctx.font = "15px Arial";
        ctx.fillStyle = judgment.off < 0 ? COLORS.early : COLORS.late;
        line((judgment.off < 0 ? "EARLY " : "LATE ") + Math.round(Math.abs(judgment.off)) + "ms", jy + 18);
    }
    ctx.restore();
}

function drawLevel() { // draw the level as it stands, without moving anything (also used while paused)
    gameArea.clear();
    drawBeatPulse();
    drawStrikeLine();
    drawWorld();
    drawProgress();
    drawCountIn();
    drawDriveCall();
    drawFormCall();
    useHud();
    drawStats(COLORS.text, COLORS.cyan);
    useWindow();
    drawTouchControls(); // over the HUD, under the piece
    gamePiece.update(); // the two waves: where they meet is the beat
    drawJudgment();
    drawPops();
    fxDrawScreen(fxLook()); // the CRT last, over the finished picture
}

function steerPiece() { // move the piece toward where it is steered; true if that ran it into a laser, and that was
    // the last shield. In laser form it is held to its line, and for a moment after a switch it glides, through anything
    var w = gamePiece.width, h = gamePiece.height;
    var cx = gamePiece.x + w / 2, cy = gamePiece.y + h / 2;
    var tx = gameArea.x !== undefined ? gameArea.x : cx;
    var ty = gameArea.y !== undefined ? gameArea.y : cy;
    if (form == "laser") {
        tx = LASER_X * gameArea.canvas.width;
    }
    if (beatPos - formAt < LASER_SLIDE_BEATS) {
        movePiece(cx + (tx - cx) * LASER_SLIDE - w / 2, cy + (ty - cy) * LASER_SLIDE - h / 2, true);
        return false;
    }
    if (form == "wave" && gameArea.x === undefined) {
        return false; // nothing has steered it yet
    }
    return movePiece(tx - w / 2, ty - h / 2, invuln > 0 || driveOn() || form == "laser") && takeHit();
}

function updateGameArea() {
    if (pause) {
        return; // while paused, nothing updates; setPause draws the pause screen once
    }
    // The loop runs 100 fixed steps a second against a screen that refreshes 60 times, so a step that another step is
    // already due to overwrite would draw a picture nobody sees. Such a step is still simulated in full; it just isn't
    // painted. Nothing drawn may use Math.random: skipping a draw must never change what happens next.
    showFrame = !fxOverdrawn();
    gameArea.frameNo += 1;
    beatPos = gameArea.frameNo * STEP_MS / msPerBeat();
    fxStep();

    scheduleBeats();
    spawnDue();
    worldStep(); // the beams warm up, burn and go
    while (lastBeat < Math.floor(beatPos)) {
        onBeat(++lastBeat);
    }
    if (checkMissed()) { // a gate gone by took the last shield
        gameOver();
        return;
    }
    driveStep();
    if (invuln > 0) {
        invuln--;
    }
    if (judgment) {
        judgment.age++;
    }
    agePops();
    if (driveOn()) { // a laser can't hurt it: it eats them
        absorbHazards();
    } else if (form == "wave" && hitHazard() && takeHit()) { // a beam fired on the piece (none can touch a laser)
        gameOver();
        return;
    }
    if (steerPiece()) { // the piece was steered into one, and that was the last shield
        gameOver();
        return;
    }
    playerRecord(); // where the piece is now, for the waves' trail

    if (showFrame) {
        drawLevel();
    }
    if (levelComplete()) { // every bar survived
        gameOver();
    }
}
