// Lazer Wave -- the run. The difficulties and what each gives, and the records: the best run and what it cost, the
// most a run has scored, a best rank per level and a best score for playing it on its own, the furthest level
// reached, and how far through each unbeaten level an attempt has got, kept per difficulty in localStorage and read
// defensively. A level runs the length of its song whoever plays it, so its time is no record. And the m:ss the
// finish prints. index.html loads this with a plain <script src>, as globals rather than modules, so the game still
// opens straight off disk.

// The difficulties, picked on the screen START opens (or changed on the level select), because they define a run
// rather than configure one. Each is a few numbers. lives: the deaths a run survives, each buying the level again
// with its points kept, the death after the last being the game over. shields: what an attempt starts with. warn:
// what a level's warning time is multiplied by (its `warn`, waves.js: how many beats ahead a laser shows itself).
// speed: the pace of the lasers that move as they burn, of TRUE's (laserPace, waves.js): a corridor keeps its bar and
// covers less of its path, a sweeper, the radar, a pendulum and the spinning X make their whole way all the same over
// the bars after their own, the drifting lasers take longer to cross.
// gap: how much wider the gaps the player is asked into are than TRUE's: a corridor's, a wall's, closing walls', a
// pincer's, a cage's cell and a sweeper's hole (gapRoom, waves.js).
// points: what every point scored is multiplied by. perfGain and perfDrain: what the performance meter's fill on a
// hit and drain on a miss are multiplied by (loop.js), and perfFail: false means an empty meter never fails the
// track. The timing windows are the same on every difficulty. blurb: what all that comes to, said on its button in a
// line or two. Records are kept per difficulty (rec), and so are the level select's unlocks (levelBeaten).
const DIFFICULTIES = [
    { name: "easy", label: "EASY 簡単", lives: 3, shields: 3, warn: 1.5, speed: 0.4, gap: 1.5, points: 0.5,
        perfGain: 1.25, perfDrain: 0.75, perfFail: false,
        blurb: ["half points · moving lasers at their slowest", "long warnings · performance can't fail you"] },
    { name: "normal", label: "NORMAL 普通", lives: 3, shields: 3, warn: 1.25, speed: 0.6, gap: 1.3, points: 1,
        perfGain: 1, perfDrain: 1,
        blurb: ["points as scored · moving lasers slowed", "warnings as written · performance fails at empty"] },
    { name: "hard", label: "HARD 難しい", lives: 3, shields: 3, warn: 1, speed: 0.8, gap: 1.15, points: 1.5,
        perfGain: 0.8, perfDrain: 1.25, blurb: ["points x1.5 · moving lasers a little slowed",
            "short warnings · performance fills slower, drains faster"] },
    { name: "true", label: "TRUE 真", lives: 3, shields: 3, warn: 0.85, speed: 1, gap: 1, points: 2,
        perfGain: 0.65, perfDrain: 1.5, blurb: ["points x2 · moving lasers at full speed",
            "the shortest warnings · performance fills slowest, drains fastest"] },
];
var difficulty = "normal";
var runLives = 0; // lives left this run

function mode() { // the difficulty in force
    for (var i = 0; i < DIFFICULTIES.length; i++) {
        if (DIFFICULTIES[i].name == difficulty) {
            return DIFFICULTIES[i];
        }
    }
    return DIFFICULTIES[1]; // normal, if a stored name ever gets past the check that should have caught it
}

function modeName() { // the difficulty's name as its button says it, in capitals: "NORMAL"
    return mode().label.split(" ")[0];
}

function shieldsMax() { // the shields an attempt starts with on this difficulty
    return mode().shields;
}

function modePoints(points) { // points scored, at what this difficulty makes them worth
    return Math.round(points * mode().points);
}

function scoreText(n) { // a score as it is shown, its thousands set off with commas (1,234,567), as the site's boards
    // show them; anything not a number (a dash for none) as it is
    return typeof n == "number" && isFinite(n) ? String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",") : String(n);
}

