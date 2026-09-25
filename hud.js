// Lazer Wave -- the HUD. The score, combo, shields, overdrive meter and level in the corner, packed up in touch
// play, and the progress stripe filling the top banner's slot as the level plays through. index.html loads this with a
// plain <script src>, as globals rather than modules, so the game still opens straight off disk.

var BAR_TOP = 40, BAR_H = 20; // the progress stripe, in the top banner's own slot
var BAR_ALPHA = 0.6;
var BAR_TRACK = 0.15; // the unfilled remainder, just enough to show how far there is left to go

// On a phone the stats are the same size as on a desktop but the screen is a third of the height, so in touch play
// the two secondary readouts shrink and close up under the score, which keeps its size.
var TOUCH_STAT_FONT = 26; // px, against the score's 40
var TOUCH_STAT_LEVEL = 195, TOUCH_STAT_DEATHS = 230; // instead of 220 and 260
var METER_X = 136, METER_Y = 151, METER_W = 100, METER_H = 8; // the overdrive meter, on the shields' row after
                                                                // them, so it crowds neither layout

function drawStats(color, scoreColor) { // score, combo, shields, and the level in the top-left corner
    var touch = inputMode == "touch";
    ctx.save();
    ctx.shadowColor = COLORS.bg; // a dark halo, so it stays readable with a beam burning behind it
    ctx.shadowBlur = 6;
    ctx.font = "40px Arial"; // the score is drawn at full size in both layouts
    ctx.fillStyle = scoreColor || color;
    ctx.fillText(score, 50, 100);
    if (combo > 0) { // what a point is worth now, which overdrive doubles
        ctx.font = "24px Arial";
        ctx.fillStyle = driveOn() ? COLORS.laserCore : COLORS.magenta;
        ctx.fillText("x" + pointsMult() + "   COMBO " + combo, 50, 132);
    }
    for (var i = 0; i < HP_MAX; i++) { // the shields: filled while they last
        ctx.fillStyle = COLORS.cyan;
        ctx.globalAlpha = i < hp ? 0.9 : 0.25;
        ctx.fillRect(50 + i * 26, 146, 18, 18);
    }
    drawDriveMeter(touch);
    ctx.globalAlpha = 1;
    ctx.font = (touch ? TOUCH_STAT_FONT : 30) + "px Arial";
    ctx.fillStyle = color;
    ctx.fillText("Level " + level + "   " + wave.bpm + " BPM", 50, touch ? TOUCH_STAT_LEVEL : 220);
    ctx.fillText(mistakes(deaths), 50, touch ? TOUCH_STAT_DEATHS : 260);
    var status = runStatusText(); // and only when the difficulty gives something
    if (status) {
        ctx.fillText(status, 50, touch ? TOUCH_STAT_DEATHS + 35 : 300);
    }
    ctx.restore();
}

function drawDriveMeter(touch) { // overdrive's meter: charging, then full and throbbing on the beat with what to do,
    // then running down while it runs
    var waiting = driveReady() || driveArmed();
    ctx.fillStyle = COLORS.laserCore;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(METER_X, METER_Y, METER_W, METER_H);
    ctx.globalAlpha = waiting ? 0.55 + 0.45 * Math.max(0, 1 - beatFrac() * 3) : 0.9;
    ctx.fillRect(METER_X, METER_Y, METER_W * driveMeter(), METER_H);
    var label = driveOn() ? "OVERDRIVE" : driveArmed() ? "NEXT BAR" : driveReady() ? (touch ? "READY" : "SPACE") : "";
    if (label) { // steady, whatever the bar is doing
        ctx.globalAlpha = 1;
        ctx.font = "bold 16px Arial";
        ctx.fillText(label, METER_X + METER_W + 10, METER_Y + METER_H + 2);
    }
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
