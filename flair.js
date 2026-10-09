// Lazer Wave -- the streak's flair: the look of the combo's layers (LAYERS, music.js). As a streak climbs, the screen
// comes alive a part at a time, at the same steps of the combo's multiplier as the song's layers, and a break takes
// it all away at once, as it does the song's. Glints twinkle in the sky on the off-beats with the sparkle; a haze
// gathers round the trail with the harmony; light falls from the top of the screen with the air; the floor glows,
// dipping on each kick and swelling back, with the sub; light runs out along the beat's stripes on the pulse's
// sixteenths; clouds of the level's colour drift through the sky with the choir; and sparks stream off the head with
// the soar. All of it is under the lasers, soft, and in the level's colour or the waves' own, so nothing in it can be
// taken for a laser; and nothing flashes across the screen: whatever moves fast is small. At reduced effects only the
// glows show, holding still, and at none there is none of it.
//
// Like the effects it reads the game and never writes to it, and its randomness is fxHash. It goes by the combo
// itself, not the song, so it is there with MUSIC off. index.html loads this with a plain <script src>, as globals
// rather than modules, so the game still opens straight off disk.

var FLAIR_IN = 0.25; // s a part takes to come in, from the first beat after its step
var FLAIR_OUT = LAYER_OUT; // s it takes to go when the streak breaks, as the song's layers fall away (music.js)
var FLAIR_GLINTS = 32; // the sparkle's glints, over the top two thirds of the sky: a quarter of them on each off-beat
var FLAIR_GLINT_R = 12; // px: how far a glint's light reaches
var FLAIR_GLINT_FADE = 0.4; // of a beat a glint takes to fade
var FLAIR_GLINT_ALPHA = 0.75;
var FLAIR_AURA_W = 34; // px: the harmony's haze round the trail
var FLAIR_AURA_ALPHA = 0.09;
var FLAIR_TOP_LIGHT = 0.13; // the air's light falling from the top: its alpha at the top edge
var FLAIR_TOP_DEPTH = 0.45; // of the height it reaches down
var FLAIR_TOP_BREATHE = 0.8; // radians a second it swells and eases by
var FLAIR_FLOOR_LIGHT = 0.16; // the sub's glow up from the bottom: its alpha at the bottom edge, at the top of its swell
var FLAIR_FLOOR_DEPTH = 0.35; // of the height it reaches up
var FLAIR_FLOOR_DIP = 0.35; // of it left on the kick, as the sub dips under it
var FLAIR_STRIPE_TOP = 70, FLAIR_STRIPE_W = 4; // the beat's stripes, as drawBeatPulse draws them (drawBanners(70,
                                                // 4), loop.js)
var FLAIR_RUNNER_BEATS = 0.5; // of a beat the pulse's light takes to run from the middle of a stripe out to its end
var FLAIR_RUNNER_LEN = 60; // px
var FLAIR_RUNNER_ALPHA = 1;
var FLAIR_CLOUDS = 3; // the choir's clouds
var FLAIR_CLOUD_ALPHA = 0.09;
var FLAIR_CLOUD_DRIFT = 0.012; // of the width a second, at the most
var FLAIR_SPARK_EVERY = 3; // steps between the soar's sparks, each shed where the head was
var FLAIR_SPARK_LIFE = 60; // steps a spark lives
var FLAIR_SPARK_SPEED = 2; // px a step, at the most, it flies off at, besides drifting back with the trail
var FLAIR_SPARK_ALPHA = 1;
var FLAIR_SPARK_GLOW = 2.5; // how much wider than the spark its glow is, faint round it

var flair = { tier: 0, lit: [] }; // how many parts the streak has brought in, as of the last beat, and how far in each
                                  // part is, 0 to 1, easing toward that

function flairReset() { // a level starts: none in, until its first beat brings in what a streak carried into it has
    flair.tier = 0;
    flair.lit = LAYERS.map(function () { return 0; });
}

function flairBeat() { // a beat went by (onBeat, loop.js): the parts the streak has brought in come in from it, with
    // the song's
    flair.tier = musicLayersWanted();
}

function flairStep() { // each step: a broken streak takes the parts away at once, and each part eases toward in or out
    flair.tier = Math.min(flair.tier, musicLayersWanted());
    var up = STEP_MS / 1000 / FLAIR_IN, down = STEP_MS / 1000 / FLAIR_OUT;
    for (var i = 0; i < LAYERS.length; i++) {
        var v = flair.lit[i] || 0;
        flair.lit[i] = i < flair.tier ? Math.min(1, v + up) : Math.max(0, v - down);
    }
}

