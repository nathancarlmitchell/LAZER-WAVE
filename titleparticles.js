// Lazer Wave -- the particles behind the start screen and its menu screens. Neon dust drifting up through the dark,
// big soft lights far behind it, a shooting star now and then, and sparks struck off the title's letters where the
// laser sweeping behind them (titlelight.js) crosses their edges, with the dust near the laser catching its light.
// They are drawn on a canvas of their own laid over the game's and screen-blended, as the laser is, so they only ever
// add light and the start screen under them is drawn as it always was; and they cut out of that canvas everything the
// start screen puts in front of its ground (the title, the lines of text, the buttons' frames and labels and the
// stripes), read off the game's canvas, so they pass behind all of it and show through the buttons' insides. On the
// menu screens over it (the difficulty screen, the level select, the options, the help, the timing test) they go on
// rising, behind whatever those drew, the same way. index.html loads this with a plain <script src>, as globals rather
// than modules, so the game still opens straight off disk. Nothing here runs at load.
//
// Like the other effects they read the game and never write to it: the start screen's state (gameStart, menuUp), the
// effects setting (fxLook: they move at "full", hold still at "reduced" and are gone at "off"), the layout, the game's
// canvas for what stands in front of them (with the boxes of the buttons washed in colour: geom, levelTile), the
// title as drawTitle draws it for the sparks' edges, and the laser (titleSweepAt). drawStartScreen and the menu screens
// call titleParticles each time they draw; they stop themselves when a level starts. Their randomness is fxHash, never
// Math.random, as every effect's is: the same dust on every load.

var PARTICLE_PIXELS = 1500000; // the most pixels the layer has: a bigger window gets it drawn smaller and stretched
var PARTICLE_FADE = 0.6; // seconds they take to come up with the start screen
var PARTICLE_STEP = 0.1; // the longest step they take, in seconds: a frame that comes late (a tab away) is no leap
var PARTICLE_GROUND = 30; // how far, summed over red, green and blue, a pixel has to be from the ground to stand in front
var DUST_COUNT = 110; // motes over a window the layout just fills; a window with room round it gets more, up to DUST_MAX
var DUST_MAX = 220;
var DUST_RISE = [5, 28]; // layout px a second the farthest and the nearest rise
var DUST_SIZE = [5, 16]; // and how wide their glow is, layout px
var DUST_LIT = 55; // how near the laser's line a mote catches its light (a sigma, layout px), and how far past the
var DUST_LIT_BAND = 150; // band the line runs down it still does
var GLOW_COUNT = 6; // the big soft lights far behind the dust
var GLOW_SIZE = [160, 340]; // layout px across
var GLOW_DRIFT = 8; // layout px a second, at most
var SPARK_RATE = 70; // sparks a second off the letters' edges, with the laser at full glow
var SPARK_MAX = 260;
var SPARK_SPEED = [110, 440]; // layout px a second
var SPARK_FALL = 560; // their gravity, layout px a second a second
var SPARK_DRAG = 1.3; // how fast the air slows them, a second
var SPARK_LIFE = [0.4, 1.2]; // seconds
var STAR_EVERY = [2.5, 6.5]; // seconds between shooting stars
var STAR_SPEED = [900, 1300]; // layout px a second
var STAR_LIFE = [0.55, 0.95]; // seconds
var STAR_TAIL = 0.16; // seconds of its flight its tail shows

var tp = { canvas: null, ctx: null, mask: null, frame: null, last: 0, t: 0, fade: 1, moving: false, dirty: true,
    size: "", r: 1, n: 0, dust: [], glows: [], sparks: [], stars: [], sparkDue: 0, starDue: 0, sprites: {},
    edges: null }; // the canvas, what it cuts out and the loop; the particles, and their own random stream

function titleParticles() { // the start screen was drawn: what the particles pass behind is drawn again, and they are
    // set going if they aren't already. They stop themselves when it goes
    tp.dirty = true;
    if (tp.frame !== null || !titleParticlesWanted()) {
        return;
    }
    titleParticlesSetup();
    tp.last = 0;
    tp.fade = fxLook() == "full" ? 0 : 1; // coming up with the laser, or there at once when nothing is to move
    tp.frame = requestAnimationFrame(titleParticlesFrame);
}

