// Lazer Wave -- the timing test. OPTIONS' CALIBRATE: a steady beat plays, the player taps along to it by ear with
// whatever they will play with (a key, a mouse button, a finger or a controller), and from where the taps land against
// the beats it works out the timing offset that would put them on it, and offers it. index.html loads this with a
// plain <script src>, as globals rather than modules, so the game still opens straight off disk. Nothing here runs at
// load.
//
// It measures what the game judges. Its beats are handed to the audio clock as a level's are (scheduleBeats, loop.js):
// each is timed on performance.now()'s clock and given to the audio clock as a delay from now. A press in a level is
// judged against its beat less the delay the browser reports for the sound (audioLatencyMs) and less the offset
// (pressBeat); so a tap here, less its beat and that same reported delay, is exactly what the offset has to take away:
// whatever the device doesn't report (a wireless headset, say), the input's own delay, and the player's habit of
// tapping ahead or behind. A tap carries the moment the input happened, as a press in play does. And nothing on the
// screen moves on the beat, so the taps follow the ears rather than the eyes.

var CAL_BPM = 100; // in the middle of the levels' tempos, with the beats far enough apart (600 ms) that a tap as far off
                   // as TIMING_LIMIT either way is still nearest its own
var CAL_LEAD_MS = 700; // from the sound being ready to the first beat
var CAL_LOOKAHEAD_MS = 100; // how far ahead the beats are handed to the audio clock, as scheduleBeats does
var CAL_WARMUP = 4; // taps left out while the player finds the beat
var CAL_TAPS = 16; // taps counted after them: then it stops and says what it found
var CAL_MAX_BEATS = 72; // beats it plays waiting for them (about 43 s) before it gives up
var CAL_OUTLIER = 90; // ms from the middle of the counted taps past which one is a slip, and left out
var CAL_MIN_KEEP = 10; // counted taps that must be left for a reading
var CAL_MAX_SPREAD = 50; // ms: taps more scattered than this (their standard deviation) are too uneven to go on
var CAL_STALL_MS = 800; // a gap between frames this long (the tab put away) starts it again: beats went by unheard
var CAL_GRACE_MS = 1500; // the reading's buttons take no press this soon after it comes in: taps that run on past the
                         // last one, as the beat stops, mustn't press one
var CAL_SCALE_MS = 250; // the scale the taps are shown on runs this far either side of the beat
var CAL_SCALE_W = 300; // layout px from its middle to either end

var cal = { state: "", frame: null, start: 0, next: 0, last: 0, taps: [], used: {}, skipped: {}, result: null,
    doneAt: 0 };
// state: "wait" for the sound to be ready, "run" taking taps, "done" with a reading, "nosound" with no Web Audio to
// play the beat on. start: when beat 0 falls (performance.now()'s clock); next: the next beat to hand the audio clock;
// taps: each tap's distance from its beat as heard, in ms, in order, the warm-up's first; used: the beats tapped;
// skipped: beats a stall made late, which nothing is measured against; result: the reading (calReading), and doneAt
// when it came in

function calInterval() { // ms from one of its beats to the next
    return 60000 / CAL_BPM;
}

function calStart() { // the screen came up, or AGAIN: listen from nothing
    calStop();
    cal.taps = [];
    cal.used = {};
    cal.skipped = {};
    cal.result = null;
    cal.next = 0;
    cal.last = 0;
    cal.state = beatAudio() ? "wait" : "nosound"; // made or woken in the press that got here, which lets it sound
    if (cal.state == "wait") {
        cal.frame = requestAnimationFrame(calFrame);
    }
}

function calStop() { // the screen went, or the taps are in: no more beats
    if (cal.frame !== null) {
        cancelAnimationFrame(cal.frame);
        cal.frame = null;
    }
}

function calTaking() { // taps go to the test rather than to the screen's buttons: while it plays, or waits to
    return menuScreen == "calibrate" && (cal.state == "wait" || cal.state == "run");
}