function flairLit(name) { // how far in the part that goes with the song's layer `name` is, 0 to 1
    return flair.lit[LAYER_AT[name]] || 0;
}

function drawFlairSky() { // the sky's parts, over the backdrop and under everything else (drawLevel, loop.js)
    var look = fxLook();
    var air = flairLit("air"), sub = flairLit("sub"), choir = flairLit("choir"), sparkle = flairLit("sparkle");
    if (look == "off" || air + sub + choir + sparkle <= 0) {
        return;
    }
    var still = look != "full";
    var W = gameArea.canvas.width, H = gameArea.canvas.height, col = levelColor(level);
    var t = still ? 0 : beatPos * msPerBeat() / 1000, beat = judgePos();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    if (choir > 0) { // clouds of the level's colour, drifting slowly through
        for (var k = 0; k < FLAIR_CLOUDS; k++) {
            var r = Math.min(W, H) * (0.35 + 0.2 * fxHash(k, 14));
            var cx = ((fxHash(k, 11) * W + t * W * FLAIR_CLOUD_DRIFT * (0.5 + 0.5 * fxHash(k, 12))) % (W + 2 * r)) - r;
            var cy = H * (0.2 + 0.6 * fxHash(k, 13)) + Math.sin(t * 0.2 + k * 2.3) * H * 0.05;
            var cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            cloud.addColorStop(0, skyRGBA(col, FLAIR_CLOUD_ALPHA * choir, 0.3));
            cloud.addColorStop(1, skyRGBA(col, 0, 0.3));
            ctx.fillStyle = cloud;
            ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        }
    }
    if (air > 0) { // light falling from the top, swelling and easing
        var breathe = still ? 1 : 0.85 + 0.15 * Math.sin(t * FLAIR_TOP_BREATHE);
        var down = ctx.createLinearGradient(0, 0, 0, H * FLAIR_TOP_DEPTH);
        down.addColorStop(0, skyRGBA(col, FLAIR_TOP_LIGHT * air * breathe, 0.5));
        down.addColorStop(1, skyRGBA(col, 0, 0.5));
        ctx.fillStyle = down;
        ctx.fillRect(0, 0, W, H * FLAIR_TOP_DEPTH);
    }
    if (sub > 0) { // the floor lit, dipping on the kick and swelling back over SUB_SWELL as the sub does (music.js)
        var swell = still ? 1
            : FLAIR_FLOOR_DIP + (1 - FLAIR_FLOOR_DIP) * Math.min(1, (beat - Math.floor(beat)) / SUB_SWELL);
        var up = ctx.createLinearGradient(0, H, 0, H * (1 - FLAIR_FLOOR_DEPTH));
        up.addColorStop(0, skyRGBA(col, FLAIR_FLOOR_LIGHT * sub * swell, 0.5));
        up.addColorStop(1, skyRGBA(col, 0, 0.5));
        ctx.fillStyle = up;
        ctx.fillRect(0, H * (1 - FLAIR_FLOOR_DEPTH), W, H * FLAIR_FLOOR_DEPTH);
    }
    if (sparkle > 0 && !still) { // glints on the off-beat, as the sparkle's bell strikes: a quarter of them each beat,
        // somewhere new each bar
        var b = Math.floor(beat), f = beat - b - 0.5;
        if (f >= 0 && f < FLAIR_GLINT_FADE) {
            var bar = Math.floor(b / BEATS_PER_BAR);
            var a = FLAIR_GLINT_ALPHA * sparkle * Math.pow(1 - f / FLAIR_GLINT_FADE, 2);
            for (var g = 0; g < FLAIR_GLINTS; g++) {
                if ((g + b) % 4 != 0) {
                    continue;
                }
                var gx = W * (0.04 + 0.92 * fxHash(g, 2 * bar + 1)), gy = H * (0.06 + 0.6 * fxHash(g, 2 * bar + 2));
                var glint = ctx.createRadialGradient(gx, gy, 0, gx, gy, FLAIR_GLINT_R);
                glint.addColorStop(0, skyRGBA(col, a, 0.7));
                glint.addColorStop(1, skyRGBA(col, 0, 0.7));
                ctx.fillStyle = glint;
                ctx.fillRect(gx - FLAIR_GLINT_R, gy - FLAIR_GLINT_R, 2 * FLAIR_GLINT_R, 2 * FLAIR_GLINT_R);
            }
        }
    }
    ctx.restore();
}

