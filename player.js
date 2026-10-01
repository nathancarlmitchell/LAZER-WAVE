// Lazer Wave -- the player. Two sine waves, cyan and magenta, drawn off the piece's recent positions and drifting
// away behind it like a trace across an oscilloscope, so moving leaves a glowing trail. The gap between them is the
// beat: it opens after each beat and closes as the next one comes, and on the beat the two meet in one line -- that
// is when to hit. The hitbox is the small core where they meet. The waves are also the two keys: while a coloured
// beat is coming, the wave of its colour stays lit and the other dims, so the top wave says Z and the bottom X. In
// overdrive, and in laser form, the piece is a laser: a white beam runs down the middle of the trail, back to where it
// became one, and the waves snap in tight round it -- still opening and meeting on the beat, just small -- so the
// trail pinches into one beam there. In laser form it also fires its beam ahead, across the screen at the targets.
// index.html loads this with a plain <script src>, as globals rather than modules, so the game still opens straight
// off disk.
//
// Like the effects, this only draws: it reads the piece and the beat as the player plays it (judgePos, loop.js), and
// nothing here changes what the game does.
// The history is recorded every step (playerRecord) so the trail is the same whether a step was painted or not.

var TRAIL_STEPS = 120; // steps of position history the trail is drawn from (1.2s)
var TRAIL_DRIFT = 3; // px a step the trail drifts left: the waves travel away behind the piece even when it holds still
var WAVE_GAP = 6; // px from the centre line to each wave at the widest point of a beat, with no combo...
var WAVE_GAP_MAX = 24; // ...growing with every hit in a row up to this, at the combo that maxes the multiplier
var WAVE_GROW = 0.08; // of the way to the size the combo calls for, a step: it swells and shrinks, never jumps
var WAVE_DRIVE = 5; // px: the waves' size while the piece is a laser, pulled in round the beam
var WAVE_PULL = 0.2; // of the way there a step as they pull in: a snap, where the swell back out is slow
var WAVE_RIPPLE = 0; // px the waves wiggle by, both together, so they are sine waves and not just two lines
var WAVE_CYCLES = 2; // wiggles per beat
var TRAIL_CHUNKS = 10; // the trail is stroked in this many pieces, each fainter than the one in front
var CORE_R = 4; // px: the glowing core at the head, which is the hitbox
var DRIVE_RING_R = 14; // px: the ring round the head that says overdrive is ready, and once it runs, how much is left
var DRIVE_RING_W = 2.5; // px: its line
var FLASH_STEPS = 18; // how long a good hit lights the head up
var WAVE_UNLIT = 0.3; // how bright the wave of the other colour stays while a coloured beat is coming

var trail = { samples: [], next: 0, count: 0 }; // a ring of reused { x, y, beat, gap, laser } records
while (trail.samples.length < TRAIL_STEPS) {
    trail.samples.push({ x: 0, y: 0, beat: 0, gap: 0, laser: false });
}
var playerFlash = { age: FLASH_STEPS, color: COLORS.cyan, strength: 1 }; // the head's light on a press: how long ago,
                                                                        // in what colour, and how much of a burst
var waveSize = WAVE_GAP; // the waves' size as it stands, easing toward waveTarget()

function isLaser() { // is the piece a laser: in overdrive, or in laser form
    return driveOn() || form == "laser";
}

var WAVE_FULL_STEPS = 3; // steps of multiplier (COMBO_STEP hits each, loop.js) over which the waves widen to their most

function waveTarget() { // the size the combo calls for: a little more for every hit in a row, up to the max; while
    // the piece is a laser, tight round the beam
    if (isLaser()) {
        return WAVE_DRIVE;
    }
    var full = WAVE_FULL_STEPS * COMBO_STEP; // the combo at which the waves are at their widest (the multiplier climbs on)
    return WAVE_GAP + (WAVE_GAP_MAX - WAVE_GAP) * Math.min(combo, full) / full;
}

function playerReset() { // a level starts: no trail from wherever the piece was before
    trail.count = 0;
    waveSize = WAVE_GAP;
    playerFlash.age = FLASH_STEPS;
}

function playerRecord() { // each step, after the piece has moved: where it is now, and on which beat -- the beat as
    // the player plays it (judgePos, loop.js), so the waves meet where a press is on the beat: the audio's delay and
    // the timing offset move the meeting as they move the judging, and playing by eye agrees with playing by ear
    var s = trail.samples[trail.next];
    s.x = gamePiece.x + gamePiece.width / 2;
    s.y = gamePiece.y + gamePiece.height / 2;
    s.beat = judgePos();
    waveSize += (waveTarget() - waveSize) * (isLaser() ? WAVE_PULL : WAVE_GROW);
    s.gap = waveSize; // each point keeps the size it was made at, so the trail shows the combo growing
    s.laser = isLaser(); // and whether the piece was a laser, so the beam starts where it became one
    trail.next = (trail.next + 1) % TRAIL_STEPS;
    trail.count = Math.min(trail.count + 1, TRAIL_STEPS);
    if (playerFlash.age < FLASH_STEPS) {
        playerFlash.age++;
    }
}