function titleParticlesWanted() { // the start screen, or a menu screen over it (not a level, nor the help over a
    // paused one, nor the practice screen, whose preview moves enough), with any effects at all
    return !gameStart && fxLook() != "off" && menuScreen != "practice";
}

function titleParticlesFrame(now) {
    tp.frame = null;
    if (!titleParticlesWanted()) {
        titleParticlesHide();
        return;
    }
    var moving = fxLook() == "full"; // reduced: held still, and drawn again only when what is in front of them is
    var dt = tp.last ? Math.min(PARTICLE_STEP, (now - tp.last) / 1000) : 0;
    tp.last = now;
    var resized = titleParticlesSync();
    if (!gameArea.canvas.width || !gameArea.canvas.height) { // a game canvas with no size (a frame hidden in a closed tab,
        // say) has nothing to read what stands in front from: wait until it has one
        tp.frame = requestAnimationFrame(titleParticlesFrame);
        return;
    }
    if (moving || resized || tp.dirty || moving != tp.moving) {
        if (moving) {
            titleParticlesStep(dt, now);
        } else { // nothing in flight in a still picture
            tp.sparks = [];
            tp.stars = [];
            tp.fade = 1;
        }
        tp.moving = moving;
        titleParticlesDraw(now);
        if (tp.canvas.style.display == "none") { // shown only once it has something on it
            tp.canvas.style.display = "block";
        }
    }
    tp.frame = requestAnimationFrame(titleParticlesFrame);
}

function titleParticlesHide() { // the start screen went: whatever was in flight goes with it
    tp.sparks = [];
    tp.stars = [];
    tp.sparkDue = 0;
    if (tp.canvas) {
        tp.canvas.style.display = "none";
    }
}

function titleParticlesSetup() { // the canvas and the field of dust and lights, made the first time
    if (tp.canvas) {
        return;
    }
    var c = document.createElement("canvas");
    // over the game's canvas, as the laser's is, sized and turned as the game's is (titleParticlesSync), adding its
    // light to what is under it and letting every click and touch through to it
    c.style.cssText = "position: fixed; left: 0; top: 0; pointer-events: none; mix-blend-mode: screen; z-index: 1;"
        + " display: none;";
    c.setAttribute("aria-hidden", "true");
    gameArea.canvas.parentNode.insertBefore(c, gameArea.canvas.nextSibling);
    tp.canvas = c;
    tp.ctx = c.getContext("2d");
    tp.mask = document.createElement("canvas");
    for (var i = 0; i < DUST_MAX; i++) {
        tp.dust.push(newMote(particleRand()));
    }
    for (var j = 0; j < GLOW_COUNT; j++) {
        tp.glows.push(newGlow());
    }
    tp.starDue = particleLerp(STAR_EVERY, particleRand()) / 2; // the first comes sooner
}

function particleRand() { // the next of their own random numbers, 0..1
    tp.n++;
    return fxHash(tp.n, 7919);
}

function particleLerp(range, t) { // from range[0] at 0 to range[1] at 1
    return range[0] + (range[1] - range[0]) * t;
}

function newMote(v) { // a mote of dust at height v of the window (0 its top, 1 its foot), anywhere across it. Its
    // depth z decides the rest: most are far, small, faint and slow
    var z = particleRand();
    var pick = particleRand();
    return { u: particleRand(), v: v, z: z * z, sway: 4 + 14 * particleRand(), swayRate: 0.2 + 0.6 * particleRand(),
        phase: 6.283 * particleRand(), twinkle: 0.6 + 2 * particleRand(),
        color: pick < 0.45 ? COLORS.cyan : pick < 0.8 ? COLORS.magenta : COLORS.text };
}

