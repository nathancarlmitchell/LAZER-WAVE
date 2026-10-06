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

var score = 0; // the points of the level being played
var runScore = 0; // the run's total: every level it has continued past (levels.js)
var deaths = 0;
var runFinished = false; // the last level cleared; the finish screen is showing
var restartArmed = false; // a click began on the finish screen
var finishTime = 0; // when the finish screen appeared
var level = 1;
var runFrom = 1; // the level the run began at: the first, from START, or any the level select opened (menu.js)
var selectRun = false; // the run was started from the level select: it ends on its level's results, back at the
                       // select, rather than going on to the next level as a run from START does
var bossRush = false; // the run is the boss rush (RUSH_LEVELS, run.js): each boss in turn, records of its own
var practice = false; // the level is a practice one (practice.js): put together on the practice screen, played on its own
                      // and back there after, never lost (a hit is counted, not a shield), never recorded
var practiceHits = 0; // the lasers, and the gates let by, that got the piece in a practice level: what shields would
                      // have paid
var practiceRestartDue = false; // a hit in a practice level with RESTART ON HIT: the step it came in starts it again

function practiceAuto() { // practice's AUTO TIMING, on
    return practice && practiceOpts.auto;
}

function practiceLoop() { // practice's LOOP, on: the pattern goes round until the player quits (never a boss level,
    // which goes round by itself until its boss falls: practiceLoopOn, practice.js)
    return practice && practiceLoopOn();
}

function driveOff() { // practice's OVERDRIVE, OFF: the meter never charges, and the HUD leaves it out
    return practice && practiceOpts.drive == "off";
}

function practiceRound() { // practice on LOOP: the round being played, from 1, the opening rest in the first
    var first = loopStartBeat();
    return loopLen > 0 && beatPos >= first ? 1 + Math.floor((beatPos - first) / loopLen) : 1;
}
var showFrame = true; // is this step's picture going to be seen, or is another step already due to replace it