function playerHitFlash(grade, color) { // a press: the head lights up, white for a PERFECT, else in the colour
    // pressed (a gate's: white). A clean hit gets the full burst; a BAD, or a press that comes to a miss, half of it,
    // so every press shows on the head, and a hit shows more
    playerFlash.age = 0;
    playerFlash.strength = grade == "perfect" || grade == "great" || grade == "good" ? 1 : 0.5;
    playerFlash.color = grade == "perfect" ? COLORS.laserCore : COLORS[color] || COLORS.laserCore;
}

function trailSample(age) { // the sample `age` steps ago (0: the newest)
    return trail.samples[(trail.next - 1 - age + 2 * TRAIL_STEPS) % TRAIL_STEPS];
}

function waveGap(beat, size) { // how far each wave sits from the centre: 0 on the beat, `size` halfway between
    return size * Math.sin(Math.PI * (beat - Math.floor(beat)));
}

var waveDecay = 0, waveDecaySeed = 0; // the death animation's decoherence (death.js): how far out of phase the waves
                                      // are, 0..1, and the frame their noise is re-rolled on

function wavePoint(age, side) { // where wave `side` (-1 above, +1 below) passes through the sample `age` steps back
    var s = trailSample(age);
    var ripple = WAVE_RIPPLE * (s.gap / WAVE_GAP) * Math.sin(2 * Math.PI * WAVE_CYCLES * s.beat);
    var gap = waveGap(s.beat, s.gap) * (1 + 4 * waveDecay); // out of phase: the gap swelling, and noise growing on it
    var noise = waveDecay > 0 ? (fxHash(age * 7 + waveDecaySeed, side + 3) - 0.5) * 60 * waveDecay : 0;
    return { x: s.x - age * TRAIL_DRIFT, y: s.y + side * gap + ripple + noise };
}

function drawPlayerDying(decay, seed) { // the death animation's waves (death.js): as they were at decay 0, then out
    // of phase and fading by `decay`, the noise re-rolled by `seed` each frame. No core: the animation draws its own
    if (trail.count < 2) {
        return;
    }
    waveDecay = decay;
    waveDecaySeed = seed;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokeWave(-1, COLORS.cyan, 1 - decay);
    strokeWave(1, COLORS.magenta, 1 - decay);
    ctx.restore();
    waveDecay = 0;
}