function newGlow() { // a light far behind, out of focus, drifting its own way
    var a = 6.283 * particleRand(), speed = GLOW_DRIFT * (0.4 + 0.6 * particleRand());
    return { u: particleRand(), v: particleRand(), du: Math.cos(a) * speed, dv: Math.sin(a) * speed,
        size: particleLerp(GLOW_SIZE, particleRand()), alpha: 0.035 + 0.045 * particleRand(),
        color: particleRand() < 0.55 ? COLORS.magenta : COLORS.cyan, phase: 6.283 * particleRand() };
}

function newSpark(x, edge) { // a spark struck off a letter's edge where the laser crosses it at x: up and away off the
    // top of a stroke, down off its foot, most of them slow and a few flying
    var spread = (particleRand() - 0.5) * 2.4; // radians either side
    var a = edge.up ? -Math.PI / 2 + spread : Math.PI / 2 + spread;
    var v = particleLerp(SPARK_SPEED, particleRand() * particleRand());
    return { x: x + (particleRand() - 0.5) * 3, y: edge.y + (edge.up ? -1 : 1), vx: Math.cos(a) * v,
        vy: Math.sin(a) * v, age: 0, life: particleLerp(SPARK_LIFE, particleRand()), width: 1.5 + 1.3 * particleRand() };
}

function newStar(W, H, k) { // a shooting star high up the window, flying one way or the other and falling a little;
    // in window px, as it is gone before a resize could matter
    var right = particleRand() < 0.5;
    var a = 0.15 + 0.35 * particleRand(); // radians below level
    var v = particleLerp(STAR_SPEED, particleRand()) * k;
    return { x: W * (right ? 0.05 + 0.5 * particleRand() : 0.45 + 0.5 * particleRand()),
        y: H * (0.04 + 0.4 * particleRand()), vx: (right ? 1 : -1) * Math.cos(a) * v, vy: Math.sin(a) * v, age: 0,
        life: particleLerp(STAR_LIFE, particleRand()), color: particleRand() < 0.5 ? COLORS.cyan : COLORS.magenta };
}

function dustCount(W, H, k) { // motes for this window: DUST_COUNT over the layout's own area, more for the room round it
    return Math.min(DUST_MAX, Math.round(DUST_COUNT * (W / k) * (H / k) / (LAYOUT_W * LAYOUT_H)));
}

function titleEdges() { // down each layout column of the title, where its silhouette starts and stops: where the laser
    // crossing behind it strikes sparks. Worked out once, from the title as drawTitle draws it
    if (tp.edges) {
        return tp.edges;
    }
    var c = document.createElement("canvas").getContext("2d");
    c.font = TITLE_FONT;
    var left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    TITLE_LINES.forEach(function (l) {
        var m = c.measureText(l.text);
        left = Math.min(left, l.x - TITLE_DEPTH);
        right = Math.max(right, l.x + m.width);
        top = Math.min(top, l.y - m.actualBoundingBoxAscent - TITLE_DEPTH);
        bottom = Math.max(bottom, l.y + m.actualBoundingBoxDescent);
    });
    left = Math.floor(left) - 2;
    top = Math.floor(top) - 2;
    var w = Math.ceil(right) + 2 - left, h = Math.ceil(bottom) + 2 - top;
    c.canvas.width = w; // which clears it, and its state
    c.canvas.height = h;
    c.translate(-left, -top);
    drawTitle(COLORS.text, TITLE_DEPTH, c);
    var px = c.getImageData(0, 0, w, h).data;
    var cols = [];
    for (var i = 0; i < w; i++) {
        var list = [], was = false;
        for (var j = 0; j < h; j++) {
            var on = px[(j * w + i) * 4 + 3] > 127;
            if (on != was) { // into a stroke from above (its top: sparks fly up), or out of its foot (they fall)
                list.push({ y: top + j - (on ? 0 : 1), up: on });
            }
            was = on;
        }
        cols.push(list);
    }
    tp.edges = { left: left, cols: cols };
    return tp.edges;
}

