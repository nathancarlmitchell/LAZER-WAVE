// Lazer Wave -- the player. Two sine waves, cyan and magenta, drawn off the piece's recent positions and drifting
// away behind it like a trace across an oscilloscope, so moving leaves a glowing trail. The gap between them is the
// beat: it opens after each beat and closes as the next one comes, and on the beat the two meet in one line -- that
// is when to hit. The hitbox is the small core where they meet. The waves are also the two keys: while a coloured
// beat is coming, the wave of its colour stays lit and the other dims, so the top wave says Z and the bottom X. In
// overdrive the piece is a laser: a white beam runs down the middle of the trail, back to where the overdrive began,
// and the waves snap in tight round it -- still opening and meeting on the beat, just small -- so the trail pinches
// into one beam where the overdrive starts. index.html loads this with a plain <script src>, as globals rather than
// modules, so the game still opens straight off disk.
//
// Like the effects, this only draws: it reads the piece and beatPos, and nothing here changes what the game does.
// The history is recorded every step (playerRecord) so the trail is the same whether a step was painted or not.

var TRAIL_STEPS = 120; // steps of position history the trail is drawn from (1.2s)
var TRAIL_DRIFT = 3; // px a step the trail drifts left: the waves travel away behind the piece even when it holds still
var WAVE_GAP = 12; // px from the centre line to each wave at the widest point of a beat, with no combo...
var WAVE_GAP_MAX = 24; // ...growing with every hit in a row up to this, at the combo that maxes the multiplier
var WAVE_GROW = 0.08; // of the way to the size the combo calls for, a step: it swells and shrinks, never jumps
var WAVE_DRIVE = 5; // px: the waves' size in overdrive, pulled in round the beam
var WAVE_PULL = 0.2; // of the way there a step as they pull in: a snap, where the swell back out is slow
var WAVE_RIPPLE = 0; // px the waves wiggle by, both together, so they are sine waves and not just two lines
var WAVE_CYCLES = 2; // wiggles per beat
var TRAIL_CHUNKS = 10; // the trail is stroked in this many pieces, each fainter than the one in front
var CORE_R = 4; // px: the glowing core at the head, which is the hitbox
var FLASH_STEPS = 18; // how long a good hit lights the head up
var WAVE_UNLIT = 0.3; // how bright the wave of the other colour stays while a coloured beat is coming

var trail = { samples: [], next: 0, count: 0 }; // a ring of reused { x, y, beat, gap, drive } records
while (trail.samples.length < TRAIL_STEPS) {
    trail.samples.push({ x: 0, y: 0, beat: 0, gap: 0, drive: false });
}
var playerFlash = { age: FLASH_STEPS, color: COLORS.cyan };
var waveSize = WAVE_GAP; // the waves' size as it stands, easing toward waveTarget()

function waveTarget() { // the size the combo calls for: a little more for every hit in a row, up to the max; in
    // overdrive, tight round the beam
    if (driveOn()) {
        return WAVE_DRIVE;
    }
    var full = COMBO_STEP * (MULT_MAX - 1); // the combo at which the multiplier stops climbing
    return WAVE_GAP + (WAVE_GAP_MAX - WAVE_GAP) * Math.min(combo, full) / full;
}

function playerReset() { // a level starts: no trail from wherever the piece was before
    trail.count = 0;
    waveSize = WAVE_GAP;
    playerFlash.age = FLASH_STEPS;
}

function playerRecord() { // each step, after the piece has moved: where it is now, and on which beat
    var s = trail.samples[trail.next];
    s.x = gamePiece.x + gamePiece.width / 2;
    s.y = gamePiece.y + gamePiece.height / 2;
    s.beat = beatPos;
    waveSize += (waveTarget() - waveSize) * (driveOn() ? WAVE_PULL : WAVE_GROW);
    s.gap = waveSize; // each point keeps the size it was made at, so the trail shows the combo growing
    s.drive = driveOn(); // and whether it was made in overdrive, so the beam starts where the overdrive did
    trail.next = (trail.next + 1) % TRAIL_STEPS;
    trail.count = Math.min(trail.count + 1, TRAIL_STEPS);
    if (playerFlash.age < FLASH_STEPS) {
        playerFlash.age++;
    }
}

function playerHitFlash(grade, color) { // a hit on the beat: the head lights up, white for a PERFECT, else in the
    // colour it was hit in
    playerFlash.age = 0;
    playerFlash.color = grade == "perfect" ? COLORS.laserCore : COLORS[color] || COLORS.magenta;
}

function trailSample(age) { // the sample `age` steps ago (0: the newest)
    return trail.samples[(trail.next - 1 - age + 2 * TRAIL_STEPS) % TRAIL_STEPS];
}

function waveGap(beat, size) { // how far each wave sits from the centre: 0 on the beat, `size` halfway between
    return size * Math.sin(Math.PI * (beat - Math.floor(beat)));
}

function wavePoint(age, side) { // where wave `side` (-1 above, +1 below) passes through the sample `age` steps back
    var s = trailSample(age);
    var ripple = WAVE_RIPPLE * (s.gap / WAVE_GAP) * Math.sin(2 * Math.PI * WAVE_CYCLES * s.beat);
    return { x: s.x - age * TRAIL_DRIFT, y: s.y + side * waveGap(s.beat, s.gap) + ripple };
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

function strokeBeam(dim) { // overdrive: a white beam down the middle of the trail, from the head back to where the
    // overdrive began, fading along its length like the waves
    var n = 0;
    while (n < trail.count && trailSample(n).drive) {
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

function drawPlayer(o) { // the two waves and the core, flickering while a hit has made it untouchable
    if (trail.count < 2) {
        return;
    }
    var dim = invuln > 0 && Math.floor(invuln / 6) % 2 == 0 ? 0.25 : 1;
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; // light adds up: where the waves meet on the beat, they burn white
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    var laser = wave && driveOn();
    if (laser) {
        strokeBeam(dim);
    }
    var want = wave ? beatColor(cueBeat()) : null; // the coming beat's colour: its wave stays lit, the other dims
    strokeWave(-1, COLORS.cyan, dim * (want == "magenta" ? WAVE_UNLIT : 1));
    strokeWave(1, COLORS.magenta, dim * (want == "cyan" ? WAVE_UNLIT : 1));
    var head = trailSample(0);
    var flash = playerFlash.age < FLASH_STEPS ? 1 - playerFlash.age / FLASH_STEPS : 0;
    ctx.globalAlpha = (0.25 + 0.5 * flash) * dim; // the core's glow, and a burst of it on a good hit
    ctx.fillStyle = flash > 0 ? playerFlash.color : laser ? COLORS.laserCore : want ? COLORS[want] : COLORS.cyan;
    ctx.beginPath();
    ctx.arc(head.x, head.y, CORE_R * (2.2 + 2.5 * flash + (laser ? 1.5 : 0)), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = dim;
    ctx.fillStyle = COLORS.laserCore;
    ctx.beginPath();
    ctx.arc(head.x, head.y, CORE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