function drawFlairStripes() { // the pulse: on each of its stabs (PULSE_GATE, music.js) light runs out along the beat's
    // stripes, from the middle to either end, fading as it goes (drawLevel, over drawBeatPulse)
    var pulse = flairLit("pulse");
    if (pulse <= 0 || fxLook() != "full") {
        return;
    }
    var W = gameArea.canvas.width, H = gameArea.canvas.height, beat = judgePos();
    var rows = [FLAIR_STRIPE_TOP, H - (100 - FLAIR_STRIPE_TOP)];
    ctx.save();
    useWindow(); // across the whole window, as the stripes are
    ctx.fillStyle = skyRGBA(levelColor(level), 1, 0.6);
    for (var back = 0; back <= FLAIR_RUNNER_BEATS * 4; back++) { // the sixteenths gone by within FLAIR_RUNNER_BEATS
        var q = Math.floor(beat * 4) - back, age = beat - q / 4;
        if (age < 0 || age >= FLAIR_RUNNER_BEATS || !PULSE_GATE[(q % 4 + 4) % 4]) {
            continue;
        }
        var p = age / FLAIR_RUNNER_BEATS, x = p * W / 2;
        ctx.globalAlpha = FLAIR_RUNNER_ALPHA * pulse * (1 - p);
        rows.forEach(function (y) {
            ctx.fillRect(W / 2 + x - FLAIR_RUNNER_LEN / 2, y, FLAIR_RUNNER_LEN, FLAIR_STRIPE_W);
            ctx.fillRect(W / 2 - x - FLAIR_RUNNER_LEN / 2, y, FLAIR_RUNNER_LEN, FLAIR_STRIPE_W);
        });
    }
    ctx.restore();
}

function drawFlairAura(dim) { // the harmony: a haze round the trail, fading back along it as the waves do (drawPlayer,
    // player.js, under the waves, where the light adds up)
    var a = flairLit("harmony");
    if (a <= 0 || fxLook() == "off") {
        return;
    }
    var n = trail.count, per = Math.ceil(n / TRAIL_CHUNKS);
    ctx.save();
    ctx.lineCap = "butt"; // its pieces meet end to end: round ends would overlap, and the light add up in beads
    ctx.strokeStyle = COLORS.laserCore;
    ctx.lineWidth = FLAIR_AURA_W;
    for (var c = 0; c * per < n - 1; c++) {
        var from = c * per, to = Math.min(n - 1, from + per);
        ctx.globalAlpha = FLAIR_AURA_ALPHA * a * Math.pow(1 - c / TRAIL_CHUNKS, 1.2) * dim;
        ctx.beginPath();
        for (var k = from; k <= to; k++) {
            var p = wavePoint(k, 0);
            if (k == from) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }
        ctx.stroke();
    }
    ctx.restore();
}

function drawFlairSparks(dim) { // the soar: sparks shed off the head every FLAIR_SPARK_EVERY steps, flying off behind
    // it as the trail drifts back, in the waves' colours and white, and fading (drawPlayer, player.js, over the waves)
    var a = flairLit("soar");
    if (a <= 0 || fxLook() != "full") {
        return;
    }
    var tints = [COLORS.cyan, COLORS.magenta, COLORS.laserCore];
    for (var age = 0; age < Math.min(FLAIR_SPARK_LIFE, trail.count); age++) {
        var id = gameArea.frameNo - age; // the step it was shed on
        if (id % FLAIR_SPARK_EVERY != 0) {
            continue;
        }
        var from = wavePoint(age, 0); // where the head was then, drifted back with the trail since
        var vx = -FLAIR_SPARK_SPEED * (0.3 + 0.7 * fxHash(id, 1)), vy = FLAIR_SPARK_SPEED * 1.6 * (fxHash(id, 2) - 0.5);
        var life = 1 - age / FLAIR_SPARK_LIFE, r = 1.5 + 2 * fxHash(id, 3);
        var sx = from.x + vx * age, sy = from.y + vy * age;
        var alpha = FLAIR_SPARK_ALPHA * a * dim * Math.pow(life, 1.5);
        ctx.fillStyle = tints[Math.floor(fxHash(id, 4) * tints.length)];
        ctx.globalAlpha = alpha * 0.25; // its glow
        ctx.beginPath();
        ctx.arc(sx, sy, r * FLAIR_SPARK_GLOW, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
    }
}