function titleParticlesSync() { // follow the game's canvas, as the laser does: its size, and its turn on a phone held
    // upright. True when the size changed, which draws what is in front again too
    var game = gameArea.canvas, c = tp.canvas;
    if (c.style.transform != game.style.transform) {
        c.style.transform = game.style.transform;
    }
    if (c.style.transformOrigin != game.style.transformOrigin) {
        c.style.transformOrigin = game.style.transformOrigin;
    }
    var W = game.width, H = game.height, size = W + "x" + H;
    if (size == tp.size) {
        return false;
    }
    tp.size = size;
    tp.r = Math.min(1, Math.sqrt(PARTICLE_PIXELS / Math.max(1, W * H)));
    c.width = tp.mask.width = Math.max(1, Math.floor(W * tp.r));
    c.height = tp.mask.height = Math.max(1, Math.floor(H * tp.r));
    c.style.width = W + "px"; // stretched back to the game's size
    c.style.height = H + "px";
    tp.dirty = true;
    return true;
}

function titleParticlesMask() { // what stands in front of the particles, solid: everything the screen that is up drew over
    // its ground, read off the game's canvas as any pixel that isn't the ground (nor, on the start screen, START's wash of
    // cyan: the dust shows through it, as through every button's inside, their frames and labels standing in front), and
    // the stripes
    var m = tp.mask, c = m.getContext("2d"), r = tp.r, W = gameArea.canvas.width, H = gameArea.canvas.height;
    c.setTransform(r, 0, 0, r, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, W, H);
    c.drawImage(gameArea.canvas, 0, 0, W, H);
    var bg = particleRGB(COLORS.bg), washes = particleWashes(bg, r);
    var img = c.getImageData(0, 0, m.width, m.height), d = img.data, mw = m.width;
    var near = function (i, ground) {
        return Math.abs(d[i] - ground[0]) + Math.abs(d[i + 1] - ground[1]) + Math.abs(d[i + 2] - ground[2]) <= PARTICLE_GROUND;
    };
    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
        var ground = near(i, bg);
        for (var w = 0; w < washes.length && !ground; w++) { // or a button's wash of colour, inside its box
            var px = p % mw, py = (p - px) / mw, b = washes[w];
            ground = px >= b.x0 && px < b.x1 && py >= b.y0 && py < b.y1 && near(i, b.rgb);
        }
        d[i + 3] = ground ? 0 : 255;
    }
    c.putImageData(img, 0, 0);
    // window px: the stripes drawScreenBanners lays across the top and the foot, the cyan one 30 thick and 34 in from
    // the top edge and 66 up from the bottom one (bannerScale shrinks all three), the magenta inside it
    var k = bannerScale();
    c.fillStyle = COLORS.text;
    c.fillRect(0, 34 * k, W, 30 * k);
    c.fillRect(0, H - 66 * k, W, 30 * k);
    tp.dirty = false;
}

function particleWashes(bg, r) { // the buttons whose insides are a wash of colour over the ground rather than the ground
    // itself, which the dust shows through all the same: START's cyan on the start screen (drawStartScreen), and the
    // open levels' tiles on the level select, each in its level's colour (drawLevelTile); as boxes in the mask's
    // pixels, each with the colour its wash comes to
    var f = screenFrame(), out = [];
    var box = function (g, col, a) {
        out.push({ x0: (f.x + f.scale * (LAYOUT_W / 2 + g.dx)) * r, x1: (f.x + f.scale * (LAYOUT_W / 2 + g.dx + g.w)) * r,
            y0: (f.y + f.scale * (LAYOUT_H / 2 + g.dy)) * r, y1: (f.y + f.scale * (LAYOUT_H / 2 + g.dy + g.h)) * r,
            rgb: [0, 1, 2].map(function (k) { return bg[k] + a * (col[k] - bg[k]); }) });
    };
    if (!menuUp()) {
        box(geom("start"), particleRGB(COLORS.cyan), 0.2);
    } else if (difficultyScreen()) { // the difficulty chosen last, washed in cyan (drawDifficultyScreen)
        box(DIFFICULTY_BUTTONS["diff_" + difficulty], particleRGB(COLORS.cyan), 0.12);
    } else if (menuScreen == "levels") {
        for (var n = 1; n <= RUN_LEVELS; n++) {
            if (levelUnlocked(n)) {
                box(levelTile(n), levelColor(n), 0.14);
            }
        }
    }
    return out;
}