function strokeWave(side, color, dim) { // one wave from the head back, fading as it goes, a wide glow under a thin line
    var n = trail.count;
    var per = Math.ceil(n / TRAIL_CHUNKS);
    ctx.strokeStyle = color;
    for (var c = 0; c * per < n - 1; c++) {
        var from = c * per, to = Math.min(n - 1, from + per); // each piece shares its end with the next
        var fade = Math.pow(1 - c / TRAIL_CHUNKS, 1.2) * dim;
        ctx.beginPath();
        for (var k = from; k <= to; k++) {
            var p = wavePoint(k, side);
            if (k == from) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }
        ctx.globalAlpha = 0.08 * fade; // the haze
        ctx.lineWidth = 16;
        ctx.stroke();
        ctx.globalAlpha = 0.25 * fade; // the glow
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.globalAlpha = 0.95 * fade;
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

function strokeBeam(dim) { // a laser: a white beam down the middle of the trail, from the head back to where the piece
    // became one, fading along its length like the waves
    var n = 0;
    while (n < trail.count && trailSample(n).laser) {
        n++;
    }
    var per = Math.ceil(n / TRAIL_CHUNKS);
    ctx.strokeStyle = COLORS.laserCore;
    for (var c = 0; c * per < n - 1; c++) {
        var from = c * per, to = Math.min(n - 1, from + per);
        var fade = Math.pow(1 - c / TRAIL_CHUNKS, 1.2) * dim;
        ctx.beginPath();
        for (var k = from; k <= to; k++) {
            var p = wavePoint(k, 0);
            if (k == from) {
                ctx.moveTo(p.x, p.y);
            } else {
                ctx.lineTo(p.x, p.y);
            }
        }
        ctx.globalAlpha = 0.12 * fade; // wider and hotter than a wave: it is the laser
        ctx.lineWidth = 24;
        ctx.stroke();
        ctx.globalAlpha = 0.35 * fade;
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.globalAlpha = 0.95 * fade;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

function strokeAhead(head, reach, dim) { // laser form: the beam the piece fires across the screen, as far as it has
    // reached, kicking wider on each beat; overdrive widens it, as it widens what counts as lined up (loop.js)
    var end = head.x + (facing > 0 ? gameArea.canvas.width - head.x : -head.x) * reach; // the way it faces
    var wide = (driveOn() ? 2 : 1) * (1 + 0.35 * Math.max(0, 1 - beatFrac() * 4));
    ctx.strokeStyle = COLORS.laserCore;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(end, head.y);
    ctx.globalAlpha = 0.1 * dim;
    ctx.lineWidth = 26 * wide;
    ctx.stroke();
    ctx.globalAlpha = 0.3 * dim;
    ctx.lineWidth = 9 * wide;
    ctx.stroke();
    ctx.globalAlpha = 0.9 * dim;
    ctx.lineWidth = 3 * wide;
    ctx.stroke();
}

function drawPlayer(o) { // the two waves and the core, flickering while a hit has made it untouchable, and the
    // overdrive ring round the core when there is one to show
    if (trail.count < 2) {
        return;
    }
    var dim = invuln > 0 && Math.floor(invuln / 6) % 2 == 0 ? 0.25 : 1;
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; // light adds up: where the waves meet on the beat, they burn white
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    var head = trailSample(0);
    var laser = wave && isLaser();
    if (laser) {
        strokeBeam(dim);
    }
    var reach = wave ? beamReach() : 0;
    if (reach > 0) {
        strokeAhead(head, reach, dim);
    }
    var want = wave ? beatColor(cueBeat()) : null; // the coming beat's colour: its wave stays lit, the other dims
    strokeWave(-1, COLORS.cyan, dim * (want == "magenta" ? WAVE_UNLIT : 1));
    strokeWave(1, COLORS.magenta, dim * (want == "cyan" ? WAVE_UNLIT : 1));
    var flash = (playerFlash.age < FLASH_STEPS ? 1 - playerFlash.age / FLASH_STEPS : 0) * playerFlash.strength;
    ctx.globalAlpha = (0.25 + 0.5 * flash) * dim; // the core's glow, and a burst of it on a press, most on a clean hit
    ctx.fillStyle = flash > 0 ? playerFlash.color : laser ? COLORS.laserCore : want ? COLORS[want] || COLORS.laserCore
        : COLORS.cyan;
    ctx.beginPath();
    ctx.arc(head.x, head.y, CORE_R * (2.2 + 2.5 * flash + (laser ? 1.5 : 0)), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = dim;
    ctx.fillStyle = COLORS.laserCore;
    ctx.beginPath();
    ctx.arc(head.x, head.y, CORE_R, 0, Math.PI * 2);
    ctx.fill();
    if (laser) {
        drawBeatRing(head, dim, want);
    }
    drawDriveRing(head, dim);
    ctx.restore();
}

var BEAT_RING_R = 34; // px: where the beat ring starts each beat, closing on the core as the next beat comes: the cue
                      // the waves give in wave form, which pull in too tight round a laser to give it

function drawBeatRing(head, dim, want) { // a laser's beat cue: a ring in the coming beat's colour that closes on the
    // core as the beat comes, brightening, and arrives on it, as the waves meet on the beat in wave form
    var f = beatFrac(); // 0 on the beat, 1 just before the next
    ctx.globalAlpha = (0.15 + 0.6 * f) * dim;
    ctx.strokeStyle = want ? COLORS[want] || COLORS.laserCore : COLORS.laserCore;
    ctx.lineWidth = 1.5 + 1.5 * f;
    ctx.beginPath();
    ctx.arc(head.x, head.y, CORE_R + BEAT_RING_R * (1 - f), 0, Math.PI * 2);
    ctx.stroke();
}

function drawDriveRing(head, dim) { // overdrive, on the orb: with the meter full and unspent, a ring round the head
    // throbbing on the beat, as the meter does; spent and waiting for its beat, the ring steady; running, an arc from
    // the top, clockwise, shrinking as the time runs out. Nothing while it charges: that is the meter's to show
    var running = driveOn(), grace = !running && driveGrace();
    if (!running && !grace && !driveReady() && !driveArmed()) {
        return;
    }
    var left = running ? driveMeter() : 1; // the meter runs down with it
    var throb = grace ? (driveGraceUntil - beatPos) / OVERDRIVE_GRACE // the grace after it: the ring fading out over
        : driveReady() ? 0.55 + 0.45 * Math.max(0, 1 - beatFrac() * 3) : 1; // the beat it lasts
    ctx.globalAlpha = throb * dim;
    ctx.strokeStyle = COLORS.laserCore;
    ctx.lineWidth = DRIVE_RING_W;
    ctx.shadowColor = COLORS.laserCore;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(head.x, head.y, DRIVE_RING_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
    ctx.stroke();
    ctx.shadowBlur = 0;
}
