// Lazer Wave -- the HUD. The score, combo, shields and level in the corner, packed up in touch play, and the
// progress stripe filling the top banner's slot as the level plays through. index.html loads this with a plain <script src>,
// as globals rather than modules, so the game still opens straight off disk.

var BAR_TOP = 40, BAR_H = 20; // the progress stripe, in the top banner's own slot
var BAR_ALPHA = 0.6;
var BAR_TRACK = 0.15; // the unfilled remainder, just enough to show how far there is left to go

// On a phone the stats are the same size as on a desktop but the screen is a third of the height, so in touch play
// the two secondary readouts shrink and close up under the score, which keeps its size.
var TOUCH_STAT_FONT = 26; // px, against the score's 40
var TOUCH_STAT_LEVEL = 195, TOUCH_STAT_DEATHS = 230; // instead of 220 and 260

function drawStats(color, scoreColor) { // score, combo, shields, and the level in the top-left corner
    var touch = inputMode == "touch";
    ctx.save();
    ctx.shadowColor = COLORS.bg; // a dark halo, so it stays readable with a beam burning behind it
    ctx.shadowBlur = 6;
    ctx.font = "40px Arial"; // the score is drawn at full size in both layouts
    ctx.fillStyle = scoreColor || color;
    ctx.fillText(score, 50, 100);
    if (combo > 0) {
        ctx.font = "24px Arial";
        ctx.fillStyle = COLORS.magenta;
        ctx.fillText("x" + multiplier() + "   COMBO " + combo, 50, 132);
    }
    for (var i = 0; i < HP_MAX; i++) { // the shields: filled while they last
        ctx.fillStyle = COLORS.cyan;
        ctx.globalAlpha = i < hp ? 0.9 : 0.25;
        ctx.fillRect(50 + i * 26, 146, 18, 18);
    }
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
