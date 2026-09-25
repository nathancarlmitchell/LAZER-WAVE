// Lazer Wave -- the effects. Everything here draws the look of the game and nothing here changes it: these functions
// read the game's state and never write to it, so every spawn, score and sound is the same with the effects on or off.
// No Math.random here (fxHash instead), so the spawns' stream is never touched by how the game is drawn. index.html
// loads this with a plain <script src>, as globals rather than modules, so the game still opens straight off disk.
//
// The game's entry points into this file: fxStep once a step, fxDrawScreen when a step is drawn, fxReset at a level's
// edges, fxLook and fxHash from the menus, fxOverdrawn from the loop.

var fxMode = "auto"; // "auto" follows the device's reduced-motion setting; "full", "reduced" or "off" pin it
var reducedMotion = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null; // .matches follows the setting live

// The CRT: scanlines over the finished picture, and a bar rolling slowly down them
var FX_SCAN_ON = true;
var FX_SCAN_PERIOD = 3; // px from one line to the next
var FX_SCAN_LINE = 1; // px of that period which is dark
var FX_SCAN_ALPHA = 0.25;
var FX_ROLL_ON = true; // the bar sweeping down: the CRT's one moving part, so the reduced look keeps the lines and drops it
var FX_ROLL_H = 140; // its height, px
var FX_ROLL_ALPHA = 0.06;
var FX_ROLL_RATE = 1.1; // px a step, deliberately not scaled by anything the game does: it belongs to the tube

var fx = {
    look: "off", // this step's look: "full", "reduced" or "off" (see fxLook)
    roll: 0, // how far the CRT's bar has swept, in px
    scan: null, // the scanline pattern, built once from a tiny offscreen tile
    rollGrad: null, // the bar's gradient, made once in unit space and fitted with setTransform
};

function fxLook() { // fxMode, or for "auto": "reduced" if the player asked their device for less motion, else "full"
    if (fxMode != "auto") {
        return fxMode;
    }
    return reducedMotion && reducedMotion.matches ? "reduced" : "full";
}

function fxReset() { // a level starts or ends: nothing carries over
    fx.roll = 0;
}

function fxStep() { // each step, before anything is drawn
    fx.look = fxLook();
    if (fx.look == "off") {
        fxReset();
        return;
    }
    fx.roll += FX_ROLL_RATE;
}

function fxHash(a, b) { // a repeatable 0..1 from two whole numbers: the effects' own randomness (Math.random drives the spawns)
    var h = (Math.imul(a, 374761393) + Math.imul(b, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function fxOverdrawn() { // runSteps runs another step before the screen shows this one, and that step clears it first
    return gameArea.running && gameArea.pendingTime >= STEP_MS;
}

function fxScanPattern() { // the scanline tile, built once, and immune to a canvas resize
    if (!fx.scan) {
        var tile = document.createElement("canvas");
        tile.width = 1;
        tile.height = FX_SCAN_PERIOD;
        var t = tile.getContext("2d");
        t.fillStyle = "rgba(0,0,0," + FX_SCAN_ALPHA + ")";
        t.fillRect(0, 0, 1, FX_SCAN_LINE);
        fx.scan = ctx.createPattern(tile, "repeat");
    }
    return fx.scan;
}

function fxRollGradient() { // the bar across its own height: nothing at the edges, brightest through the middle
    if (!fx.rollGrad) {
        var g = ctx.createLinearGradient(0, 0, 0, 1);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, "rgba(255,255,255,1)"); // globalAlpha scales this down to FX_ROLL_ALPHA at the peak
        g.addColorStop(1, "rgba(255,255,255,0)");
        fx.rollGrad = g;
    }
    return fx.rollGrad;
}

function fxDrawScreen(look) { // the CRT, over the finished picture: the scanlines, and the bar rolling down them
    if (!FX_SCAN_ON || look == "off" || fxOverdrawn()) {
        return;
    }
    var w = gameArea.canvas.width, h = gameArea.canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = fxScanPattern();
    ctx.fillRect(0, 0, w, h); // ONE fill: a fillRect per line costs a whole step's budget on a big screen
    if (FX_ROLL_ON && look == "full") {
        ctx.globalAlpha = FX_ROLL_ALPHA;
        ctx.fillStyle = fxRollGradient();
        ctx.setTransform(w, 0, 0, FX_ROLL_H, 0, fx.roll % (h + FX_ROLL_H) - FX_ROLL_H); // the unit band, placed
        ctx.fillRect(0, 0, 1, 1);
    }
    ctx.restore();
}