function startRunLives() { // a run begins: the lives are its own (the HUD shows them, drawLife)
    runLives = mode().lives;
}

function runLivesMax() { // the lives the run has to spend: the difficulty's, on a run from START; none for a level played
    // from the level select, where a death only ever offers the level again, from nothing, so there is nothing to run
    // out of (gameOver, levels.js), nor for practice, which can't be lost
    return selectRun || practice ? 0 : mode().lives;
}

// Records, kept as one JSON blob beside the settings and read the same defensive way -- a private window throws rather
// than returning null, and a half-written or hand-edited value must not be what stops the game starting.
var RECORDS_STORE = "lazerwave.records.v3"; // v3: the five acts of five levels. The levels before them were other
                                            // levels, so those records are left where they are, unread
var RUN_LEVELS = LEVELS.length - 1; // levels in a full run (waves.js); the one after the last is the finish screen

// The boss rush: every boss, one after another, as a run of its own -- its lives, and the shields, the charge and the
// combo carried from each boss to the next -- with records of its own on each difficulty, kept apart from a run's and
// the level select's: its best total, its fastest finish and what that cost, and each boss's best rank in it
var RUSH_LEVELS = LEVELS.map(function (def, n) { return def && def.boss ? n : 0; }).filter(Boolean); // 5, 10, 15, 20, 25

function rushNext(n) { // the boss after level n in the rush, or past the last level: the finish
    for (var i = 0; i < RUSH_LEVELS.length; i++) {
        if (RUSH_LEVELS[i] > n) {
            return RUSH_LEVELS[i];
        }
    }
    return RUN_LEVELS + 1;
}

function rushIndex(n) { // which of the rush's bosses level n is, from 1
    return RUSH_LEVELS.indexOf(n) + 1;
}

var records = { modes: {} }; // a set per difficulty: a best on EASY is not a best on TRUE, and mixing them
                             // would let the easiest mode set a time the hardest could never beat

function rec() { // the record set for the difficulty now selected
    if (!records.modes[difficulty]) {
        records.modes[difficulty] = {
            run: null, // fastest completed run, in ms
            runDeaths: 0, // and what it cost
            rank: {}, // best rank each level has been cleared with, "F" to "S+"
            score: {}, // most points each level has been cleared with on its own, from the level select: a run carries its
                       // multiplier from level to level, so its levels score on another scale, and a run is measured by
                       // its total (runScore)
            reached: 0, // furthest level started, so a run that never finishes still leaves a mark
            runFurthest: 0, // the furthest level a full run has started (the level select's plays aside)
            runCombo: 0, // the longest a full run's combo has run, carried from level to level: its MAX COMBO
            reach: {}, // how far through each unbeaten level an attempt has got, 0 to 1; let go once it is beaten
            runScore: 0, // the most a run has scored: its total as each level ends, cleared or not, so a run that never
                         // finishes counts, and one that never clears a level
            rush: null, // and the boss rush's, apart from them: its fastest finish, in ms,
            rushDeaths: 0, // what that cost,
            rushScore: 0, // the most it has scored, counted as a run's is,
            rushRank: {}, // and each boss's best rank in it,
            rushCombo: 0, // and its longest combo
        };
    }
    return records.modes[difficulty];
}
var levelGrade = ""; // the rank the level just cleared was given, and whether that is the best it has had
var gradeRecord = false;
var scoreRecord = false; // and whether its points are the most it has been cleared with, playing it on its own
var runRecord = false; // and, on a run or a rush, whether its total as the level just ended is the most one has scored
var reachRecord = false; // whether the death just had got further through its unbeaten level than any attempt before

var RECORD_MAX_MS = 86400000; // a day: past this a stored time is not a run, and printing it would look broken
var RECORD_MAX_SCORE = 1e12; // and past this a stored score is not one the game can give, the multiplier having no ceiling

function storedTime(v) { // a stored number we are willing to believe
    return typeof v == "number" && isFinite(v) && v > 0 && v <= RECORD_MAX_MS ? v : null;
}

