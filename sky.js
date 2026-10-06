// Lazer Wave -- the sky. Every act has a backdrop of its own, and every level a colour: the run climbs the visible
// spectrum an act at a time, from deep red at the first level to violet at the last, and each act's backdrop is lit in
// its level's colour. It is drawn under the level, and under the story screens between levels, dark enough that
// nothing in it can be taken for a laser. index.html loads this with a plain <script src>, as globals rather than
// modules, so the game still opens straight off disk.
//
// Like the other effects it reads the game and never writes to it, and its randomness is fxHash, never Math.random.
// At full effects it moves, and pulses on the beat; reduced, it holds still; off, it is only the colour.

var SKY_TINT = 0.16; // how strongly the level's colour lights the bottom of the screen
var SKY_PULSE = 0.35; // how much brighter the backdrop flashes on a beat, and twice that on a bar line
var SKY_BEHIND = 0.55; // how much of it the screens between levels show behind their words
var SKY_RESULTS = 0.2; // and the results, less again: they are read, and the backdrop moves on behind them
var SKY_CLEAR = 0.7; // how much more strongly the level's colour lights the screen once its song resolves on a clear

function levelWavelength(n) { // the level's colour, as a wavelength in nm: its act's band (ACTS, story.js), from the
    // band's first end at the act's first level to its other at the act's last
    var a = levelAct(n);
    var t = (n - actFirstLevel(a)) / Math.max(1, LEVELS_PER_ACT - 1);
    return ACTS[a].band[0] + (ACTS[a].band[1] - ACTS[a].band[0]) * Math.max(0, Math.min(1, t));
}

function spectrumRGB(nm) { // a wavelength's colour, near enough (Dan Bruton's approximation): [r, g, b], 0 to 255
    var r = 0, g = 0, b = 0;
    if (nm < 440) {
        r = (440 - nm) / 60;
        b = 1;
    } else if (nm < 490) {
        g = (nm - 440) / 50;
        b = 1;
    } else if (nm < 510) {
        g = 1;
        b = (510 - nm) / 20;
    } else if (nm < 580) {
        r = (nm - 510) / 70;
        g = 1;
    } else if (nm < 645) {
        r = 1;
        g = (645 - nm) / 65;
    } else {
        r = 1;
    }
    var edge = nm < 420 ? 0.3 + 0.7 * (nm - 380) / 40 : nm > 700 ? 0.3 + 0.7 * (780 - nm) / 80 : 1; // the eye's own
    return [r, g, b].map(function (v) { // edges, where it sees less
        return Math.round(255 * Math.pow(Math.max(0, Math.min(1, v * edge)), 0.8));
    });
}

function levelColor(n) { // the level's colour: [r, g, b]
    return spectrumRGB(levelWavelength(n));
}

function skyGround(col, a) { // the ground, COLORS.bg, with the colour mixed into it by a (0 to 1): opaque, so the sky
    // is the ground itself rather than a layer over it, one fill of the screen rather than two
    var bg = [1, 3, 5].map(function (i) { return parseInt(COLORS.bg.substr(i, 2), 16); });
    return "rgb(" + bg.map(function (v, i) { return Math.round(v + (col[i] - v) * a); }).join(",") + ")";
}

function skyRGBA(col, a, lift) { // a colour as a fill style, at alpha a, lifted toward white by `lift` (0 to 1)
    var k = lift || 0;
    return "rgba(" + col.map(function (v) { return Math.round(v + (255 - v) * k); }).join(",") + "," + a + ")";
}

function beatPulse(beat) { // 1 on a beat falling to 0 a third of the way to the next, twice as strong on a bar line
    var kick = Math.max(0, 1 - (beat - Math.floor(beat)) * 3);
    return kick * (Math.floor(beat) % BEATS_PER_BAR == 0 ? 1 : 0.5);
}

function drawSky(n, t, beat, dim, lit) { // the level's backdrop, over the whole screen, so nothing need clear it first:
    // t, seconds, moves it; beat, the beat position, pulses it (null holds it still); dim, if given, how much of it to
    // draw (the screens between levels keep it behind their text); lit, 0 to 1, how far a cleared level's song has
    // resolved, its colour rising the brighter by SKY_CLEAR
    var look = fxLook();
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var col = levelColor(n);
    var still = look != "full";
    var pulse = still || beat === null ? 0 : beatPulse(beat);
    var k = dim === undefined ? 1 : dim;
    var tint = k * SKY_TINT * (1 + SKY_CLEAR * (lit || 0));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    var glow = ctx.createLinearGradient(0, 0, 0, H); // the colour rising from the bottom of the screen
    glow.addColorStop(0, skyGround(col, 0));
    glow.addColorStop(0.55, skyGround(col, tint * 0.25));
    glow.addColorStop(1, skyGround(col, tint * (1 + SKY_PULSE * pulse)));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = k;
    if (look != "off") {
        SKY_STYLES[ACTS[levelAct(n)].sky](W, H, still ? 0 : t, pulse, col, still ? 0 : beat || 0);
    }
    ctx.restore();
}

