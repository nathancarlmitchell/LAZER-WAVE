// Lazer Wave -- the HUD. The score, combo, shields, overdrive meter, level and the run's lives in the corner, packed up
// in touch play, and the progress stripe filling the top banner's slot as the level plays through. index.html loads
// this with a plain <script src>, as globals rather than modules, so the game still opens straight off disk.

var BAR_TOP = 40, BAR_H = 20; // the progress stripe, in the top banner's own slot
var BAR_ALPHA = 0.6;
var BAR_TRACK = 0.15; // the unfilled remainder, just enough to show how far there is left to go

// On a phone the stats are the same size as on a desktop but the screen is a third of the height, so in touch play
// the two secondary readouts shrink and close up under the score, which keeps its size against them, and the whole
// corner is then drawn at TOUCH_HUD_SCALE (useHud, layout.js), so it takes a fifth of the height rather than a third.
var TOUCH_HUD_SCALE = 0.7;
var TOUCH_STAT_FONT = 26; // px, against the score's 40
var TOUCH_STAT_LEVEL = 195; // the level's line, instead of 220
var LIVES_Y = 250, TOUCH_LIVES_Y = 221; // the middle of the lives' row, under the level's line, in either layout
var LIFE_W = 38, LIFE_GAP = 12, LIFE_AMP = 7; // a life's icon (drawLife): its waves' length, the room between two, and
                                              // how far each wave opens from the middle
var METER_Y = 151, METER_W = 100, METER_H = 8; // the overdrive meter, on the shields' row after them, so it crowds
                                               // neither layout
function meterX() { // where it starts: after the shields the difficulty gives, however many
    return 50 + shieldsMax() * 26 + 8;
}

function drawStats(color, scoreColor) { // the score (a run's total, or the level's own from the level select: shownScore,
    // loop.js), combo, shields, the level and the lives in the top-left corner
    var touch = inputMode == "touch";
    ctx.save();
    ctx.shadowColor = COLORS.bg; // a dark halo, so it stays readable with a beam burning behind it
    ctx.shadowBlur = 6;
    ctx.font = "40px Arial"; // the score is drawn at full size in both layouts
    ctx.fillStyle = scoreColor || color;
    ctx.fillText(shownScore(), 50, 100);
    if (combo > 0) { // what a point is worth now, which overdrive doubles
        ctx.font = "24px Arial";
        ctx.fillStyle = driveOn() ? COLORS.laserCore : COLORS.magenta;
        ctx.fillText("x" + pointsMult() + "   COMBO " + combo, 50, 132);
    }
    for (var i = 0; i < shieldsMax(); i++) { // the shields: filled while they last
        ctx.fillStyle = COLORS.cyan;
        ctx.globalAlpha = i < hp ? 0.9 : 0.25;
        ctx.fillRect(50 + i * 26, 146, 18, 18);
    }
    if (!driveOff()) { // none in practice with OVERDRIVE OFF
        drawDriveMeter(touch);
    }
    drawPerfMeter(touch);
    ctx.globalAlpha = 1;
    ctx.font = (touch ? TOUCH_STAT_FONT : 30) + "px Arial";
    ctx.fillStyle = color;
    ctx.fillText((practice ? "PRACTICE   " + practiceLabel() : bossRush ? "Boss Rush  " + rushIndex(level) + " / "
        + RUSH_LEVELS.length : "Act " + roman(levelAct(level)) + "  Level " + level)
        + "   " + wave.bpm + " BPM", 50, touch ? TOUCH_STAT_LEVEL : 220);
    for (var j = 0; j < runLivesMax(); j++) { // the lives, when the run has any (none from the level select): lit while
        drawLife(50 + j * (LIFE_W + LIFE_GAP), touch ? TOUCH_LIVES_Y : LIVES_Y, j < runLives); // they last, as the
    } // shields are
    if (practice) { // in their place in practice, which has none: the hits the shields would have paid for, on LOOP the
        // round, and the session's best for what is practised (practice.js), in a new best's colour while this attempt
        // is beating it, as it climbs with the score
        var parts = [["HITS " + practiceHits, practiceHits ? COLORS.warn : color]];
        if (practiceLoop()) {
            parts.push(["ROUND " + practiceRound(), color]);
        }
        parts.push(["BEST " + practiceBestText(), practiceNewBest() ? COLORS.good : color]);
        var lx = 50, ly = touch ? TOUCH_LIVES_Y + 9 : LIVES_Y + 10;
        parts.forEach(function (part) {
            ctx.fillStyle = part[1];
            ctx.fillText(part[0], lx, ly);
            lx += ctx.measureText(part[0] + "   ").width;
        });
    }
    ctx.restore();
}