function storedScore(v) { // a stored score we are willing to believe: a whole number of points, or null
    return typeof v == "number" && isFinite(v) && v >= 0 && v <= RECORD_MAX_SCORE && Math.floor(v) == v ? v : null;
}

function loadRecords() { // whatever previous runs left, if the browser will tell us
    try {
        var got = JSON.parse(window.localStorage.getItem(RECORDS_STORE));
        if (!got || typeof got != "object" || !got.modes || typeof got.modes != "object") {
            return;
        }
        records.modes = {}; // what was stored replaces what is held, rather than merging into it
        for (var i = 0; i < DIFFICULTIES.length; i++) {
            var name = DIFFICULTIES[i].name;
            var from = got.modes[name];
            if (!from || typeof from != "object") {
                continue; // a mode never played, or something that isn't a record set
            }
            var to = { run: storedTime(from.run), runDeaths: storedTime(from.runDeaths) || 0,
                reached: Math.min(RUN_LEVELS, storedTime(from.reached) || 0), runScore: storedScore(from.runScore) || 0,
                runFurthest: Math.min(RUN_LEVELS, storedTime(from.runFurthest) || 0),
                runCombo: storedScore(from.runCombo) || 0, rank: {}, score: {}, reach: {}, rush: storedTime(from.rush),
                rushDeaths: storedTime(from.rushDeaths) || 0, rushScore: storedScore(from.rushScore) || 0, rushRank: {},
                rushCombo: storedScore(from.rushCombo) || 0 };
            // older records kept each level's time too: nothing reads it now, so the next save lets it go
            if (from.rank && typeof from.rank == "object") {
                for (var r = 1; r <= RUN_LEVELS; r++) {
                    if (rankValue(from.rank[r]) >= 0) { // a grade there is, and nothing else
                        to.rank[r] = from.rank[r];
                    }
                }
            }
            if (from.rushRank && typeof from.rushRank == "object") { // the boss rush's, for its bosses only
                RUSH_LEVELS.forEach(function (n) {
                    if (rankValue(from.rushRank[n]) >= 0) {
                        to.rushRank[n] = from.rushRank[n];
                    }
                });
            }
            if (from.score && typeof from.score == "object") { // records kept before scores were have none: fine
                for (var k = 1; k <= RUN_LEVELS; k++) {
                    var points = storedScore(from.score[k]);
                    if (points !== null) {
                        to.score[k] = points;
                    }
                }
            }
            if (from.reach && typeof from.reach == "object") { // a share of a level, and only of one still unbeaten
                for (var j = 1; j <= RUN_LEVELS; j++) {
                    var far = from.reach[j];
                    if (typeof far == "number" && isFinite(far) && far > 0 && far <= 1 && to.rank[j] === undefined) {
                        to.reach[j] = far;
                    }
                }
            }
            records.modes[name] = to;
        }
    } catch (e) { // blocked storage, a private window, or something that isn't JSON: play without them
    }
}

function saveRecords() {
    try {
        window.localStorage.setItem(RECORDS_STORE, JSON.stringify(records));
    } catch (e) { // nothing to do: the records still hold for this session
    }
}

function levelBeaten(n) { // level n has been cleared on the difficulty chosen, in a run or on its own: which is what
    // opens the next one there. Each difficulty has unlocks of its own; a clear leaves a rank, whichever way it came
    return rec().rank[n] !== undefined;
}

function levelUnlocked(n) { // open on the level select: the first always, and after it any level whose one before
    // has been beaten, or that has been beaten itself
    return n == 1 || levelBeaten(n) || levelBeaten(n - 1);
}

function reachedLevel(n) { // a level began: the furthest one reached is a record of its own for a run that never ends,
    // and on a full run, the furthest one of those has got (the difficulty screen's FURTHEST)
    var changed = false;
    if (n > rec().reached && n <= RUN_LEVELS) {
        rec().reached = n;
        changed = true;
    }
    if (!selectRun && n > (rec().runFurthest || 0) && n <= RUN_LEVELS) {
        rec().runFurthest = n;
        changed = true;
    }
    if (changed) {
        saveRecords();
    }
}

