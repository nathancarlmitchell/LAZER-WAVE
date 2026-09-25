// Lazer Wave -- the run. The difficulties and the lives they give, and the records: the best run and what it cost,
// a best split per level, and the furthest level reached, kept per difficulty in localStorage and read defensively.
// And the m:ss the finish and the start screen print. index.html loads this with a plain <script src>, as globals
// rather than modules, so the game still opens straight off disk.

// The difficulties, picked on the start screen because they define a run rather than configure one. Lives make a
// death keep the level's score instead of wiping it. Add levers here (hazard speed, timing windows) as the game grows.
const DIFFICULTIES = [
    { name: "easy", label: "EASY 簡単", lives: 3 },
    { name: "normal", label: "NORMAL 普通", lives: 0 },
];
var difficulty = "normal";
var runLives = 0; // lives left this run
var lifeSpent = false; // the death being shown was paid for with a life

function mode() { // the difficulty in force
    for (var i = 0; i < DIFFICULTIES.length; i++) {
        if (DIFFICULTIES[i].name == difficulty) {
            return DIFFICULTIES[i];
        }
    }
    return DIFFICULTIES[1]; // normal, if a stored name ever gets past the check that should have caught it
}

function startRunLives() { // a run begins: the lives are its own
    runLives = mode().lives;
}

function runStatusText() { // what this difficulty is giving, for the HUD, or "" when it is giving nothing
    return mode().lives > 0 ? "LIVES " + runLives : "";
}

// Records, kept as one JSON blob beside the settings and read the same defensive way -- a private window throws rather
// than returning null, and a half-written or hand-edited value must not be what stops the game starting.
var RECORDS_STORE = "lazerwave.records";
var RUN_LEVELS = LEVELS.length - 1; // levels in a full run (waves.js); the one after the last is the finish screen

var records = { modes: {} }; // a set per difficulty: a best on EASY is not a best on TRUE, and mixing them
                             // would let the easiest mode set a time the hardest could never beat

function rec() { // the record set for the difficulty now selected
    if (!records.modes[difficulty]) {
        records.modes[difficulty] = {
            run: null, // fastest completed run, in ms
            runDeaths: 0, // and what it cost
            level: {}, // fastest clear of each level, in ms: the split
            reached: 0, // furthest level started, so a run that never finishes still leaves a mark
        };
    }
    return records.modes[difficulty];
}
var levelStart = 0; // when the level being played began (ms), moved forward by time spent paused, as startTime is
var levelBeat = 0; // how long the level just cleared took, and whether that is the best it has been
var levelRecord = false;

var RECORD_MAX_MS = 86400000; // a day: past this a stored time is not a run, and printing it would look broken

function storedTime(v) { // a stored number we are willing to believe
    return typeof v == "number" && isFinite(v) && v > 0 && v <= RECORD_MAX_MS ? v : null;
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
                reached: Math.min(RUN_LEVELS, storedTime(from.reached) || 0), level: {} };
            if (from.level && typeof from.level == "object") {
                for (var n = 1; n <= RUN_LEVELS; n++) {
                    var split = storedTime(from.level[n]);
                    if (split) {
                        to.level[n] = split;
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

function reachedLevel(n) { // a level began: the furthest one reached is a record of its own for a run that never ends
    if (n > rec().reached && n <= RUN_LEVELS) {
        rec().reached = n;
        saveRecords();
    }
}

function recordLevel(n) { // a level was cleared: its split, and whether that is the fastest it has been flown
    levelBeat = Date.now() - levelStart;
    levelRecord = !rec().level[n] || levelBeat < rec().level[n];
    if (levelRecord) {
        rec().level[n] = levelBeat;
        saveRecords();
    }
}

function recordRun(ms, cost) { // every level cleared: the run's time, against the best there has been
    var beat = !rec().run || ms < rec().run;
    if (beat) {
        rec().run = ms;
        rec().runDeaths = cost;
        saveRecords();
    }
    return beat;
}

function splitText(ms) { // a level takes seconds, not minutes: m:ss would round away the difference between two runs
    return (ms / 1000).toFixed(1) + "s";
}

function mistakes(n) {
    return n + (n == 1 ? " mistake" : " mistakes");
}

function recordsLine() { // what the start screen has to say about how this has gone before, or "" the first time
    if (rec().run) {
        return "BEST " + millisToMinutesAndSeconds(rec().run) + "   " + mistakes(rec().runDeaths);
    }
    if (rec().reached > 1) {
        return "FURTHEST   Level " + rec().reached;
    }
    return "";
}

function millisToMinutesAndSeconds(millis) { // m:ss, to the nearest second. Rounded to whole seconds first and split
    // after: rounding the seconds on their own turned the last half second of every minute into ":60"
    var total = Math.round(millis / 1000);
    var minutes = Math.floor(total / 60);
    var seconds = total % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
}