function onLoad() {
    loadSettings(); // before anything is drawn, so the start screen opens on the settings that are in force
    loadRecords(); // and on whatever previous runs left behind
    gameArea.load();
    updateSloganText();
    startMenuTimers(); // the start screen's flashers and glitches, now that everything they draw with exists
    startupSound(); // the startup sequence (audio.js): now, where the browser lets sound start at load, else at the first press
    themeBegin(); // and the menu theme (theme.js) as it rings out, or at that press without it
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
        startAudioTimer(); // the beat track, scheduled on a steady timer as well as from the steps
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
        stopAudioTimer();
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
// it and a slow machine doesn't bend it, less the time the audio takes to reach the ears and the player's own timing
// offset (OPTIONS): it is the beat as it is heard, the clock a press is put on (pressBeat), so every beam, every
// target, every gate and every judgment keeps to the sound. The sounds themselves are scheduled from the step count
// (scheduleBeats), which is why they are heard that much later.
var beatPos = 0;
var wave = null; // this level's LEVELS entry (waves.js)
function warnBeats() { // how many beats ahead of its beat a laser shows itself here: the level's warning time, at
    // what the difficulty makes of it (DIFFICULTIES, run.js)
    return wave.warn * mode().warn;
}
var timeline = []; // its beams, targets and gates, in beat order
var spawnQueue = []; // the same, in the order they come on screen (a gate shows a bar ahead), and the next not yet up
var nextSpawn = 0;
var totalBeats = 0; // where the level is cleared, when beatPos reaches it: its count-in and bars together on a level that
// can go round (a boss's, practice on LOOP), and on one that ends on its bars, OUTRO_BEATS past the bar line after its
// last laser (resolveBeat)
var calmAt = null; // on a level that ends on its bars, the moment its last laser is done, in beats: from there nothing is
// judged, the drums drop out and the waves come to rest (player.js), and the song plays on to the bar line and resolves
// there. null on a level that can go round, which ends where its boss falls (bossDown, boss.js)
var OUTRO_BEATS = 2; // beats the song's resolution rings, the level done, before its results come up
var LOOP_LEAD = 2 * BEATS_PER_BAR; // beats before its end a boss level goes round again at: enough for everything in
// the next round to come on screen with its full warning (eventLead, waves.js)
var loopLen = 0; // beats a boss level's loop runs (loopFrom, waves.js), or 0 for a level that ends on its last bar
var loopEvents = []; // the loop's events, at their beats in the first round, dealt again a round later each time
var passes = 0; // how many rounds the loop has gone
var lastBeat = -1; // the last whole beat the step has crossed
var scheduledBeat = -1; // the last beat whose sound has been handed to the audio clock
var HATS_16_FROM_ACT = 4; // from this act on, the hats play in sixteenths between the off-beats (scheduleBeats)
var AUDIO_LOOKAHEAD_MS = 150; // how far ahead beats are scheduled: enough to ride out late frames, short enough that a
                              // pause doesn't leave much still to play
var AUDIO_TICK_MS = 25; // the beat track is scheduled from a steady timer this often as well as from the steps, so a frame
                        // that comes late (a busy machine, a tab throttled) can't hold a beat back past its time
var audioTimer = null;
var levelLatencyMs = 0; // the audio's delay (audioLatencyMs) as the clock takes it. The browser's estimate is nothing the
                        // moment the audio starts or resumes and settles a moment later, and the delay itself can change
                        // over a pause or a hidden tab: taken once a level, a bad reading put the lasers and the beat
                        // apart for the whole of it. So it is followed (trackLatency), once it has settled
var RESUME_GRACE_STEPS = 30; // steps the piece can't be hurt for after a resume that shifted the clock
var LATENCY_SLEW = 0.4; // ms a step the clock moves toward a changed delay in mid-play: a twenty-fifth of its pace, caught
                        // up over a second or two instead of jumped
var LATENCY_JUMP_MS = 2000; // ms after a resume in which it is jumped to instead, the piece left alone a moment
var resumedAt = -Infinity; // performance.now() at the last resume

function startAudioTimer() {
    if (audioTimer === null) {
        audioTimer = setInterval(function () {
            if (gameArea.running && !pause && alive) {
                scheduleBeats();
            }
        }, AUDIO_TICK_MS);
    }
}

function stopAudioTimer() {
    if (audioTimer !== null) {
        clearInterval(audioTimer);
        audioTimer = null;
    }
}

function latchLatency(resuming) { // read the audio's delay for the clock: as a level starts, and on a resume, when a change
    // moves every laser by the difference, so the piece is left alone for a moment. An estimate still settling is left
    // for trackLatency to take up once it has
    if (resuming) {
        resumedAt = performance.now();
    }
    if (!audioLatencySettled()) {
        return;
    }
    var was = levelLatencyMs;
    levelLatencyMs = audioLatencyMs();
    if (resuming && Math.abs(levelLatencyMs - was) > 5) {
        invuln = Math.max(invuln, RESUME_GRACE_STEPS);
    }
}

function trackLatency() { // each step: the clock follows the audio's delay as the browser comes to report it, once its
    // estimate has settled: at once over the count-in, where nothing can hurt, and for a moment after a resume, the piece
    // left alone as the lasers shift; in mid-play a little each step, so a change is caught up without a jump
    if (!audioLatencySettled()) {
        return;
    }
    var gap = audioLatencyMs() - levelLatencyMs;
    if (Math.abs(gap) < 1) {
        return;
    }
    if (beatPos < firstPlayBeat() || performance.now() - resumedAt < LATENCY_JUMP_MS) {
        levelLatencyMs += gap;
        if (Math.abs(gap) > 5 && beatPos >= firstPlayBeat()) {
            invuln = Math.max(invuln, RESUME_GRACE_STEPS);
        }
    } else {
        levelLatencyMs += Math.max(-LATENCY_SLEW, Math.min(LATENCY_SLEW, gap));
    }
}

// Hitting on the beat. A press is judged against the nearest beat: inside the PERFECT, GREAT, GOOD or BAD window it
// scores, times the multiplier, though a BAD breaks the combo as a miss does; outside, or a second press on a beat
// already hit, is a miss. A beat that goes by unhit breaks the combo. The BAD window is the beat's edge: past it the
// beat has gone by (beatOpen).
// A coloured beat also wants the key of its colour: the other one, on the beat, is WRONG -- it spends the beat and
// breaks the combo, and the rank counts it as a press off the beat. A gate's beat wants SPACE, and a target's wants
// the beam lined up with it as well: on the beat, in its colour, but off it, is OFF TARGET, as WRONG is.
// A press is placed on the judging clock: beatPos less the audio's delay to the ears and the player's timing offset
// (pressBeat takes both off, so a press on the beat as heard lands on the beat). Everything that has to agree with a
// press reads that clock too -- a beat going by unhit (checkMissed), which wave is lit (cueBeat), how long a target
// or a gate stays (waves.js) -- through judgePos and beatOpen, never beatPos: judged off beatPos, they ran ahead of
// the presses by the whole delay, and called a hit late in its window a miss before it had been judged. So does every
// pulse on the beat, from the waves meeting (player.js) to the stripes, the sky, the meter and the count-in (beatFrac):
// what the eye takes for the beat is the beat the hand is judged on. Only what is physical stays on beatPos, which is
// where its sound is: a laser firing, a target or a gate arriving, overdrive starting on its beat.
var PERFECT_MS = 50; // the windows, either side of the beat, the same on every difficulty: everything judged reads
var GREAT_MS = 80; // them through perfectMs(), greatMs(), goodMs() and badMs(), the one place to change them
var GOOD_MS = 110;
var BAD_MS = 160;
function perfectMs() {
    return PERFECT_MS;
}
function greatMs() {
    return GREAT_MS;
}
function goodMs() {
    return GOOD_MS;
}
function badMs() {
    return BAD_MS;
}
var POINTS = { perfect: 100, great: 75, good: 50, bad: 25 };
var COMBO_STEP = 8; // hits in a row per step of multiplier, which has no ceiling: a long streak is the run's stake
var SURVIVE_POINTS = 10; // for every beat of the level lived through
var combo = 0;
var runPeakCombo = 0; // the longest the combo has run this run, carried from level to level as it is: a run's or a
                      // rush's MAX COMBO, the HUD's COMBO at its highest (reset as a run begins, levels.js)
var streak = 0; // this level's own hits in a row: the combo without what a run carried into it, and counting on through
                // a boss's later rounds, where the combo holds (earning)
var bestCombo = 0; // this level's longest streak, which its results set against its beats
var perfects = 0, greats = 0, goods = 0, bads = 0, strays = 0; // this attempt's hits by grade, and presses off the
                                                               // beat, for its rank
var judged = {}; // beat number -> how its one press went: "hit", "wrong" or "wide" (off target), so it only gets one
var beatColors = {}; // beat number -> what it wants: "cyan" or "magenta" (its beams' or target's colour), or "gate"
                     // for SPACE; a beat not in it takes either colour
var nextJudge = 0; // the next beat to check for having gone by unhit
var judgment = null; // the last grade, shown over the piece: { grade, age }
var JUDGE_SHOW = 45; // steps it stays up
var timings = []; // this attempt's presses inside the window, each how far off the beat in ms (negative early), for
                  // the scale on the results (levels.js)
var timingSum = 0, timingCount = 0; // this attempt's presses on the beat (inside the window), how far off it they
                                    // were on average: early or late by the same amount every time is a latency,
                                    // not the player. A press off the beat is a slip, and left out

// Shields: a hit costs one and breaks the combo, and the piece flickers through anything for a moment; the last one
// ends the attempt
var INVULN_STEPS = 120;
var hp = 3; // shields: what the difficulty gives an attempt (shieldsMax, run.js), less the lasers that got through
var hpAtStart = 3; // the shields this attempt began with: a run carries them from level to level, so the rank
                   // counts only the ones lost in it
var carryHp = null, carryMeter = null; // what the level just continued from left, its shields and its meter's charge,
                                       // for the next to start with; null for a fresh attempt
var carryCombo = null; // and its combo, which a run keeps from level to level: the multiplier is what a run plays for
var invuln = 0;
var deathProgress = 0; // how far through the level the last attempt got, for the death screen

// Overdrive: hits charge a meter, and SPACE spends a full one. It starts on a beat -- the one it is pressed on, if
// the press is inside that beat's window, or else the next, so it never asks for SPACE and a colour at once -- and
// runs OVERDRIVE_BEATS from there. For that
// long the piece is a laser: the lasers can't hurt it, hits score double, and a laser it flies through is absorbed
// for ABSORB_POINTS more. The colours still count. For OVERDRIVE_GRACE beats after it runs out the lasers still can't
// hurt the piece, though it is a wave again and scores as one: room to come back out of it.
var OVERDRIVE_PERFECTS = 16; // PERFECTs from empty to full; nothing charges it while it runs
var OVERDRIVE_GREAT = 0.75, OVERDRIVE_GOOD = 0.5, OVERDRIVE_BAD = 0.25; // what a GREAT, a GOOD and a BAD charge,
                                                                        // against a PERFECT's 1 (as their points are)
var OVERDRIVE_BEATS = 2 * BEATS_PER_BAR;
var OVERDRIVE_GRACE = 1; // beats after it runs out that the lasers still can't hurt the piece
var driveGraceUntil = 0; // the beat position that grace runs to, once it has run out
var autoDrive = false; // the OVERDRIVE setting (OPTIONS): AUTO spends the meter the moment it fills, on the next beat;
                       // MANUAL, the default, leaves it to SPACE
var OVERDRIVE_SCORE = 2; // what it multiplies the points for hits and absorbs by
var ABSORB_POINTS = 50; // a laser absorbed, before the multipliers: half a PERFECT, a bonus rather than the point
var drive = emptyDrive();

function emptyDrive() { // meter 0..1; start and end: the beats it runs between once spent; lit: its start announced
    return { meter: 0, start: null, end: null, lit: false };
}

function driveReady() { // full, and not yet spent
    return drive.start === null && drive.meter >= 1;
}

function driveArmed() { // spent, waiting for its beat
    return drive.start !== null && beatPos < drive.start;
}

function driveOn() { // running
    return drive.start !== null && beatPos >= drive.start && beatPos < drive.end;
}

function driveGrace() { // in the beat after it ran out: untouchable still, though a wave again, scoring as one
    return beatPos < driveGraceUntil;
}

function switchGrace() { // untouchable through a change of form: on a gate's beat while its window is open, when the
    // piece is still held to the laser line as the next bar's lasers fire, and through the glide after the switch
    // (LASER_SLIDE_BEATS), which goes through anything: the bar after a laser section can open on a corridor, and the
    // piece has to get from the line to its gap
    if (beatPos - formAt < LASER_SLIDE_BEATS) {
        return true;
    }
    var n = Math.round(judgePos());
    return beatColor(n) == "gate" && !judged[n] && Math.abs(judgePos() - n) * msPerBeat() <= badMs();
}

function driveOut() { // it has run out: its grace begins
    driveGraceUntil = drive.end + OVERDRIVE_GRACE;
    drive = emptyDrive();
}

function driveOver(b) { // spent, and running on beat b: for the music, which is played a little ahead of the beat
    return drive.start !== null && b >= drive.start && b < drive.end;
}

function driveMeter() { // how full to show it: charging, full while it waits for its bar, then running down
    return driveOn() ? Math.max(0, (drive.end - beatPos) / OVERDRIVE_BEATS) : drive.meter;
}

function pointsMult() { // what a point is multiplied by: the combo's multiplier, doubled in overdrive
    return multiplier() * (driveOn() ? OVERDRIVE_SCORE : 1);
}

function chargeDrive(n, worth) { // a hit on beat n charges the meter by `worth` PERFECTs, unless it is spent over
    // that beat, or practice has overdrive OFF
    if (driveOff()) {
        return;
    }
    if (drive.start !== null && n < drive.end) {
        return; // waiting for its beat, or running
    }
    if (drive.start !== null) { // it ran out before beat n, though the step hasn't put it out yet
        driveOut();
    }
    var was = drive.meter;
    drive.meter = Math.min(1, drive.meter + worth / OVERDRIVE_PERFECTS);
    if (was < 1 && drive.meter >= 1) { // the hit that fills it chimes, in the act's key, so the ears know as the eyes do
        synthCharged(0, actSong(level).key);
    }
}

function spendDrive(time) { // SPACE at real time `time`: a full meter starts on this beat if the press is inside its
    // window, or else on the next; never before the level proper, which a meter carried in full could ask for from
    // the count-in
    if (!driveReady()) {
        return;
    }
    var b = pressBeat(time);
    var one = Math.round(b);
    if (Math.abs(b - one) * msPerBeat() > badMs()) {
        one = Math.ceil(b);
    }
    startDrive(one);
}

function startDrive(one) { // a full meter spent: overdrive runs from beat `one`, never before the level proper, which a
    // meter carried in full could ask for from the count-in; with no beat left to run it from, the meter keeps
    one = Math.max(one, firstPlayBeat());
    if (one >= playEnd()) {
        return;
    }
    drive.start = one;
    drive.end = one + OVERDRIVE_BEATS;
    drive.lit = false;
}

function driveAuto() { // is a full meter spent at once: in practice its OVERDRIVE says (AUTO), elsewhere the OVERDRIVE
    // setting (OPTIONS)
    return practice ? practiceOpts.drive == "auto" : autoDrive;
}

function driveStep() { // each step: on AUTO, a full meter is spent at once, from the next beat; announce it when its beat
    // comes, and put it out when its time is up
    if (driveAuto() && driveReady()) {
        startDrive(Math.ceil(beatPos));
    }
    if (drive.start === null) {
        return;
    }
    if (!drive.lit && beatPos >= drive.start) {
        drive.lit = true;
        playSfx(sfxDriveStart, 0, SFX_LEVELS.driveStart, actSong(level).key); // the shot it comes on with (sfx.js)
    }
    if (beatPos >= drive.end) {
        driveOut();
        playSfx(sfxDriveEnd, 0, SFX_LEVELS.driveEnd, actSong(level).key); // and the power running down
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
        bossHit(n); // absorbed lasers hurt a boss too
        if (earning(Math.floor(beatPos))) { // and pay, in a boss level's first round
            var points = modePoints(n * ABSORB_POINTS * pointsMult());
            score += points;
            popPoints(points, gamePiece.x + gamePiece.width / 2 + 44, gamePiece.y + gamePiece.height / 2 - 6);
        }
        playSfx(sfxAbsorb, 0, SFX_LEVELS.absorb, actSong(level).key);
    }
}

// Words popping up where they were earned: an absorbed laser's points, a boss's bonus, the multiplier stepping up. They
// swell for a moment, rise and fade, and stay where they were earned rather than following the piece
var POP_SHOW = 70; // steps one stays up
var POP_SWELL = 8; // steps it takes to settle to its size
var pops = []; // { text, sub, color, size, x, y, age }

function popText(text, sub, color, x, y, size) { // a word popping up at (x, y), kept far enough inside the screen to rise
    // and still be read, with `sub` under it, small; `size` scales it, 1 being a hit's points
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    pops.push({ text: text, sub: sub, color: color, size: size || 1, x: Math.max(50, Math.min(W - 50, x)), y: Math.max(80, Math.min(H - 30, y)), age: 0 });
}

function popPoints(points, x, y, sub) { // points won: an absorbed laser's, or, said so, a boss's bonus
    popText("+" + points, sub || "ABSORBED", COLORS.laserCore, x, y, 1);
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
        ctx.font = "bold " + Math.round(26 * swell * p.size) + "px Arial";
        ctx.lineWidth = 5;
        ctx.strokeText(p.text, p.x, y);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x, y);
        ctx.font = "bold 12px Arial";
        ctx.lineWidth = 3;
        ctx.strokeText(p.sub, p.x, y + 16);
        ctx.fillStyle = COLORS.dim;
        ctx.fillText(p.sub, p.x, y + 16);
    });
    ctx.restore();
}

