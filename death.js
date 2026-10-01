// Lazer Wave -- the death animation. When the last shield goes, the level stops where it stands and its picture is
// worked over for DEATH_MS before the results come up, in three movements that overlap: the prism split, a flash of
// the laser's red and a ring of it bursting from the hit, then the core dividing into a cyan copy and a magenta one
// that fly apart along the laser; burn-through, the laser that took the shield whitening and bleeding its glow while
// the picture dims and the core blinks red; and decoherence, the core flashing white as it splits, the waves losing
// phase and fading, their trail scattering as particles. Then it fades to dark for the results. It runs by the frame,
// as the story screens do (story.js), and plays out whatever is pressed: input.js swallows every press while it runs;
// with the effects reduced or off (fx.js) it is skipped, and the results come straight up. index.html loads this with a
// plain <script src>, as globals rather than modules, so the game still opens straight off disk.

var DEATH_MS = 1300; // how long it runs
var DEATH_BURN = 0.3; // of that, the burn-through, from the start
var DEATH_DECO = [0.15, 0.55]; // the decoherence, from when to when
var DEATH_FLASH = 0.08; // the flash of red at the hit
var DEATH_RING = [0, 0.55]; // the ring bursting from it
var DEATH_SPLIT = [0.2, 0.75]; // the core's two copies flying apart
var DEATH_FADE = [0.75, 1]; // and the fade to dark at the end
var DEATH_PARTICLES = 70; // what the trail scatters as
var DEATH_BLINK_HZ = 7; // the core's red blink through the burn, until it splits
var DEATH_SPLIT_PX = 170; // how far each copy flies

var deathAnim = null; // while it runs: { at, frameAt, frame, n, base, killers, head, parts, then }

function deathAnimUp() {
    return deathAnim !== null;
}

function deathPicture() { // as the level stops, before its lasers are cleared away: the hit as it stands, without the
    // piece (its waves are drawn live, to unravel) and without the CRT (drawn live over every frame); the lasers on
    // the piece; its head; and the particles its trail will scatter as. Null with the effects reduced or off: there is
    // no animation to take it for
    if (fxLook() != "full") {
        return null;
    }
    drawLevel(true);
    var head = { x: gamePiece.x + gamePiece.width / 2, y: gamePiece.y + gamePiece.height / 2 };
    var parts = [];
    for (var i = 0; i < DEATH_PARTICLES; i++) { // seeded along the trail, from its head back
        var age = Math.floor(fxHash(i, 1) * Math.max(0, Math.min(trail.count, TRAIL_STEPS) - 1));
        var s = trail.count > 0 ? trailSample(age) : head;
        var a = fxHash(i, 2) * Math.PI * 2, v = 40 + 120 * fxHash(i, 3);
        parts.push({ x: s.x - age * TRAIL_DRIFT, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            color: i % 2 ? COLORS.cyan : COLORS.magenta });
    }
    var killers = hazards.filter(function (h) { return h.hits ? h.hits(gamePiece) : gamePiece.crashWith(h); });
    var along = killers.length && killers[0].width > 0 && killers[0].height > killers[0].width ? { x: 0, y: 1 }
        : { x: 1, y: 0 }; // the way the copies fly: along a laser that is a box (across the screen, unless it stands
                          // up), or across for any other shape
    return { base: copyCanvas(), head: head, parts: parts, killers: killers, along: along };
}

function startDeathAnim(picture, then) { // the level has stopped: run it over the picture, and call `then` at the end
    var now = performance.now();
    deathAnim = { at: now, frameAt: now, frame: 0, n: 0, base: picture.base, killers: picture.killers,
        head: picture.head, parts: picture.parts, along: picture.along, then: then };
    deathAnim.frame = requestAnimationFrame(deathFrame);
}

function deathFrame(now) {
    var d = deathAnim;
    if (!d) {
        return;
    }
    var t = (now - d.at) / DEATH_MS;
    if (t >= 1) {
        endDeathAnim();
        return;
    }
    fxStep(Math.min(MAX_CATCH_UP_MS, now - d.frameAt) / STEP_MS); // the CRT's bar rolls on, by the time gone
    d.frameAt = now;
    d.n++;
    drawDeath(t, d);
    d.frame = requestAnimationFrame(deathFrame);
}

function endDeathAnim() { // over: what comes after it comes on
    var d = deathAnim;
    cancelAnimationFrame(d.frame);
    deathAnim = null;
    d.then();
}