// The backdrops, one an act: each draws over the level's colour, in it, given the window's size, the time in seconds,
// the beat's pulse (0 to 1), the colour, and the beat position
const SKY_STYLES = {
    embers: function (W, H, t, pulse, col) { // infrared: heat shimmering low down, and sparks rising through it
        var u = Math.min(W, H);
        for (var i = 0; i < 3; i++) { // the shimmer: soft bands, drifting
            var y = H * (0.66 + 0.11 * i) + Math.sin(t * 0.7 + i * 2.1) * H * 0.025;
            var band = ctx.createLinearGradient(0, y - H * 0.05, 0, y + H * 0.05);
            band.addColorStop(0, skyRGBA(col, 0));
            band.addColorStop(0.5, skyRGBA(col, 0.07 + 0.04 * pulse));
            band.addColorStop(1, skyRGBA(col, 0));
            ctx.fillStyle = band;
            ctx.fillRect(0, y - H * 0.05, W, H * 0.1);
        }
        for (var k = 0; k < 56; k++) { // the sparks: each rises at its own speed, swaying, and fades as it climbs
            var rise = (t * (0.035 + 0.06 * fxHash(k, 1)) + fxHash(k, 2)) % 1;
            var sx = W * fxHash(k, 3) + Math.sin(t * (0.6 + fxHash(k, 4)) + k) * u * 0.03;
            var sy = H * (1.02 - rise * 1.08);
            var r = u * (0.002 + 0.004 * fxHash(k, 5));
            ctx.globalAlpha = (0.2 + 0.45 * fxHash(k, 6) + 0.35 * pulse) * (1 - rise);
            ctx.fillStyle = skyRGBA(col, 1, 0.35);
            ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r);
        }
        ctx.globalAlpha = 1;
    },
    grid: function (W, H, t, pulse, col) { // sodium: a sun sinking into a grid that runs out toward you
        var horizon = H * 0.62, u = Math.min(W, H);
        var R = u * 0.2, cx = W / 2, cy = horizon - R * 0.3;
        ctx.save();
        ctx.beginPath(); // the sun, above the horizon only
        ctx.rect(0, 0, W, horizon);
        ctx.clip();
        var sun = ctx.createLinearGradient(0, cy - R, 0, horizon);
        sun.addColorStop(0, skyRGBA(col, 0.5 + 0.12 * pulse, 0.35));
        sun.addColorStop(0.6, skyRGBA(col, 0.3));
        sun.addColorStop(1, skyRGBA(col, 0.05));
        ctx.fillStyle = sun;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = COLORS.bg; // cut by stripes, thicker toward the horizon
        for (var s = 0; s < 6; s++) {
            var sy = cy + R * (0.05 + 0.16 * s) - (t * 6) % (R * 0.16);
            ctx.fillRect(cx - R, sy, 2 * R, 1.5 + s * 1.6);
        }
        ctx.restore();
        ctx.strokeStyle = skyRGBA(col, 0.22 + 0.2 * pulse, 0.2); // the floor: rows coming on, and lines to the sun
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        var rows = 12, phase = (t * 0.45) % 1;
        for (var i = 0; i < rows; i++) {
            var p = (i + phase) / rows;
            var ry = horizon + (H - horizon) * p * p;
            ctx.moveTo(0, ry);
            ctx.lineTo(W, ry);
        }
        for (var j = -12; j <= 12; j++) {
            ctx.moveTo(cx + j * W * 0.012, horizon);
            ctx.lineTo(cx + j * W * 0.16, H);
        }
        ctx.stroke();
        ctx.fillStyle = skyRGBA(col, 0.35, 0.3); // and the horizon itself, lit
        ctx.fillRect(0, horizon - 1, W, 2);
    },
    scope: function (W, H, t, pulse, col) { // phosphor: an oscilloscope's graticule, and traces running across it
        var cols = 10, rows = 6;
        ctx.strokeStyle = skyRGBA(col, 0.09);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var i = 1; i < cols; i++) {
            ctx.moveTo(W * i / cols, 0);
            ctx.lineTo(W * i / cols, H);
        }
        for (var j = 1; j < rows; j++) {
            ctx.moveTo(0, H * j / rows);
            ctx.lineTo(W, H * j / rows);
        }
        ctx.stroke();
        ctx.beginPath(); // the ticks along the middle lines
        for (var k = 0; k <= cols * 5; k++) {
            ctx.moveTo(W * k / (cols * 5), H / 2 - 4);
            ctx.lineTo(W * k / (cols * 5), H / 2 + 4);
        }
        ctx.stroke();
        for (var w = 0; w < 3; w++) { // the traces: a glow, and the line in it
            var mid = H * (0.28 + 0.22 * w), amp = H * (0.05 + 0.03 * w) * (0.7 + 0.6 * pulse);
            ctx.beginPath();
            for (var s = 0; s <= 64; s++) {
                var px = W * s / 64, a = s / 64 * Math.PI * 2 * (1.5 + w) + t * (1.2 + 0.5 * w);
                var py = mid + amp * (Math.sin(a) + 0.3 * Math.sin(3 * a + t));
                if (s == 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.strokeStyle = skyRGBA(col, 0.06);
            ctx.lineWidth = 7;
            ctx.stroke();
            ctx.strokeStyle = skyRGBA(col, 0.26, 0.25);
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    },
    warp: function (W, H, t, pulse, col) { // blueshift: stars streaking out from the middle, rushing past
        var cx = W / 2, cy = H / 2, reach = Math.sqrt(cx * cx + cy * cy);
        var glow = reach * 0.35;
        var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow); // where they come from, filling only what it
        // lights
        core.addColorStop(0, skyRGBA(col, 0.12 + 0.08 * pulse, 0.3));
        core.addColorStop(1, skyRGBA(col, 0));
        ctx.fillStyle = core;
        ctx.fillRect(cx - glow, cy - glow, 2 * glow, 2 * glow);
        ctx.strokeStyle = skyRGBA(col, 1, 0.4);
        for (var k = 0; k < 80; k++) {
            var ang = fxHash(k, 1) * Math.PI * 2;
            var p = (t * (0.12 + 0.3 * fxHash(k, 2)) + fxHash(k, 3)) % 1;
            var r = p * p * reach, len = r * (0.18 + 0.25 * pulse);
            var dx = Math.cos(ang), dy = Math.sin(ang);
            ctx.globalAlpha = 0.5 * p;
            ctx.lineWidth = 1 + 1.5 * p;
            ctx.beginPath();
            ctx.moveTo(cx + dx * (r - len), cy + dy * (r - len));
            ctx.lineTo(cx + dx * r, cy + dy * r);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    },
    aurora: function (W, H, t, pulse, col, beat) { // ultraviolet: curtains of light over the top of the screen, a
        // black-light ring going out from the middle on every beat, and specks glowing in it
        for (var c = 0; c < 3; c++) { // each curtain: a rippling hem, bright, and light fading up from it
            var hem = H * (0.2 + 0.1 * c), rise = H * (0.2 - 0.03 * c);
            var edge = [];
            for (var s = 0; s <= 48; s++) {
                var px = W * s / 48;
                edge.push([px, hem + Math.sin(px * 0.004 + t * 0.5 + c * 1.7) * H * 0.05
                    + Math.sin(px * 0.011 - t * 0.3) * H * 0.02]);
            }
            var up = ctx.createLinearGradient(0, hem - rise - H * 0.07, 0, hem + H * 0.07);
            up.addColorStop(0, skyRGBA(col, 0));
            up.addColorStop(1, skyRGBA(col, 0.16 + 0.06 * pulse, 0.3));
            ctx.fillStyle = up;
            ctx.beginPath();
            edge.forEach(function (p, i) { if (i == 0) { ctx.moveTo(p[0], p[1]); } else { ctx.lineTo(p[0], p[1]); } });
            for (var r = edge.length - 1; r >= 0; r--) {
                ctx.lineTo(edge[r][0], edge[r][1] - rise);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = skyRGBA(col, 0.3 + 0.15 * pulse, 0.45);
            ctx.lineWidth = 2;
            ctx.beginPath();
            edge.forEach(function (p, i) { if (i == 0) { ctx.moveTo(p[0], p[1]); } else { ctx.lineTo(p[0], p[1]); } });
            ctx.stroke();
        }
        var cx = W / 2, cy = H / 2, reach = Math.sqrt(cx * cx + cy * cy);
        var f = beat - Math.floor(beat);
        ctx.strokeStyle = skyRGBA(col, 0.16 * (1 - f), 0.3);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, f * reach, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillStyle = skyRGBA(col, 1, 0.5);
        for (var k = 0; k < 40; k++) {
            var glow = 0.5 + 0.5 * Math.sin(t * (1 + 2 * fxHash(k, 4)) + k);
            ctx.globalAlpha = 0.35 * glow * glow;
            var r = 1 + 1.5 * fxHash(k, 3);
            ctx.fillRect(W * fxHash(k, 1) - r, H * fxHash(k, 2) - r, 2 * r, 2 * r);
        }
        ctx.globalAlpha = 1;
    },
};