// Wave and laser. A level switches between two ways to play at its gates (waves.js). In wave form the piece is
// steered anywhere and the lasers are dodged, as ever. In laser form it locks to LASER_X, steers only up and down, and
// fires a beam across the screen; each beat brings a target, and a hit counts only lined up with it, and in its
// colour. Lasers still fire in laser form, across the path from one target to the next (waves.js), so the piece
// holds on the target it hit while one burns, and crosses after. A gate is a beat SPACE hits, and passing it switches
// the form; one gone by unpassed switches it anyway, and costs a shield.
var LASER_X = 0.3; // where the piece locks in laser form, as a fraction of the width: clear of the HUD's column
var facing = 1; // which way laser form faces: 1 firing right from LASER_X, or -1 firing left from its mirror across
                // the screen (the twin boss, boss.js), as the gate that switched the form said
function laserX() { // where the piece locks, as a fraction of the width
    return facing > 0 ? LASER_X : 1 - LASER_X;
}
function targetX() { // where a target meets the beam on its beat, as a fraction of the width
    return facing > 0 ? TARGET_X : 1 - TARGET_X;
}
var LASER_REACH = 8; // px past a target's own size that still counts as lined up with it; overdrive doubles the lot
var LASER_SLIDE = 0.2; // of the way to its place a step, while the piece slides into or out of laser form...
var LASER_SLIDE_BEATS = 0.5; // ...which lasts this long after the switch: a glide, not a jump
var LASER_GROW = 0.25; // beats the piece's beam takes to reach across the screen, or to go
var form = "wave"; // "wave" or "laser"
var formAt = -Infinity; // the beat the form last switched on
var gateTo = {}; // gate beat -> the form it switches to
var gateFacing = {}; // gate beat -> the way laser form faces from it

