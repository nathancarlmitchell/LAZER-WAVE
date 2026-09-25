// Lazer Wave -- the player. Two sine waves, cyan and magenta, drawn off the piece's recent positions and drifting
// away behind it like a trace across an oscilloscope, so moving leaves a glowing trail. The gap between them is the
// beat: it opens after each beat and closes as the next one comes, and on the beat the two meet in one line -- that
// is when to hit. The hitbox is the small core where they meet. index.html loads this with a plain <script src>, as
// globals rather than modules, so the game still opens straight off disk.
//
// Like the effects, this only draws: it reads the piece and beatPos, and nothing here changes what the game does.
// The history is recorded every step (playerRecord) so the trail is the same whether a step was painted or not.

var TRAIL_STEPS = 120; // steps of position history the trail is drawn from (1.2s)
var TRAIL_DRIFT = 3; // px a step the trail drifts left: the waves travel away behind the piece even when it holds still
var WAVE_GAP = 26; // px from the centre line to each wave at the widest point of a beat
var WAVE_RIPPLE = 0; // px the waves wiggle by, both together, so they are sine waves and not just two lines
var WAVE_CYCLES = 2; // wiggles per beat
var TRAIL_CHUNKS = 10; // the trail is stroked in this many pieces, each fainter than the one in front
var CORE_R = 4; // px: the glowing core at the head, which is the hitbox
var FLASH_STEPS = 18; // how long a good hit lights the head up

var trail = { samples: [], next: 0, count: 0 }; // a ring of reused { x, y, beat } records
while (trail.samples.length < TRAIL_STEPS) {
    trail.samples.push({ x: 0, y: 0, beat: 0 });
}
var playerFlash = { age: FLASH_STEPS, color: COLORS.cyan };

function playerReset() { // a level starts: no trail from wherever the piece was before
    trail.count = 0;
    playerFlash.age = FLASH_STEPS;
}

function playerRecord() { // each step, after the piece has moved: where it is now, and on which beat
    var s = trail.samples[trail.next];
    s.x = gamePiece.x + gamePiece.width / 2;
    s.y = gamePiece.y + gamePiece.height / 2;
    s.beat = beatPos;
    trail.next = (trail.next + 1) % TRAIL_STEPS;
    trail.count = Math.min(trail.count + 1, TRAIL_STEPS);
    if (playerFlash.age < FLASH_STEPS) {
        playerFlash.age++;
    }
}

function playerHitFlash(grade) { // a hit on the beat: the head lights up in the grade's colour
    playerFlash.age = 0;
    playerFlash.color = grade == "perfect" ? COLORS.laserCore : COLORS.magenta;
}

function trailSample(age) { // the sample `age` steps ago (0: the newest)
    return trail.samples[(trail.next - 1 - age + 2 * TRAIL_STEPS) % TRAIL_STEPS];
}

function waveGap(beat) { // how far each wave sits from the centre: 0 on the beat, widest halfway between
    return WAVE_GAP * Math.sin(Math.PI * (beat - Math.floor(beat)));
}

function wavePoint(age, side) { // where wave `side` (-1 above, +1 below) passes through the sample `age` steps back
    var s = trailSample(age);
    var ripple = WAVE_RIPPLE * Math.sin(2 * Math.PI * WAVE_CYCLES * s.beat);
    return { x: s.x - age * TRAIL_DRIFT, y: s.y + side * waveGap(s.beat) + ripple };
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

function drawPlayer(o) { // the two waves and the core, flickering while a hit has made it untouchable
    if (trail.count < 2) {
        return;
    }
    var dim = invuln > 0 && Math.floor(invuln / 6) % 2 == 0 ? 0.25 : 1;
    ctx.save();
    ctx.globalCompositeOperation = "lighter"; // light adds up: where the waves meet on the beat, they burn white
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokeWave(-1, COLORS.cyan, dim);
    strokeWave(1, COLORS.magenta, dim);
    var head = trailSample(0);
    var flash = playerFlash.age < FLASH_STEPS ? 1 - playerFlash.age / FLASH_STEPS : 0;
    ctx.globalAlpha = (0.25 + 0.5 * flash) * dim; // the core's glow, and a burst of it on a good hit
    ctx.fillStyle = flash > 0 ? playerFlash.color : COLORS.cyan;
    ctx.beginPath();
    ctx.arc(head.x, head.y, CORE_R * (2.2 + 2.5 * flash), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = dim;
    ctx.fillStyle = COLORS.laserCore;
    ctx.beginPath();
    ctx.arc(head.x, head.y, CORE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