function calFrame() { // each frame while it waits or plays: start once the sound is ready, then keep the beats coming
    cal.frame = null;
    if (menuScreen != "calibrate") {
        return; // a beat must never outlive the screen
    }
    var real = performance.now();
    if (cal.state == "wait" && audioCtx && audioCtx.state == "running") {
        cal.state = "run";
        cal.start = real + CAL_LEAD_MS;
        drawStartScreen();
    } else if (cal.state == "wait" && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) {
        beatAudio(); // the page has had its click or key now (any key: not only those that tap), so it may sound
    } else if (cal.state == "run") {
        if (cal.last && real - cal.last > CAL_STALL_MS) {
            calStart();
            drawStartScreen();
            return;
        }
        calSchedule(real);
        if (cal.next > CAL_MAX_BEATS) { // not enough taps came
            calFinish();
            drawStartScreen();
            return;
        }
    }
    cal.last = real;
    cal.frame = requestAnimationFrame(calFrame);
}

function calSchedule(real) { // hand the audio clock every beat due within the lookahead, as a delay from now: a kick,
    // as in a level, with a tick over it for a sharp edge to tap to, and the first of every four a little higher
    var mpb = calInterval();
    while (cal.start + cal.next * mpb - real < CAL_LOOKAHEAD_MS) {
        var k = cal.next++;
        var ahead = cal.start + k * mpb - real;
        if (ahead < -5) { // its moment went by in a stall: it would sound late, so it doesn't sound, and doesn't count
            cal.skipped[k] = true;
            continue;
        }
        var delay = Math.max(0, ahead / 1000);
        synthKick(delay, k % 4 == 0);
        synthTick(delay, k % 4 == 0);
    }
}

function calTap(time) { // a tap at `time`, on performance.now()'s clock: measured against the beat it is nearest, as
    // heard. Before the first beat, on a beat a stall skipped, or a second on one: nothing to measure
    if (cal.state == "wait") {
        beatAudio(); // a key, click or touch lets the sound start where the press that got here couldn't (a controller)
        return;
    }
    if (cal.state != "run") {
        return;
    }
    var mpb = calInterval(), heard = time - audioLatencyMs();
    var k = Math.round((heard - cal.start) / mpb);
    if (k < 0 || cal.skipped[k] || cal.used[k]) {
        return;
    }
    cal.used[k] = true;
    cal.taps.push(heard - (cal.start + k * mpb));
    if (cal.taps.length >= CAL_WARMUP + CAL_TAPS) {
        calFinish();
    }
    drawStartScreen();
}

function calFinish() { // the taps are in, or the time is up: stop, and read them. A controller's light goes to the
    // way on: USE, or AGAIN
    calStop();
    cal.state = "done";
    cal.doneAt = performance.now();
    cal.result = calReading(cal.taps.slice(CAL_WARMUP));
    if (inputMode == "pad") {
        hoveredButton = cal.result.ok ? "cal_use" : "cal_again";
    }
}

function calMiddle(list) { // the median
    var s = list.slice().sort(function (a, b) { return a - b; });
    return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2;
}

function calReading(taps) { // what a set of counted taps comes to: the offset that would put them on the beat (their
    // mean, once any slips far from their middle are left out), how steady they were, and whether that is worth
    // offering. ok is false with why "few" (not enough taps) or "uneven" (too scattered)
    if (taps.length < CAL_MIN_KEEP) {
        return { ok: false, why: "few", n: taps.length };
    }
    var mid = calMiddle(taps);
    var kept = taps.filter(function (t) { return Math.abs(t - mid) <= CAL_OUTLIER; });
    if (kept.length < CAL_MIN_KEEP) {
        return { ok: false, why: "uneven", n: taps.length, mid: mid };
    }
    var mean = kept.reduce(function (sum, t) { return sum + t; }, 0) / kept.length;
    var spread = Math.sqrt(kept.reduce(function (sum, t) { return sum + (t - mean) * (t - mean); }, 0) / kept.length);
    var offset = Math.max(-TIMING_LIMIT, Math.min(TIMING_LIMIT, Math.round(mean / TIMING_STEP) * TIMING_STEP));
    var ok = spread <= CAL_MAX_SPREAD;
    return { ok: ok, why: ok ? "" : "uneven", offset: offset, mean: mean, spread: spread, mid: mid,
        kept: kept.length, n: taps.length };
}

function calButtons() { // the screen's buttons: BACK while it listens; with a reading, USE it (when it can be trusted),
    // AGAIN, or BACK
    var w = 220, h = 64, dy = 200;
    if (cal.state != "done") {
        return { cal_back: { dx: -w / 2, dy: dy, w: w, h: h, back: true, label: "BACK" } };
    }
    if (!cal.result.ok) {
        return { cal_again: { dx: -w - 10, dy: dy, w: w, h: h, again: true, label: "AGAIN" },
            cal_back: { dx: 10, dy: dy, w: w, h: h, back: true, label: "BACK" } };
    }
    return { cal_use: { dx: -w * 1.5 - 20, dy: dy, w: w, h: h, use: true, label: "USE " + msText(cal.result.offset) },
        cal_again: { dx: -w / 2, dy: dy, w: w, h: h, again: true, label: "AGAIN" },
        cal_back: { dx: w / 2 + 20, dy: dy, w: w, h: h, back: true, label: "BACK" } };
}