function recordRunCombo(n) { // a level of a full run or a boss rush ended, cleared or not: the run's MAX COMBO so far
    // (runPeakCombo, loop.js) against the longest either has had on this difficulty, each its own
    var key = bossRush ? "rushCombo" : "runCombo";
    if (n > (rec()[key] || 0)) {
        rec()[key] = n;
        saveRecords();
    }
}

function recordLevel(n) { // a level was cleared: its rank and its score, and whether each is the best it has been
    levelGrade = levelRank().grade;
    gradeRecord = rankValue(levelGrade) > rankValue(rec().rank[n]); // nothing stored is below every grade
    if (gradeRecord) {
        rec().rank[n] = levelGrade;
    }
    var most = rec().score[n];
    scoreRecord = selectRun && (most === undefined || score > most); // a tie is not a new best; and only a level played on
    // its own sets its score: a run's levels, their multiplier carried in, are on another scale (recordRunScore)
    if (scoreRecord) {
        rec().score[n] = score;
    }
    if (rec().reach[n] !== undefined) { // beaten: how far attempts got is no record any more
        delete rec().reach[n];
        saveRecords();
    }
    if (gradeRecord || scoreRecord) {
        saveRecords();
    }
}

function recordReach(n, progress) { // an attempt at level n died `progress` of the way through it (or, on a boss level,
    // through the boss): while the level is unbeaten, the furthest an attempt has got is a record of its own. True when
    // this one got further than the one before; the first attempt sets the mark without beating one
    if (rec().rank[n] !== undefined || !(progress > 0)) {
        return false; // beaten, its attempts have got through the whole of it; and one that got nowhere is no mark
    }
    var was = rec().reach[n];
    if (was !== undefined && progress <= was) {
        return false;
    }
    rec().reach[n] = progress;
    saveRecords();
    return was !== undefined;
}

function recFor(name) { // the record set for a difficulty named, or null if it has none yet
    return records.modes[name] || null;
}

function recordRushLevel(n) { // a boss cleared in the boss rush: its rank, against the best it has had there (a run's and
    // the level select's are left alone)
    levelGrade = levelRank().grade;
    gradeRecord = rankValue(levelGrade) > rankValue(rec().rushRank[n]);
    scoreRecord = false;
    if (gradeRecord) {
        rec().rushRank[n] = levelGrade;
        saveRecords();
    }
}

function recordRushScore(total) { // a boss of the rush cleared, or a death at one: its total with these points, against
    // the most a rush has had; true when it is the most now
    if (total > (rec().rushScore || 0)) {
        rec().rushScore = total;
        saveRecords();
        return true;
    }
    return false;
}

function recordRush(ms, cost) { // every boss cleared: the rush's time, against the best there has been
    var beat = !rec().rush || ms < rec().rush;
    if (beat) {
        rec().rush = ms;
        rec().rushDeaths = cost;
        saveRecords();
    }
    return beat;
}

function recordRun(ms, cost) { // every level cleared, from the first: the run's time, against the best there has been
    var beat = !rec().run || ms < rec().run;
    if (beat) {
        rec().run = ms;
        rec().runDeaths = cost;
        saveRecords();
    }
    return beat;
}

function recordRunScore(total) { // a level of a run cleared, or a death on one: the run's total with its points,
    // against the most a run has had; true when it is the most now
    if (total > (rec().runScore || 0)) {
        rec().runScore = total;
        saveRecords();
        return true;
    }
    return false;
}

function mistakes(n) {
    return n + (n == 1 ? " mistake" : " mistakes");
}

function millisToMinutesAndSeconds(millis) { // m:ss, to the nearest second. Rounded to whole seconds first and split
    // after: rounding the seconds on their own turned the last half second of every minute into ":60"
    var total = Math.round(millis / 1000);
    var minutes = Math.floor(total / 60);
    var seconds = total % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}