function particleRGB(hex) { // "#ff2a6d" as [r, g, b]
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
}

function titleParticlesStep(dt, now) { // move everything on by dt seconds, and strike what is due
    var W = gameArea.canvas.width, H = gameArea.canvas.height, k = layoutFrame().scale;
    tp.t += dt;
    tp.fade = Math.min(1, tp.fade + dt / PARTICLE_FADE);
    for (var i = 0; i < tp.dust.length; i++) {
        var m = tp.dust[i];
        m.v -= particleLerp(DUST_RISE, m.z) * k * dt / H;
        if (m.v < -0.03) { // gone off the top: another comes up from under the foot
            tp.dust[i] = newMote(1.03);
        }
    }
    tp.glows.forEach(function (g) { // drifting, and round again from the far side once wholly off one
        g.u += g.du * k * dt / W;
        g.v += g.dv * k * dt / H;
        g.u = g.u < -0.2 ? g.u + 1.4 : g.u > 1.2 ? g.u - 1.4 : g.u;
        g.v = g.v < -0.2 ? g.v + 1.4 : g.v > 1.2 ? g.v - 1.4 : g.v;
    });
    var drag = Math.exp(-SPARK_DRAG * dt);
    tp.sparks = tp.sparks.filter(function (s) {
        s.age += dt;
        s.vx *= drag;
        s.vy = s.vy * drag + SPARK_FALL * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        return s.age < s.life;
    });
    var sweep = titleSweepAt(now), edges = titleEdges();
    var col = sweep ? edges.cols[Math.round(sweep.x) - edges.left] : null;
    if (col && col.length) { // the laser is behind a letter: sparks off every edge it crosses, a few at a time
        tp.sparkDue = Math.min(4, tp.sparkDue + SPARK_RATE * sweep.glow * dt);
        while (tp.sparkDue >= 1 && tp.sparks.length < SPARK_MAX) {
            tp.sparkDue -= 1;
            tp.sparks.push(newSpark(sweep.x, col[Math.floor(particleRand() * col.length)]));
        }
    } else {
        tp.sparkDue = 0;
    }
    tp.stars = tp.stars.filter(function (s) {
        s.age += dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        return s.age < s.life;
    });
    tp.starDue -= dt;
    if (tp.starDue <= 0) {
        tp.starDue = particleLerp(STAR_EVERY, particleRand());
        tp.stars.push(newStar(W, H, k));
    }
}