function calPress(name) { // a press on one of them: USE sets the offset and goes back to the settings, which show it
    var b = calButtons()[name];
    if (!b || (cal.state == "done" && performance.now() - cal.doneAt < CAL_GRACE_MS)) {
        return;
    }
    if (b.use) {
        setSetting("timing", cal.result.offset);
        closeMenu();
    } else if (b.again) {
        playSound(aud_click);
        calStart();
        drawStartScreen();
    } else if (b.back) {
        closeMenu();
    }
}

function calKey(key) { // a key on the reading: ENTER uses it, R goes again. True if it was one of those
    if (menuScreen != "calibrate" || cal.state != "done") {
        return false;
    }
    if (key == "Enter" && cal.result.ok) {
        calPress("cal_use");
        return true;
    }
    if (key == "r") {
        calPress("cal_again");
        return true;
    }
    return false;
}

function drawCalibrateScreen() { // what to do, where the taps are landing, and what they come to
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2;
    useWindow();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);

    useScreenFrame(); // fitted to the screen as the settings are
    ctx.textAlign = "center";
    ctx.font = "70px Arial";
    ctx.fillStyle = COLORS.cyan; // the title printed twice
    ctx.fillText("CALIBRATE", cx - 4, cy - 234);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText("CALIBRATE", cx, cy - 230);
    ctx.font = "28px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("タイミング調整", cx, cy - 196);
    ctx.font = "26px Arial";
    ctx.fillText(inputMode == "touch" ? "Tap anywhere on every beat you hear"
        : inputMode == "pad" ? "Press A on every beat you hear"
        : "Press Z, X or SPACE, or click, on every beat you hear", cx, cy - 140);
    ctx.font = "20px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText("Listen rather than watch: nothing here moves on the beat", cx, cy - 108);

    calDrawScale(cx, cy + 10);
    calDrawStatus(cx, cy);
    ctx.textAlign = "start";

    var buttons = calButtons();
    for (var name in buttons) {
        var b = buttons[name];
        drawMenuButton(b, b.label, "30px Arial");
        if (b.use) { // the one it suggests, washed in cyan as START is
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = COLORS.cyan;
            ctx.fillRect(cx + b.dx + 2, cy + b.dy + 2, b.w - 4, b.h - 4);
            ctx.globalAlpha = 1.0;
        }
    }
    ctx.textAlign = "center";
    ctx.font = "20px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(calFooter(), cx, cy + 310);
    ctx.textAlign = "start";

    drawScreenBanners();
    titleParticles(); // the dust behind it, as behind the start screen (titleparticles.js)
}

function calDrawScale(cx, ay) { // a line from early to late, the beat in its middle, with a mark where each tap landed
    // and one over them where they come to. The warm-up's taps are dim, and so are slips left out of the reading
    var k = CAL_SCALE_W / CAL_SCALE_MS; // px a ms
    var at = function (ms) { return cx + Math.max(-CAL_SCALE_MS, Math.min(CAL_SCALE_MS, ms)) * k; };
    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(cx - CAL_SCALE_W, ay - 1, 2 * CAL_SCALE_W, 2);
    ctx.font = "18px Arial";
    for (var ms = -200; ms <= 200; ms += 50) {
        var major = ms % 100 == 0;
        ctx.fillStyle = ms == 0 ? COLORS.text : COLORS.dim;
        ctx.fillRect(at(ms) - 1, ay - (major ? 8 : 5), 2, major ? 16 : 10);
        if (major) {
            ctx.fillText(ms == 0 ? "BEAT" : (ms > 0 ? "+" : "") + ms, at(ms), ay + 30);
        }
    }
    ctx.font = "20px Arial";
    ctx.textAlign = "right";
    ctx.fillText("EARLY", cx - CAL_SCALE_W - 12, ay + 7);
    ctx.textAlign = "left";
    ctx.fillText("LATE", cx + CAL_SCALE_W + 12, ay + 7);
    ctx.textAlign = "center";
    var r = cal.result;
    cal.taps.forEach(function (t, i) {
        var counted = i >= CAL_WARMUP && !(r && r.mid !== undefined && Math.abs(t - r.mid) > CAL_OUTLIER);
        var newest = i == cal.taps.length - 1 && cal.state == "run";
        ctx.globalAlpha = counted ? 0.85 : 0.5;
        ctx.fillStyle = newest ? COLORS.laserCore : counted ? COLORS.cyan : COLORS.dim;
        ctx.fillRect(at(t) - 1.5, ay - (newest ? 40 : 32), 3, newest ? 36 : 28);
    });
    ctx.globalAlpha = 1.0;
    var mark = calMark();
    if (mark !== null) { // where they come to: a marker over them, and the figure
        var mx = at(mark);
        ctx.fillStyle = COLORS.magenta;
        ctx.beginPath();
        ctx.moveTo(mx - 8, ay - 52);
        ctx.lineTo(mx + 8, ay - 52);
        ctx.lineTo(mx, ay - 42);
        ctx.closePath();
        ctx.fill();
        ctx.font = "bold 22px Arial";
        ctx.fillText(msText(Math.round(mark / TIMING_STEP) * TIMING_STEP), mx, ay - 60); // in the offset's own steps
    }
}