function deathPhase(t, from, to) { // 0..1 through a movement that runs from `from` to `to` of the whole
    return Math.max(0, Math.min(1, (t - from) / (to - from)));
}

function deathDot(at, r, color, alpha, width) { // a disc at a point, or given a width a ring
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    if (width) {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.stroke();
    } else {
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawDeath(t, d) { // one frame, t of the way through
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    var burn = deathPhase(t, 0, DEATH_BURN), deco = deathPhase(t, DEATH_DECO[0], DEATH_DECO[1]);
    var ring = deathPhase(t, DEATH_RING[0], DEATH_RING[1]), split = deathPhase(t, DEATH_SPLIT[0], DEATH_SPLIT[1]);
    var fade = deathPhase(t, DEATH_FADE[0], DEATH_FADE[1]);
    useWindow();
    ctx.globalAlpha = 1;
    ctx.drawImage(d.base, 0, 0, W, H);
    ctx.globalAlpha = 0.65 * burn; // the picture dims through the burn, and stays dim
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    if (t < DEATH_FLASH) { // the flash of the laser's red, at the hit
        ctx.globalAlpha = 0.55 * (1 - t / DEATH_FLASH);
        ctx.fillStyle = COLORS.laser;
        ctx.fillRect(0, 0, W, H);
    }
    d.killers.forEach(function (k) { // burn-through: the laser that did it, whitening and bleeding its glow. One that
        // is a box gets it drawn over the box; any other shape is drawn again, adding its light to itself
        if (k.width > 0 && k.height > 0) {
            var g = 24 * burn;
            ctx.globalAlpha = 0.35 * burn;
            ctx.fillStyle = COLORS.laserCore;
            ctx.fillRect(k.x - g, k.y - g, k.width + 2 * g, k.height + 2 * g);
            ctx.globalAlpha = 0.4 + 0.6 * burn;
            ctx.shadowColor = COLORS.laserCore;
            ctx.shadowBlur = 40 * burn;
            ctx.fillRect(k.x, k.y, k.width, k.height);
            ctx.shadowBlur = 0;
        } else if (burn > 0) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            k.update();
            ctx.restore();
        }
    });
    ctx.globalAlpha = 1;
    if (deco < 1) { // the waves, live: as they were, then losing phase and fading
        drawPlayerDying(deco, d.n);
    }
    if (ring > 0 && ring < 1) { // the ring bursting from the hit, in the laser's red, thinning as it goes
        deathDot(d.head, 20 + 0.4 * W * ring, COLORS.laser, 1 - ring, 6 * (1 - ring) + 1);
    }
    if (split <= 0) { // the core, as it was, blinking red through the burn
        deathDot(d.head, CORE_R, COLORS.laserCore, 1);
        if (Math.floor(t * DEATH_MS / 1000 * DEATH_BLINK_HZ) % 2 == 0) {
            deathDot(d.head, 11, COLORS.warn, 1, 3);
        }
    } else { // then the prism split: a cyan copy and a magenta copy flying apart along the laser, fading, with the
        // white flash of the parting behind them
        if (split < 0.3) {
            deathDot(d.head, CORE_R * 3 + 40 * split / 0.3, COLORS.laserCore, 1 - split / 0.3);
        }
        var far = DEATH_SPLIT_PX * Math.pow(split, 0.8), alpha = 1 - split * 0.8;
        ctx.shadowBlur = 16;
        ctx.shadowColor = COLORS.cyan;
        deathDot({ x: d.head.x - d.along.x * far, y: d.head.y - d.along.y * far }, 9, COLORS.cyan, alpha);
        ctx.shadowColor = COLORS.magenta;
        deathDot({ x: d.head.x + d.along.x * far, y: d.head.y + d.along.y * far }, 9, COLORS.magenta, alpha);
        ctx.shadowBlur = 0;
    }
    if (deco > 0) { // the trail scattering
        d.parts.forEach(function (p) {
            ctx.globalAlpha = (1 - deco) * 0.9;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x + p.vx * deco - 1.5, p.y + p.vy * deco - 1.5, 3, 3);
        });
        ctx.globalAlpha = 1;
    }
    if (fade > 0) { // to dark, for the results
        ctx.globalAlpha = fade;
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
    }
    fxDrawScreen(fxLook()); // the CRT over it, as over a level's frame
}