function switchForm(to, face) { // to "laser" facing `face` (1 right, -1 left; right unless given), or to "wave"
    if (form != to) {
        form = to;
        formAt = beatPos;
    }
    if (to == "laser") {
        facing = face || 1;
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
    playSfx(sfxGate, 0, SFX_LEVELS.gate, { key: actSong(level).key, toLaser: gateTo[n] == "laser" }); // the waves meeting
    switchForm(gateTo[n], gateFacing[n]); // in the beam, or parting again
}

function missGate(n) { // a gate gone by unpassed: the form switches anyway, and it costs a shield (in practice it is
    // counted as a hit instead). True if the last
    switchForm(gateTo[n], gateFacing[n]);
    if (practice) {
        practiceHits++;
        practiceRestartDue = practiceOpts.restart;
    } else {
        hp--;
    }
    perfMiss();
    judge("gate");
    if (hp > 0) {
        playSound(aud_danger);
    }
    return hp <= 0;
}

function gateAhead() { // is a gate in the coming bar, or still inside its window, on the judging clock: the touch
    // button says GATE, so the player gets ready for it (what SPACE does is still the nearest beat's to say: see
    // onActionPress)
    var late = badMs() / msPerBeat();
    for (var g in gateTo) {
        var d = Number(g) - judgePos();
        if (d >= -late && d <= BEATS_PER_BAR) {
            return true;
        }
    }
    return false;
}

var fromBar = 0; // the bar the attempt started at: 0, the level from the top, but for practice's START AT (practice.js)

function levelZeroBeat() { // the level's bar 0, after the count-in: where its bars, its song and its lasers' notes are
    // counted from, wherever the attempt started
    return COUNT_IN_BARS * BEATS_PER_BAR;
}

function firstPlayBeat() { // the first beat after the count-in: the first one that is judged and scored. An attempt
    // started at a later bar (fromBar) has its count-in in the bars before that one, and is judged from it
    return levelZeroBeat() + fromBar * BEATS_PER_BAR;
}

function playEnd() { // the beat the player's beats stop at: the one after the level's last laser is done, every beat
    // a laser fires or burns on judged (calmAt); or, its boss down, the beat after the last one before that, the bar
    // playing out as a pause (bossDown, boss.js). Nothing after it is there to hit or miss. While a boss stands, the
    // level's end, which goes round again before it comes
    return boss && boss.downAt !== null ? boss.playEnd : calmAt !== null ? Math.ceil(calmAt) : totalBeats;
}

function playBeats() { // how many beats the level judges: every one after the count-in, up to where they stop
    return playEnd() - firstPlayBeat();
}

function levelCalm() { // the moment nothing is left to dodge or to hit: the level's last laser done, or its boss down;
    // null while a boss stands
    return boss && boss.downAt !== null ? boss.downAt : calmAt;
}

function calmed() { // has the level come to that moment: the waves come to rest (player.js), and the stripes and the
    // backdrop stop pulsing
    var at = levelCalm();
    return at !== null && beatPos >= at;
}

function resolveBeat() { // the beat the song resolves on, with a last kick and a crash (finalHit): the bar line after
    // the level's last laser, or the pause's first beat after its boss falls; null while a boss stands
    if (boss && boss.downAt !== null) {
        return boss.playEnd;
    }
    return calmAt === null ? null : Math.ceil(playEnd() / BEATS_PER_BAR) * BEATS_PER_BAR;
}

function resolved() { // 0..1: how far the resolution has landed, over its first half beat, for what lights up with it
    var at = resolveBeat();
    return at === null ? 0 : Math.max(0, Math.min(1, (beatPos - at) * 2));
}

function finalHit(b, delay, kicked) { // the song resolves on beat b, `delay` seconds from now: its end over the key's
    // own chord (musicFinish, music.js), on a last kick, unless that beat's own is on its way already (kicked), and a
    // crash
    delay = Math.max(0, delay);
    if (!kicked) {
        synthKick(delay, true);
    }
    synthCrash(delay);
    musicFinish(delay, b);
}

function msPerBeat() {
    return 60000 / wave.bpm;
}

function multiplier() { // a step for every COMBO_STEP hits in a row, with no ceiling
    return 1 + Math.floor(combo / COMBO_STEP);
}

function shownScore() { // the score the HUD shows: a run's total so far, its levels banked and this one's points, or
    // a level's own points when it is played from the level select or for practice
    return selectRun || practice ? score : runScore + score;
}

function beatColor(n) { // the colour beat n wants, or null for either
    return beatColors[n] || null;
}

function cueBeat() { // the beat the player is heading for: the next one, once the last is past its window on the
    // judging clock, which is the moment it stops being hittable
    return Math.ceil(judgePos() - badMs() / msPerBeat());
}

function keyText(color) { // how to hit a beat of `color`: "Z  CYAN" or "SPACE  GATE" at the keyboard, "LT  CYAN" on a
    // controller, and by touch the button's label
    return inputMode == "touch" ? ACTIONS[color].label : actionKey(color) + "  " + ACTIONS[color].label;
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

// The rank for a cleared level, from how its beats were hit: a PERFECT is worth the beat, a GREAT three quarters of
// it, a GOOD half and a BAD a quarter (as their points are), a press off the beat takes half a beat back, and each
// shield lost costs RANK_SHIELD_COST of the whole. A boss level runs until its boss falls (extendLevel), so every beat
// of every round counts.
// S+ is an S with nothing missed at all: every beat hit, no press off one, no shield lost; and SS, over it, is an S+
// with every beat PERFECT
var RANKS = [
    { grade: "S", min: 0.90 }, // an S, S+ or SS is printed as the title is and shines (SHINES, levels.js), and needs
                               // no colour
    { grade: "A", min: 0.80, color: COLORS.good },
    { grade: "B", min: 0.65, color: COLORS.early },
    { grade: "C", min: 0.50, color: COLORS.late },
    { grade: "D", min: 0.35, color: COLORS.dim },
];
var RANK_TOP = { grade: "S+", min: 0.95 };
var RANK_PERFECT = { grade: "SS", min: 1 }; // every beat PERFECT and nothing lost: the rating whole
var RANK_FAIL = { grade: "F", color: COLORS.warn };
var RANK_SHIELD_COST = 0.05;

// The performance meter: 0..1, PERF_START at the start of every attempt. Every beat hit adds by its grade, twice over
// in overdrive; every beat missed -- gone by unhit, WRONG, OFF TARGET, or a gate not passed -- takes PERF_MISS. Empty,
// the track is failed: a death, as a laser's is. The difficulty scales the gain and the drain (perfGain and perfDrain,
// DIFFICULTIES, run.js), and one that says perfFail: false never fails for it, however empty it runs.
var PERF_START = 0.75;
var PERF_GAIN = { perfect: 0.03, great: 0.02, good: 0.01, bad: 0 };
var PERF_MISS = 0.04;
var PERF_DRIVE = 2; // what a hit in overdrive fills it by, against a plain hit's 1
var perf = PERF_START;
var perfFailed = false; // it ran empty on a difficulty that fails for it: the step ends the attempt

function perfHit(grade) { // a beat hit: the meter fills by the grade, at the difficulty's rate, doubled in overdrive
    perf = Math.min(1, perf + PERF_GAIN[grade] * mode().perfGain * (driveOn() ? PERF_DRIVE : 1));
}

function perfMiss() { // a beat missed: the meter drains at the difficulty's rate, and empty, the track is failed (never
    // in practice)
    perf = Math.max(0, perf - PERF_MISS * mode().perfDrain);
    if (perf <= 0 && mode().perfFail !== false && !practice) {
        perfFailed = true;
    }
}

function rankValue(grade) { // where a grade stands, F lowest; -1 for anything that isn't one (nothing recorded yet)
    return [RANK_FAIL].concat(RANKS.slice().reverse(), [RANK_TOP, RANK_PERFECT]).map(function (r) { return r.grade; })
        .indexOf(grade);
}

function levelRating() { // 0..1: how well this attempt's beats were hit
    var beats = playBeats();
    if (beats <= 0) {
        return 0;
    }
    var hitWorth = (perfects + greats * 0.75 + goods / 2 + bads / 4 - strays / 2) / beats;
    return Math.max(0, Math.min(1, hitWorth - shieldsLost() * RANK_SHIELD_COST));
}

function shieldsLost() { // the shields this attempt has lost, or in practice, where none are, the hits that would have cost
    return hpAtStart - hp + practiceHits;
}

function levelFlawless() { // the attempt was flawless: no miss, one combo through every beat, no hit. Every way a combo
    // breaks is a beat missed or BAD, a press off the beat (a stray) or a laser that hits, so the longest streak being the
    // beats, no stray and no shield lost says it all. The results flare FLAWLESS for it, worth no points; S+ and SS need it
    var beats = playBeats();
    return beats > 0 && bestCombo == beats && strays == 0 && shieldsLost() == 0;
}

function levelRank() { // this attempt's rank: { grade, color }
    var r = levelRating();
    var flawless = levelFlawless();
    if (flawless && perfects == playBeats() && r >= RANK_PERFECT.min) { // every beat PERFECT, and nothing lost
        return RANK_PERFECT;
    }
    if (flawless && r >= RANK_TOP.min) {
        return RANK_TOP;
    }
    return rankFor(r);
}

function rankFor(r) { // the letter a rating of r (0..1) earns on the scale alone, S to F, and its colour: also how the
    // results colour a level's longest combo against its beats
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

function levelProgress() { // 0..1 through the level, count-in included, to its last laser done; on a boss level,
    // through the boss's health, as the level runs until that is gone
    if (!wave) {
        return 0;
    }
    if (boss) {
        return 1 - boss.health / boss.max;
    }
    if (practiceLoop() && loopLen > 0) { // practice going round: how far through the round, from the pattern's first bar
        var first = loopStartBeat();
        return beatPos < first ? 0 : ((beatPos - first) % loopLen) / loopLen;
    }
    return Math.max(0, Math.min(1, beatPos / (calmAt !== null ? calmAt : totalBeats)));
}

function loopStartBeat() { // the beat the level's loop starts at, in its first round: its own bars' end, less a round
    return (COUNT_IN_BARS + wave.bars) * BEATS_PER_BAR - loopLen;
}

function levelBar(bar) { // the bar of the level's definition that bar `bar` of the level as played is: its own, or past
    // its last bar, one of a boss level's loop, which goes round again (extendLevel)
    if (loopLen <= 0 || bar < wave.bars) {
        return bar;
    }
    var loopBars = loopLen / BEATS_PER_BAR, from = wave.bars - loopBars;
    return from + (bar - from) % loopBars;
}

function earning(b) { // is beat b one that earns: any, but on a boss level only the first round's. Past the level's own
    // bars, with the boss still up, nothing is earned: no points for a hit, a beat lived through or a laser absorbed, and
    // the combo holds without climbing (a miss still breaks it), so a fight drawn out gains nothing, and the boss's
    // bonus, which follows the multiplier, only shrinks with the rounds (bossBonus, boss.js). Practice on LOOP earns
    // every round alike: there is no boss to draw out (and a boss level practised goes by the game's own rule)
    return loopLen <= 0 || practiceLoop() || b < (COUNT_IN_BARS + wave.bars) * BEATS_PER_BAR;
}

function extendLevel() { // a boss level's end in view with its boss still up: the level goes on, its loop dealt again
    // after its last bar, everything in it a round later, so the fight runs until the boss falls. A practice level on
    // LOOP goes round the same way, until the player quits
    if (loopLen <= 0 || !(bossUp() || practiceLoop()) || beatPos < totalBeats - LOOP_LEAD) {
        return;
    }
    passes++;
    var shift = passes * loopLen, copies = [];
    loopEvents.forEach(function (ev) {
        var copy = Object.assign({}, ev, { fire: ev.fire + shift });
        copies.push(copy);
        timeline.push(copy); // the beats' zaps read the timeline (scheduleBeats)
        if (copy.color) {
            beatColors[copy.fire] = copy.color;
        }
        if (copy.axis == "gate") {
            gateTo[copy.fire] = copy.to;
            gateFacing[copy.fire] = copy.facing || 1;
        }
    });
    var ahead = spawnQueue.slice(nextSpawn).concat(copies).sort(function (a, b) { // among what is still to come on
        return (a.fire - eventLead(a, warnBeats())) - (b.fire - eventLead(b, warnBeats()));
    });
    spawnQueue = spawnQueue.slice(0, nextSpawn).concat(ahead);
    totalBeats += loopLen;
}

function startLevel() { // a level is about to be played: from the start, or again after a death
    wave = practice ? practiceWave() : levelDef(level); // a practice level is the practice screen's (practice.js)
    timeline = buildTimeline(level, wave);
    fromBar = practice ? practiceFromBar() : 0; // practice's START AT: from that bar, after a count-in of its own
    var first = firstPlayBeat(), startBeat = first - levelZeroBeat(); // the bar's first beat, and the count-in's
    var ahead = timeline.filter(function (ev) { return ev.fire >= first; }); // what the bars before it held is gone
    practiceHits = 0;
    practiceRestartDue = false;
    if (practice) {
        practiceAttempt(); // the session's best for what is practised, to beat (practice.js)
    }
    spawnQueue = ahead.slice().sort(function (a, b) {
        return (a.fire - eventLead(a, warnBeats())) - (b.fire - eventLead(b, warnBeats()));
    });
    nextSpawn = 0;
    gateTo = {};
    gateFacing = {};
    timeline.forEach(function (ev) {
        if (ev.axis == "gate") {
            gateTo[ev.fire] = ev.to;
            gateFacing[ev.fire] = ev.facing || 1;
        }
    });
    form = "wave";
    formAt = -Infinity;
    facing = 1;
    timeline.forEach(function (ev) { // started inside a laser section, in laser form at once, as its gate left it
        if (ev.axis == "gate" && ev.fire < first) {
            form = ev.to;
            facing = ev.to == "laser" ? ev.facing || 1 : 1;
        }
    });
    pops = [];
    latchLatency(false); // the audio's delay, for the clock
    bossStart(wave, ahead); // its boss, if it has one (boss.js), with a point of health for every target still to come
    var from = practiceLoop() ? Math.max(1, fromBar) : loopFrom(wave); // and its loop: the bars dealt again while the
    // boss stands, or in practice on LOOP, the whole pattern after its opening rest, or from the bar it started at
    loopLen = from === null ? 0 : (wave.bars - from) * BEATS_PER_BAR;
    loopEvents = timeline.filter(function (ev) { return loopLen > 0 && ev.fire >= (COUNT_IN_BARS + from) * BEATS_PER_BAR; });
    passes = 0;
    var bars = (COUNT_IN_BARS + wave.bars) * BEATS_PER_BAR; // the count-in and the bars: where a level that can go round
    // comes to its end, and goes round again (extendLevel), and where one with nothing in it is done
    calmAt = loopLen > 0 ? null : timelineEnd(timeline, bars); // one that can't is done once its last laser is (waves.js)
    totalBeats = calmAt === null ? bars : resolveBeat() + OUTRO_BEATS;
    gameArea.frameNo = Math.round(startBeat * msPerBeat() / STEP_MS); // the clock, from the count-in (gameArea.start
    beatPos = startBeat; // has just set it going from 0)
    lastBeat = startBeat - 1;
    scheduledBeat = startBeat - 1;
    combo = carryCombo === null ? 0 : carryCombo; // a level continued into keeps the run's combo
    streak = bestCombo = 0; // and starts a streak of its own
    perfects = greats = goods = bads = strays = 0;
    perf = PERF_START;
    perfFailed = false;
    judged = {};
    beatColors = {};
    timeline.forEach(function (ev) {
        if (ev.color) {
            beatColors[ev.fire] = ev.color;
        }
    });
    nextJudge = firstPlayBeat();
    judgment = null;
    hp = carryHp === null ? shieldsMax() : carryHp; // a level continued into keeps the shields the last one left
    hpAtStart = hp;
    invuln = 0;
    drive = emptyDrive();
    drive.meter = carryMeter === null ? 0 : carryMeter; // and the charge it had; a fresh attempt charges its own
    driveGraceUntil = 0;
    carryHp = carryMeter = carryCombo = null;
    timingSum = timingCount = 0;
    timings = [];
    playerReset();
}

function endLevel() { // the level is over, cleared or lost
    deathProgress = levelProgress();
    musicStop(levelComplete() ? MUSIC_RING : MUSIC_CUT); // a clear lets the last chord ring; anything else cuts it
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
    var c = beatAudio(); // woken if the browser put it to sleep; until it runs again its clock stands still, and
    if (!c || c.state != "running") { // beats handed it now would all sound at once when it wakes: the beats that
        scheduledBeat = Math.max(scheduledBeat, Math.floor(now / mpb)); // go by while it sleeps are let go
        return;
    }
    while (scheduledBeat + 1 < totalBeats && (scheduledBeat + 1) * mpb - now < AUDIO_LOOKAHEAD_MS) {
        var b = ++scheduledBeat;
        var delay = Math.max(0, (b * mpb - now) / 1000);
        if (b >= playEnd()) { // the level's beats are over, and the drums with them: after its last laser the song plays
            // on to the bar line after it and resolves there, on a last kick and a crash; after its boss's fall it
            // resolves on the pause's first beat (bossDown, boss.js), and nothing plays after
            if (b == resolveBeat()) {
                finalHit(b, delay, false);
            } else if (calmAt !== null && b < resolveBeat()) {
                musicBeat(b - levelZeroBeat(), delay, mpb / 1000, driveOver(b), true);
            }
            continue;
        }
        if (b < firstPlayBeat()) {
            synthTick(delay, b % BEATS_PER_BAR == 0); // the count-in
            continue;
        }
        synthKick(delay, b % BEATS_PER_BAR == 0);
        var inBar = b % BEATS_PER_BAR, played = b - levelZeroBeat(); // the beat's place in its bar, and in the level
        if (played >= 0 && (inBar == 1 || inBar == 3)) {
            synthSnare(delay, false); // the backbeat
        }
        synthHat(delay + mpb / 2000, played >= 0 && inBar == BEATS_PER_BAR - 1); // and the off-beat, the bar's last
        // one open
        if (played >= 0 && (levelAct(level) >= HATS_16_FROM_ACT || wave.boss)) { // the later acts drive on in
            // sixteenths, and every act's boss
            synthHat(delay + mpb / 4000, false, true);
            synthHat(delay + 3 * mpb / 4000, false, true);
        }
        if (played >= 0 && played % (4 * BEATS_PER_BAR) == 4 * BEATS_PER_BAR - 1) { // every fourth bar ends on a fill:
            for (var q = 1; q < 4; q++) { // three soft strokes through its last beat
                synthSnare(delay + q * mpb / 4000, true);
            }
        }
        musicBeat(b - levelZeroBeat(), delay, mpb / 1000, driveOver(b)); // and the song over them (music.js)
        var fires = {}; // the moments within this beat a beam fires at, on it or off it, each sounding once
        timeline.forEach(function (ev) {
            if (ev.fire >= b && ev.fire < b + 1 && ev.axis != "target" && ev.axis != "gate") {
                fires[ev.fire] = true;
            }
        });
        for (var f in fires) { // a beam fires, or a corridor lights, on a note of the song
            synthZap(delay + (Number(f) - b) * mpb / 1000, zapNote(b));
        }
    }
}

function spawnDue() { // put up everything whose time to show has come
    while (nextSpawn < spawnQueue.length
        && beatPos >= spawnQueue[nextSpawn].fire - eventLead(spawnQueue[nextSpawn], warnBeats())) {
        hazards.push(makeHazard(spawnQueue[nextSpawn], warnBeats()));
        nextSpawn++;
    }
}

function onBeat(b) { // a whole beat just went by
    if (b >= firstPlayBeat() && b < playEnd() && earning(b)) {
        score += modePoints(SURVIVE_POINTS);
    }
    bossBeat(b); // the mirror boss remembers where the piece is, and fires where it was (boss.js)
}

function judge(grade, off, color) { // off: how far off the beat, in ms (negative early), if it was a press; color:
    // the colour it was hit in, or for WRONG the colour it wanted
    judgment = { grade: grade, age: 0, off: off, color: color };
}

function breakCombo(show, off) { // show: say MISS even with no combo to lose (a press off the beat)
    if (combo > 0 || show) {
        judge("miss", off);
    }
    loseCombo();
}

function loseCombo() { // the combo goes, and the level's streak with it
    combo = 0;
    streak = 0;
}

function pressBeat(time) { // the beat position of a press at real time `time`, less the time the audio takes to
    // reach the ears (the player taps along to what they hear) and the player's own timing offset (OPTIONS)
    return (simNowMs(time) - levelLatencyMs - timingOffset) / msPerBeat();
}

function judgePos() { // where the level stands on the judging clock, the one pressBeat puts presses on: beatPos itself,
    // which is the beat as it is heard (above). The name stays for what is judged by it
    return beatPos;
}

function beatOpen(n) { // can beat n still be hit: its window hasn't closed on the judging clock. The miss check and a
    // target's or gate's stay on screen both go by this, so neither can get ahead of a press that is still on time
    return (judgePos() - n) * msPerBeat() <= badMs();
}

function hitBeat(time, color) { // a press in `color` at real time `time`: judged against the nearest beat
    hitBeatAt(pressBeat(time), color);
}

function hitBeatAt(b, color) { // a hit in `color` at beat position b, judged against the nearest beat: a press's, or
    // practice's AUTO TIMING's, exactly on its beat (autoTimingStep)
    var n = Math.round(b);
    playerHitFlash("miss", color); // every press shows on the head, in the count-in too, whatever it comes to; a hit
    // lights it fully below
    if (n < firstPlayBeat() || n >= playEnd()) {
        return; // the count-in, and once the level's last laser is done (or its boss is down): tap along freely
    }
    var signed = (b - n) * msPerBeat(); // negative early, positive late
    var off = Math.abs(signed);
    if (judged[n]) { // mashing one already hit
        strays++;
        breakCombo(true);
        return;
    }
    if (off > badMs()) { // off the beat
        strays++;
        breakCombo(true, signed);
        return;
    }
    timingSum += signed; // a press inside the window says where this player's presses land; one off the beat is a
    timingCount++; // slip, and left out, as it would only drag the average about
    timings.push(signed);
    var want = beatColor(n);
    if (want && want != "gate" && color != want) { // on the beat, in the wrong colour: the beat is spent. A gate's
        // beat takes any key, SPACE or either colour's
        judged[n] = "wrong";
        strays++;
        loseCombo();
        perfMiss();
        judge("wrong", signed, want);
        return;
    }
    var target = onBeatOf(Target, n);
    if (target && !linedUp(target)) { // on the beat and in its colour, but the beam isn't on it: spent as WRONG is
        judged[n] = "wide";
        strays++;
        loseCombo();
        perfMiss();
        judge("wide", signed, color);
        return;
    }
    judged[n] = "hit";
    var grade = off <= perfectMs() ? "perfect" : off <= greatMs() ? "great" : off <= goodMs() ? "good" : "bad";
    if (grade == "perfect") {
        perfects++;
        chargeDrive(n, 1);
    } else if (grade == "great") {
        greats++;
        chargeDrive(n, OVERDRIVE_GREAT);
    } else if (grade == "good") {
        goods++;
        chargeDrive(n, OVERDRIVE_GOOD);
    } else {
        bads++;
        chargeDrive(n, OVERDRIVE_BAD);
    }
    var earns = earning(n); // past a boss level's first round, no points, and the combo holds without climbing
    if (grade == "bad") { // the beat is spent, but not cleanly: the combo goes, as on a miss
        loseCombo();
    } else {
        streak++; // the level's own run of hits, which goes on counting whether the beat earns or not
        bestCombo = Math.max(bestCombo, streak);
    }
    if (grade != "bad" && earns) {
        var multWas = multiplier();
        combo++;
        runPeakCombo = Math.max(runPeakCombo, combo);
        if (multiplier() > multWas) { // the multiplier stepped up: said at the orb, as a hit's points are
            popText("x" + multiplier(), "MULTIPLIER", COLORS.good, gamePiece.x + gamePiece.width / 2 + 44, gamePiece.y + gamePiece.height / 2 + 26, 1.3); // under
            // the judgement, which sits over the orb
            playSfx(sfxMultiplier, 0, SFX_LEVELS.multiplier, { key: actSong(level).key, mult: multiplier() });
        }
    }
    if (earns) {
        score += modePoints(POINTS[grade] * pointsMult());
    }
    perfHit(grade);
    judge(grade, signed, color);
    playerHitFlash(grade, color); // the full burst for a clean hit, half for a BAD
    if (target) { // the beam strikes it
        target.hitX = target.center().x;
        target.hitAt = beatPos;
        synthShot(0);
        bossHit(1, true); // and the boss, on a boss level, whose port it was, if its ports are open
    }
    if (want == "gate") {
        passGate(n);
    }
}

function checkMissed() { // beats whose window has closed on the judging clock (beatOpen) unhit break the combo, and a
    // gate gone by unpassed switches the form anyway and costs a shield. True if that was the last one
    var dead = false;
    while (nextJudge < playEnd() && !beatOpen(nextJudge)) {
        if (!judged[nextJudge]) {
            breakCombo(false);
            perfMiss();
        }
        if (beatColor(nextJudge) == "gate" && judged[nextJudge] != "hit") {
            dead = missGate(nextJudge) || dead;
        }
        nextJudge++;
    }
    return dead;
}

function takeHit() { // a laser got the piece: returns true if that was the last shield. In practice it is counted, and
    // costs nothing
    if (invuln > 0) {
        return false;
    }
    if (practice) {
        practiceHits++;
        practiceRestartDue = practiceOpts.restart; // RESTART ON HIT: the level again, once this step is through
    } else {
        hp--;
    }
    breakCombo(false);
    judge("hit");
    invuln = INVULN_STEPS;
    if (hp > 0) {
        playSound(aud_danger);
    }
    return hp <= 0;
}

function onActionPress(name, time) { // an action went down while playing, at real time `time`. SPACE hits a gate
    // when the beat nearest the press is one, and spends overdrive when it isn't. With practice's AUTO TIMING the beats
    // and the gates are hit for the player, so only overdrive is left to the keys
    if (name == "gate" && beatColor(Math.round(pressBeat(time))) != "gate") {
        spendDrive(time);
    } else if (!practiceAuto()) {
        hitBeat(time, ACTIONS[name].beat);
    }
}

function autoTimingStep() { // practice's AUTO TIMING: each beat hit the moment it comes, exactly on it (PERFECT), in the
    // colour it wants (either, cyan, where it wants none; a gate's takes any). Lining up with a target is still the
    // player's
    if (!practiceAuto()) {
        return;
    }
    var n = Math.floor(beatPos);
    if (n >= firstPlayBeat() && n < playEnd() && !judged[n]) {
        hitBeatAt(n, beatColor(n) == "magenta" ? "magenta" : "cyan");
    }
}

function onActionRelease(name) { // and came up again
}

function beatFrac() { // how far through the current beat, 0 on it: the beat as the player plays it (judgePos), which
    // every pulse on the beat keeps to, so what flashes on the beat flashes when a press is on it
    var j = judgePos();
    return j - Math.floor(j);
}

function drawBeatPulse() { // a stripe under each banner flashes on every beat, harder on the bar, white in overdrive;
    // once the level is done, only on the last kick, as the song resolves
    var kick = Math.max(0, 1 - beatFrac() * 4);
    var bar = Math.floor(judgePos()) % BEATS_PER_BAR == 0 ? 1 : 0.5;
    if (calmed()) {
        var at = resolveBeat();
        kick = at !== null && beatPos >= at ? Math.max(0, 1 - (beatPos - at) * 4) : 0;
        bar = 1;
    }
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
    var x = targetX() * gameArea.canvas.width;
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

function drawCountIn() { // 4, 3, 2, 1 over the count-in, the level's name and tempo with it, then GO: on the beat as
    // the player plays it (judgePos), as the waves are, so the count lands where the first hit will
    var first = firstPlayBeat();
    var j = Math.max(0, judgePos()); // the judged clock starts a little behind the level's
    if (j >= first + 1) {
        return;
    }
    var text = j < first ? String(first - Math.floor(j)) : "GO";
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
const JUDGE_STYLE = { perfect: ["PERFECT", null], great: ["GREAT", null], good: ["GOOD", null], bad: ["BAD", COLORS.late],
    miss: ["MISS", COLORS.dim],
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

function drawLevel(forDeath) { // draw the level as it stands, without moving anything (also used while paused). For
    // the death animation's picture (death.js): without the piece and without the CRT, which it draws live itself
    drawSky(level, beatPos * msPerBeat() / 1000, calmed() ? null : judgePos(), 1, resolved()); // the ground: its act's
    // backdrop, its colour, and the beat as the player plays it to pulse on; the level done, still, and lit up as the
    // song resolves
    drawBeatPulse();
    drawStrikeLine();
    drawBoss(); // the boss's node, on a boss level, behind the lasers and the targets
    drawWorld();
    if (boss) {
        drawBossBar(); // its health, in the progress stripe's slot
    } else {
        drawProgress();
    }
    drawCountIn();
    drawDriveCall();
    drawFormCall();
    useHud();
    drawStats(COLORS.text, COLORS.cyan);
    useWindow();
    drawPracticeCaption(); // in practice, what the bar playing deals (practice.js)
    drawTouchControls(); // over the HUD, under the piece
    if (!forDeath) {
        gamePiece.update(); // the two waves: where they meet is the beat
    }
    drawJudgment();
    drawPops();
    if (!forDeath) {
        fxDrawScreen(fxLook()); // the CRT last, over the finished picture
    }
}

function steerPiece() { // move the piece toward where it is steered; true if that ran it into a laser, and that was
    // the last shield. In laser form it is held to its line, and for a moment after a switch it glides, through anything
    var w = gamePiece.width, h = gamePiece.height;
    var cx = gamePiece.x + w / 2, cy = gamePiece.y + h / 2;
    var tx = gameArea.x !== undefined ? gameArea.x : cx;
    var ty = gameArea.y !== undefined ? gameArea.y : cy;
    if (form == "laser") {
        tx = laserX() * gameArea.canvas.width;
    }
    if (beatPos - formAt < LASER_SLIDE_BEATS) {
        movePiece(cx + (tx - cx) * LASER_SLIDE - w / 2, cy + (ty - cy) * LASER_SLIDE - h / 2, true);
        return false;
    }
    if (form == "wave" && gameArea.x === undefined) {
        return false; // nothing has steered it yet
    }
    return movePiece(tx - w / 2, ty - h / 2, invuln > 0 || driveOn() || driveGrace() || switchGrace()) && takeHit(); // stepped, so a laser can't be
    // crossed while it burns, in either form
}

function updateGameArea() {
    if (pause) {
        return; // while paused, nothing updates; setPause draws the pause screen once
    }
    // The loop runs 100 fixed steps a second against a screen that refreshes 60 times, so a step that another step is
    // already due to overwrite would draw a picture nobody sees. Such a step is still simulated in full; it just isn't
    // painted. Nothing drawn may change the game, and nothing drawn draws on Math.random (the effects hash their own
    // numbers, fxHash): skipping a draw must never change what comes next, nor what the next picture looks like.
    showFrame = !fxOverdrawn();
    gameArea.frameNo += 1;
    trackLatency(); // the audio's delay as it now stands
    beatPos = (gameArea.frameNo * STEP_MS - levelLatencyMs - timingOffset) / msPerBeat(); // the beat as it is heard
    fxStep();

    extendLevel(); // a boss level's boss still up as its end comes into view: another round
    scheduleBeats();
    spawnDue();
    worldStep(); // the beams warm up, burn and go
    bossStep(); // and a boss that moves, moves
    while (lastBeat < Math.floor(beatPos)) {
        onBeat(++lastBeat);
    }
    autoTimingStep(); // practice's AUTO TIMING hits the beat that has just come
    if (checkMissed()) { // a gate gone by took the last shield
        gameOver();
        return;
    }
    if (perfFailed) { // the performance meter ran empty
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
    } else if (!driveGrace() && !switchGrace() && hitHazard() && takeHit()) { // a beam fired on the piece (in the grace
        // after overdrive, and through a change of form, it still can't hurt it, though it eats nothing)
        gameOver();
        return;
    }
    if (steerPiece()) { // the piece was steered into one, and that was the last shield
        gameOver();
        return;
    }
    if (practiceRestartDue) { // practice with RESTART ON HIT: something got the piece, so the level starts again
        practiceRestartDue = false;
        practiceRestart();
        return;
    }
    playerRecord(); // where the piece is now, for the waves' trail
    notePracticeScore(); // in practice, the session's best for it, if these points are more (practice.js)

    if (showFrame) {
        drawLevel();
    }
    if (levelComplete()) { // every bar survived
        gameOver();
    }
}
