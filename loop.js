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
var timeline = []; // the beams it will fire, and the next one not yet on screen
var nextEvent = 0;
var totalBeats = 0; // count-in and bars together: the level is cleared when beatPos reaches this
var lastBeat = -1; // the last whole beat the step has crossed
var scheduledBeat = -1; // the last beat whose sound has been handed to the audio clock
var AUDIO_LOOKAHEAD_MS = 80; // how far ahead beats are scheduled: enough to ride out a late frame, short enough that a
                             // pause doesn't leave much still to play

// Hitting on the beat. A press is judged against the nearest beat: inside PERFECT_MS or GOOD_MS it scores, times the
// multiplier; outside, or a second press on a beat already hit, is a miss. A beat that goes by unhit breaks the combo.
var PERFECT_MS = 50;
var GOOD_MS = 110;
var POINTS = { perfect: 100, good: 50 };
var COMBO_STEP = 8; // hits in a row per step of multiplier
var MULT_MAX = 4;
var SURVIVE_POINTS = 10; // for every beat of the level lived through
var combo = 0;
var bestCombo = 0; // this level's longest
var perfects = 0, goods = 0, strays = 0; // this attempt's hits by grade, and presses off the beat, for its rank
var judged = {}; // beat number -> hit, so a beat can only be hit once
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

function firstPlayBeat() { // the first beat after the count-in: the first one that is judged and scored
    return COUNT_IN_BARS * BEATS_PER_BAR;
}

function msPerBeat() {
    return 60000 / wave.bpm;
}

function multiplier() {
    return Math.min(MULT_MAX, 1 + Math.floor(combo / COMBO_STEP));
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
    nextEvent = 0;
    totalBeats = (COUNT_IN_BARS + wave.bars) * BEATS_PER_BAR;
    beatPos = 0;
    lastBeat = -1;
    scheduledBeat = -1;
    combo = bestCombo = 0;
    perfects = goods = strays = 0;
    judged = {};
    nextJudge = firstPlayBeat();
    judgment = null;
    hp = HP_MAX;
    invuln = 0;
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
        if (timeline.some(function (ev) { return ev.fire == b; })) {
            synthZap(delay); // a beam fires on this one
        }
    }
}

function spawnDue() { // put up every beam whose warning has begun
    while (nextEvent < timeline.length && beatPos >= timeline[nextEvent].fire - wave.warn) {
        hazards.push(new Beam(timeline[nextEvent], wave.warn));
        nextEvent++;
    }
}

function onBeat(b) { // a whole beat just went by
    if (b >= firstPlayBeat() && b < totalBeats) {
        score += SURVIVE_POINTS;
    }
}

function judge(grade, off) { // off: how far off the beat, in ms (negative early), if it was a press
    judgment = { grade: grade, age: 0, off: off };
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

function hitBeat(time) { // the HIT action: judge it against the nearest beat
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
    judged[n] = true;
    var grade = off <= PERFECT_MS ? "perfect" : "good";
    if (grade == "perfect") {
        perfects++;
    } else {
        goods++;
    }
    combo++;
    bestCombo = Math.max(bestCombo, combo);
    score += POINTS[grade] * multiplier();
    judge(grade, signed);
    playerHitFlash(grade);
}

function checkMissed() { // beats that have gone by past the window unhit break the combo
    var mpb = msPerBeat();
    while (nextJudge < totalBeats && (beatPos - nextJudge) * mpb > GOOD_MS) {
        if (!judged[nextJudge]) {
            breakCombo(false);
        }
        nextJudge++;
    }
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

function onActionPress(name, time) { // an action went down while playing, at real time `time`
    if (name == "hit") {
        hitBeat(time);
    }
}

function onActionRelease(name) { // and came up again
}

function beatFrac() { // how far through the current beat, 0 on it
    return beatPos - Math.floor(beatPos);
}

function drawBeatPulse() { // a stripe under each banner flashes on every beat, harder on the bar
    var kick = Math.max(0, 1 - beatFrac() * 4);
    var bar = Math.floor(beatPos) % BEATS_PER_BAR == 0 ? 1 : 0.5;
    ctx.save();
    ctx.globalAlpha = 0.2 + 0.6 * kick * bar;
    ctx.fillStyle = COLORS.magenta;
    drawBanners(70, 4);
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
    ctx.restore();
}

const JUDGE_STYLE = { perfect: ["PERFECT", COLORS.cyan], good: ["GOOD", COLORS.magenta], miss: ["MISS", COLORS.dim],
    hit: ["HIT!", COLORS.laser] };

function drawJudgment() { // the last grade, rising off the piece and fading
    if (!judgment || judgment.age >= JUDGE_SHOW) {
        return;
    }
    var st = JUDGE_STYLE[judgment.grade];
    var t = judgment.age / JUDGE_SHOW;
    ctx.save();
    ctx.textAlign = "center";
    ctx.globalAlpha = 1 - t * t;
    ctx.font = "bold 22px Arial";
    ctx.fillStyle = st[1];
    var jx = gamePiece.x + gamePiece.width / 2, jy = gamePiece.y - 18 - 20 * t;
    ctx.fillText(st[0], jx, jy);
    if (judgment.off !== undefined && judgment.grade != "perfect") { // which way it was off, and by how much
        ctx.font = "15px Arial";
        ctx.fillStyle = judgment.off < 0 ? COLORS.early : COLORS.late;
        ctx.fillText((judgment.off < 0 ? "EARLY " : "LATE ") + Math.round(Math.abs(judgment.off)) + "ms", jx, jy + 18);
    }
    ctx.restore();
}

function drawLevel() { // draw the level as it stands, without moving anything (also used while paused)
    gameArea.clear();
    drawBeatPulse();
    drawWorld();
    drawProgress();
    drawCountIn();
    useHud();
    drawStats(COLORS.text, COLORS.cyan);
    useWindow();
    drawTouchControls(); // over the HUD, under the piece
    gamePiece.update(); // the two waves: where they meet is the beat
    drawJudgment();
    fxDrawScreen(fxLook()); // the CRT last, over the finished picture
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
    checkMissed();
    if (invuln > 0) {
        invuln--;
    }
    if (judgment) {
        judgment.age++;
    }
    if (hitHazard() && takeHit()) { // a beam fired on the piece
        gameOver();
        return;
    }
    if (gameArea.x !== undefined && movePiece(gameArea.x - gamePiece.width / 2, gameArea.y - gamePiece.height / 2, invuln > 0)
        && takeHit()) { // the piece was steered into one
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
