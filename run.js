// Lazer Wave -- the run. The difficulties and what each gives, and the records: the best run and what it cost, the
// most a run has banked, a best rank and a best score per level, and the furthest level reached, kept per difficulty
// in localStorage and read defensively. A level runs the length of its song whoever plays it, so its time is no
// record.
// And the m:ss the finish and the start screen print. index.html loads this with a plain <script src>, as globals
// rather than modules, so the game still opens straight off disk.

// The difficulties, picked on the start screen because they define a run rather than configure one. Each is a few
// numbers. lives: the deaths a run survives, each buying the level again with its points kept, the death after the
// last being the game over. shields: what an attempt starts with. window: what the timing windows are multiplied by
// (PERFECT_MS and GOOD_MS, loop.js). warn: what a level's warning time is multiplied by (its `warn`, waves.js: how
// many beats ahead a laser shows itself). points: what every point scored is multiplied by. blurb: what all that
// comes to, said under or beside the button in a line or two. Records are kept per difficulty (rec).
const DIFFICULTIES = [
    { name: "easy", label: "EASY 簡単", lives: 5, shields: 4, window: 1.3, warn: 1.25, points: 0.5,
        blurb: ["5 lives · 4 shields · half points", "wide timing · long warnings"] },
    { name: "normal", label: "NORMAL 普通", lives: 3, shields: 3, window: 1, warn: 1, points: 1,
        blurb: ["3 lives · 3 shields · points as scored", "timing and warnings as written"] },
    { name: "hard", label: "HARD 難しい", lives: 2, shields: 2, window: 0.8, warn: 0.85, points: 1.5,
        blurb: ["2 lives · 2 shields · points x1.5", "tight timing · short warnings"] },
    { name: "true", label: "TRUE 真", lives: 0, shields: 1, window: 0.65, warn: 0.7, points: 2,
        blurb: ["no lives · 1 shield · points x2", "the tightest timing · the shortest warnings"] },
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

function startRunLives() { // a run begins: the lives are its own
    runLives = mode().lives;
}

function runStatusText() { // what this difficulty is giving, for the HUD, or "" when it is giving nothing
    return mode().lives > 0 ? "LIVES " + runLives : "";
}

// Records, kept as one JSON blob beside the settings and read the same defensive way -- a private window throws rather
// than returning null, and a half-written or hand-edited value must not be what stops the game starting.
var RECORDS_STORE = "lazerwave.records.v3"; // v3: the five acts of five levels. The levels before them were other
                                            // levels, so those records are left where they are, unread
var RUN_LEVELS = LEVELS.length - 1; // levels in a full run (waves.js); the one after the last is the finish screen

var records = { modes: {} }; // a set per difficulty: a best on EASY is not a best on TRUE, and mixing them
                             // would let the easiest mode set a time the hardest could never beat

function rec() { // the record set for the difficulty now selected
    if (!records.modes[difficulty]) {
        records.modes[difficulty] = {
            run: null, // fastest completed run, in ms
            runDeaths: 0, // and what it cost
            rank: {}, // best rank each level has been cleared with, "F" to "S+"
            score: {}, // most points each level has been cleared with
            reached: 0, // furthest level started, so a run that never finishes still leaves a mark
            runScore: 0, // the most a run has banked: its total after a CONTINUE, so a run that never finishes counts
        };
    }
    return records.modes[difficulty];
}
var levelGrade = ""; // the rank the level just cleared was given, and whether that is the best it has had
var gradeRecord = false;
var scoreRecord = false; // and whether its points are the most it has been cleared with

var RECORD_MAX_MS = 86400000; // a day: past this a stored time is not a run, and printing it would look broken
var RECORD_MAX_SCORE = 10000000; // and past this a stored score is not one a level can give

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
                rank: {}, score: {} };
            // older records kept each level's time too: nothing reads it now, so the next save lets it go
            if (from.rank && typeof from.rank == "object") {
                for (var r = 1; r <= RUN_LEVELS; r++) {
                    if (rankValue(from.rank[r]) >= 0) { // a grade there is, and nothing else
                        to.rank[r] = from.rank[r];
                    }
                }
            }
            if (from.score && typeof from.score == "object") { // records kept before scores were have none: fine
                for (var k = 1; k <= RUN_LEVELS; k++) {
                    var points = storedScore(from.score[k]);
                    if (points !== null) {
                        to.score[k] = points;
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

function levelBeaten(n) { // level n has been cleared, on any difficulty: which is what opens the next one
    for (var i = 0; i < DIFFICULTIES.length; i++) {
        var m = records.modes[DIFFICULTIES[i].name];
        if (m && (m.rank[n] || m.score[n] !== undefined)) { // a clear leaves a rank and a score, so either will do
            return true;
        }
    }
    return false;
}

function levelUnlocked(n) { // open on the level select: the first always, and after it any level whose one before
    // has been beaten, or that has been beaten itself
    return n == 1 || levelBeaten(n) || levelBeaten(n - 1);
}

function reachedLevel(n) { // a level began: the furthest one reached is a record of its own for a run that never ends
    if (n > rec().reached && n <= RUN_LEVELS) {
        rec().reached = n;
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
    scoreRecord = most === undefined || score > most; // a tie is not a new best
    if (scoreRecord) {
        rec().score[n] = score;
    }
    if (gradeRecord || scoreRecord) {
        saveRecords();
    }
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

function recordRunScore(total) { // CONTINUE banked a level's points: the run's total, against the most a run has had
    if (total > (rec().runScore || 0)) {
        rec().runScore = total;
        saveRecords();
    }
}

function mistakes(n) {
    return n + (n == 1 ? " mistake" : " mistakes");
}

function recordsLine() { // what the start screen has to say about how this has gone before, or "" the first time:
    // the most a run has scored, and once a run has been finished, its best time and what that cost
    var line = rec().runScore ? "BEST RUN " + rec().runScore : "";
    if (rec().run) {
        line += (line ? "   " : "") + "BEST TIME " + millisToMinutesAndSeconds(rec().run) + "   " + mistakes(rec().runDeaths);
    }
    return line;
}

function millisToMinutesAndSeconds(millis) { // m:ss, to the nearest second. Rounded to whole seconds first and split
    // after: rounding the seconds on their own turned the last half second of every minute into ":60"
    var total = Math.round(millis / 1000);
    var minutes = Math.floor(total / 60);
    var seconds = total % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}