function livesWidth(n) { // a row of n lives, end to end: the last one's core glows a little past its waves
    return n * LIFE_W + (n - 1) * LIFE_GAP + 8;
}

function drawLife(x, y, lit) { // a life: the piece in small, its left end at x and its middle at y. A beat and a half
    // of its two waves, cyan above and magenta below, opening and meeting on their way back from its core on the
    // right and fading as the trail does. lit: 1 (or true) while it lasts, 0 once spent, dim, and between as it goes
    var head = x + LIFE_W, steps = 16, a = 0.25 + 0.75 * lit;
    ctx.globalAlpha = a;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    [[-1, COLORS.cyan], [1, COLORS.magenta]].forEach(function (w) {
        var fade = ctx.createLinearGradient(head, 0, x, 0);
        fade.addColorStop(0, w[1]);
        fade.addColorStop(1, w[1] + "33"); // the colour at a fifth
        ctx.strokeStyle = fade;
        ctx.beginPath();
        for (var k = 0; k <= steps; k++) {
            var t = k / steps;
            ctx.lineTo(head - t * LIFE_W, y + w[0] * LIFE_AMP * Math.abs(Math.sin(1.5 * Math.PI * t)));
        }
        ctx.stroke();
    });
    ctx.fillStyle = COLORS.cyan; // the core's glow, and the core
    ctx.globalAlpha = 0.08 + 0.22 * lit;
    ctx.beginPath();
    ctx.arc(head, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.laserCore;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(head, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawDriveMeter(touch) { // overdrive's meter: charging, then full and throbbing on the beat with what to do,
    // then running down while it runs. Once the level is done (calmed, loop.js) a full one holds still, saying nothing:
    // there is no beat left to spend it on, and it carries into the next level as it is
    var waiting = (driveReady() || driveArmed()) && !calmed();
    ctx.fillStyle = COLORS.laserCore;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(meterX(), METER_Y, METER_W, METER_H);
    ctx.globalAlpha = waiting ? 0.55 + 0.45 * Math.max(0, 1 - beatFrac() * 3) : 0.9;
    ctx.fillRect(meterX(), METER_Y, METER_W * driveMeter(), METER_H);
    var label = driveOn() ? "OVERDRIVE" : !waiting ? "" : driveArmed() ? "NEXT BEAT"
        : touch ? "READY" : actionKey("gate");
    if (label) { // steady, whatever the bar is doing
        ctx.globalAlpha = 1;
        ctx.font = "bold 16px Arial";
        ctx.fillText(label, meterX() + METER_W + 10, METER_Y + METER_H + 2);
    }
}

var PERF_Y = 178, PERF_TOUCH_Y = 168, PERF_W = 186, PERF_H = 6; // the performance meter (perf, loop.js): under the
                                                                // shields' row, above the level's line in either layout

function drawPerfMeter(touch) { // from empty, the track failed, to full: green with room to spare, amber below half,
    // red below a quarter, its figure beside it
    var y = touch ? PERF_TOUCH_Y : PERF_Y;
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = COLORS.laserCore;
    ctx.fillRect(50, y, PERF_W, PERF_H);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = perf < 0.25 ? COLORS.warn : perf < 0.5 ? COLORS.late : COLORS.good;
    ctx.fillRect(50, y, PERF_W * perf, PERF_H);
    ctx.globalAlpha = 1;
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(Math.round(perf * 100) + "%", 50 + PERF_W + 8, y + PERF_H);
}

function drawProgress() { // the top stripe filling as the level plays through its bars
    var w = gameArea.canvas.width;
    var done = levelProgress();
    ctx.save();
    useWindow(); // the full window width, like the banners it sits in
    ctx.globalAlpha = BAR_TRACK;
    ctx.fillStyle = COLORS.magenta;
    ctx.fillRect(0, BAR_TOP, w, BAR_H);
    ctx.globalAlpha = BAR_ALPHA;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(0, BAR_TOP, w * done, BAR_H);
    ctx.restore();
}