function titleParticlesDraw(now) { // one frame: the far lights, the dust, the stars and the sparks, all adding up, and
    // then everything in front of them cut out
    if (tp.dirty) {
        titleParticlesMask();
    }
    var c = tp.ctx, W = gameArea.canvas.width, H = gameArea.canvas.height, f = layoutFrame(), k = f.scale, r = tp.r;
    var t = tp.t, fade = tp.fade;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.clearRect(0, 0, tp.canvas.width, tp.canvas.height);
    c.globalCompositeOperation = "lighter"; // light adds up
    c.setTransform(r, 0, 0, r, 0, 0); // window px
    tp.glows.forEach(function (g) {
        particleSprite(c, g.color, "soft", g.u * W, g.v * H, g.size * k,
            g.alpha * (1 + 0.25 * Math.sin(t * 0.35 + g.phase)) * fade);
    });
    var sweep = tp.moving ? titleSweepAt(now) : null; // the laser, for the dust it lights
    var n = dustCount(W, H, k);
    for (var i = 0; i < n; i++) {
        var m = tp.dust[i];
        var x = m.u * W + m.sway * k * Math.sin(t * m.swayRate + m.phase), y = m.v * H;
        var size = particleLerp(DUST_SIZE, m.z) * k;
        var a = (0.22 + 0.55 * m.z) * (0.65 + 0.35 * Math.sin(t * m.twinkle + m.phase * 3)) * fade;
        var lit = sweep ? dustLit(sweep, (x - f.x) / k, (y - f.y) / k) * fade : 0;
        particleSprite(c, m.color, "dot", x, y, size * (1 + lit), a + lit * 0.8);
        if (lit > 0.02) { // caught in the beam: a glint of its hot pink-white
            particleSprite(c, COLORS.laserCore, "dot", x, y, size * 1.2, lit);
        }
    }
    tp.stars.forEach(function (s) {
        var a = Math.min(1, s.age / 0.08, (s.life - s.age) / (s.life * 0.45)) * fade;
        var tail = Math.min(s.age, STAR_TAIL);
        var tx = s.x - s.vx * tail, ty = s.y - s.vy * tail;
        var g = c.createLinearGradient(tx, ty, s.x, s.y);
        g.addColorStop(0, particleRGBA(s.color, 0));
        g.addColorStop(1, particleRGBA(s.color, 1));
        c.strokeStyle = g;
        c.lineCap = "round";
        c.globalAlpha = a * 0.35; // its glow, then its line
        c.lineWidth = 6 * k;
        particleLine(c, tx, ty, s.x, s.y);
        c.globalAlpha = a;
        c.lineWidth = 2 * k;
        particleLine(c, tx, ty, s.x, s.y);
        particleSprite(c, COLORS.text, "dot", s.x, s.y, 18 * k, a);
    });
    c.setTransform(k * r, 0, 0, k * r, f.x * r, f.y * r); // layout px, where the title is
    c.lineCap = "round";
    tp.sparks.forEach(function (s) { // a streak along its flight, white-hot, then the laser's pink, then magenta
        var age = s.age / s.life, a = Math.pow(1 - age, 1.3) * fade;
        c.globalAlpha = a;
        c.strokeStyle = age < 0.35 ? COLORS.laserCore : age < 0.7 ? COLORS.laser : COLORS.magenta;
        c.lineWidth = s.width;
        particleLine(c, s.x, s.y, s.x - s.vx * 0.045, s.y - s.vy * 0.045);
        if (age < 0.5) { // and glowing while it is young
            particleSprite(c, COLORS.laser, "dot", s.x, s.y, 14, a * 0.7);
        }
    });
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "destination-out";
    c.drawImage(tp.mask, 0, 0);
    c.globalCompositeOperation = "source-over";
}

function dustLit(sweep, lx, ly) { // how much of the laser's light a mote at layout (lx, ly) catches, 0 to 1: most on
    // its line, down the title's band it runs down, and fading past it
    var dx = (lx - sweep.x) / DUST_LIT;
    var off = Math.max(0, sweep.top - 40 - ly, ly - sweep.bottom - 40) / DUST_LIT_BAND;
    return sweep.glow * Math.exp(-0.5 * dx * dx) * Math.max(0, 1 - off);
}

function particleLine(c, x0, y0, x1, y1) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
}

function particleSprite(c, color, kind, x, y, size, alpha) { // one glow, size across, centred on x, y
    if (alpha <= 0.004) {
        return;
    }
    c.globalAlpha = Math.min(1, alpha);
    c.drawImage(particleImage(color, kind), x - size / 2, y - size / 2, size, size);
}

function particleImage(color, kind) { // a glow of the colour, drawn once: a mote's ("dot"), white-hot at its heart, or
    // a far light's ("soft"), soft all the way to its edge
    var key = kind + color;
    if (!tp.sprites[key]) {
        var s = document.createElement("canvas");
        s.width = s.height = 64;
        var c = s.getContext("2d"), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        if (kind == "dot") {
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(0.12, particleRGBA(color, 1));
            g.addColorStop(0.35, particleRGBA(color, 0.3));
            g.addColorStop(1, particleRGBA(color, 0));
        } else {
            g.addColorStop(0, particleRGBA(color, 1));
            g.addColorStop(0.5, particleRGBA(color, 0.7));
            g.addColorStop(1, particleRGBA(color, 0));
        }
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
        tp.sprites[key] = s;
    }
    return tp.sprites[key];
}

function particleRGBA(hex, a) { // "#ff2a6d" at alpha a, as a canvas colour
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
}