function calMark() { // where the counted taps come to, in ms from the beat, for the scale: the reading once it is in,
    // their middle while they come, or null before there are enough to say
    if (cal.result && cal.result.mean !== undefined) {
        return cal.result.mean;
    }
    var counted = cal.taps.slice(CAL_WARMUP);
    return counted.length >= 4 ? calMiddle(counted) : null;
}

function calDrawStatus(cx, cy) { // how it is going, and under it what that means
    var head = "", note = "", color = COLORS.text;
    var now = "set now: " + msText(timingOffset);
    var counted = Math.max(0, cal.taps.length - CAL_WARMUP);
    if (cal.state == "nosound") {
        head = "NO SOUND";
        color = COLORS.warn;
        note = "This browser can't play the beat, so the test can't run";
    } else if (cal.state == "wait") {
        head = "GET READY";
        note = inputMode == "pad" && navigator.userActivation && !navigator.userActivation.hasBeenActive
            ? "For sound, click or press a key once: the browser won't start it from a controller"
            : "The beat starts in a moment";
    } else if (cal.state == "run" && cal.taps.length < CAL_WARMUP) {
        head = "WARM-UP  " + cal.taps.length + " / " + CAL_WARMUP;
        note = "Tap on every beat: these first taps aren't counted";
    } else if (cal.state == "run") {
        head = "COUNTING  " + counted + " / " + CAL_TAPS;
        color = COLORS.cyan;
        note = now;
    } else if (cal.result.ok) {
        head = "SUGGESTED OFFSET: " + msText(cal.result.offset);
        color = COLORS.magenta;
        var mean = Math.round(cal.result.mean / TIMING_STEP) * TIMING_STEP; // as the offset is, but not held to its limit
        note = (mean == 0 ? "Your taps landed on the beat" : "Your taps landed " + Math.abs(mean) + " ms "
            + (mean < 0 ? "early" : "late")) + ", steady to ±" + Math.round(cal.result.spread) + " ms  ·  " + now;
    } else {
        head = cal.result.why == "few" ? "TOO FEW TAPS" : "TOO UNEVEN TO TRUST";
        color = COLORS.warn;
        note = cal.result.why == "few" ? "It needs " + CAL_TAPS + " taps after the warm-up: go AGAIN, on every beat"
            : "Go AGAIN, tapping on every beat as you hear it";
    }
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = color;
    ctx.fillText(head, cx, cy + 104);
    ctx.font = "20px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(note, cx, cy + 140);
}

function calFooter() { // how to get out, or on, in this input's words
    var done = cal.state == "done", ok = done && cal.result.ok;
    if (inputMode == "touch") {
        return ok ? "Tap USE to set it, or BACK to leave it as it is" : "Tap BACK to return, leaving it as it is";
    }
    if (inputMode == "pad") {
        return ok ? "Press A on USE to set it, or B to leave it as it is" : "Press B to return, leaving it as it is";
    }
    return ok ? "ENTER uses it, R goes again, Escape leaves it as it is"
        : done ? "R goes again; Escape returns, leaving it as it is" : "Click BACK, or press Escape, to return";
}
