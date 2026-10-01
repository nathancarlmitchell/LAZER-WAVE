// Lazer Wave -- the bosses. A level with a boss (`boss` in its LEVELS entry, waves.js: { name, kind }) is a fight
// with the Array. Its health is the level's targets: every one struck lined up takes one, and so does every laser
// absorbed in overdrive. Its own bars are the level's wave bars, to be survived; yours are its laser bars, to hurt it
// in. The name and a health bar take the top stripe's slot in place of the level's progress. At no health it breaks
// up: the lasers stop, the gates go, the form is the wave's, and the bar plays out as a pause, the beat track stopped, the
// song's last chord ringing and no beat in it to hit or miss (playEnd, loop.js); the level ends there, cleared.
// Until then the level does not end: with its end in view and the boss still up, its loop, the bars from the one
// before its last laser section to its last, is dealt again (loopFrom, waves.js; extendLevel, loop.js), a round
// more, as many as it takes; the health bar counts the rounds, and the rank counts every beat of every one. Brought
// down, the boss pays a bonus (bossBonus): the whole of it for a fight finished in the first round, less the longer
// the fight runs on.
//
// Five kinds, one an act, each with a signature: "node" (Red Giant), a node at the right edge where the targets come
// from; "twin" (Interference), a node at each edge, laser form facing right in its first section and left in its
// second (facing, loop.js); "radar" (Static Bloom), a node in the middle of the screen, the radar's pivot, whose arm
// runs slower the more it is hurt (bossSlow); "chaser" (Overdrive), a node that follows the piece's height, whose
// ports are open only while overdrive runs; and "mirror" (Lazer Wave), a mirror of the piece on the right that fires
// back, on every other beat of its bars, at the height the piece was at a bar ago. index.html loads this with a
// plain <script src>, as globals rather than modules, so the game still opens straight off disk.

var BOSS_NODE_W = 0.055; // of the width: a node's column at an edge
var BOSS_BREAK = 1.5; // beats a node takes to break up once its health is gone
var BOSS_PARTICLES = 90; // what it breaks into
var BOSS_SLOW = 0.7; // how much slower the radar's arm runs at the boss's last point of health than at its first
var BOSS_CHASE = 0.06; // of the way to the piece's height the chaser's node moves a step
var BOSS_CHASE_H = 0.3; // of the height: the chaser's node
var BOSS_ECHO_BEATS = BEATS_PER_BAR; // how long after the piece was at a height the mirror fires at it
var BOSS_ECHO_EVERY = 2; // the mirror fires on every this-many-th beat of its bars
var BOSS_MIRROR_X = 0.85; // of the width: where the mirror's head sits
var BOSS_MIRROR_TAIL = 150; // px: its waves, trailing to the right
var BOSS_BONUS = 1000; // points a boss brought down pays, an act's number of times over (Red Giant 1000, Lazer Wave 5000),
// at NORMAL's rate, for a fight finished within the level's own bars: its first round
var bossBonusWon = 0; // what the boss brought down in this attempt paid, for the results

var boss = null; // the level's boss while it has one: { name, kind, max, health, downAt, parts, y, echo }

function bossUp() { // a boss level, its boss still standing
    return boss !== null && boss.downAt === null;
}

function bossStart(def, timeline) { // a level starts: its boss, if it has one, with a point of health for every target
    // the level has
    boss = null;
    bossBonusWon = 0;
    if (!def.boss) {
        return;
    }
    var targets = timeline.filter(function (ev) { return ev.axis == "target"; }).length;
    boss = { name: def.boss.name, kind: def.boss.kind || "node", max: Math.max(1, targets), health: Math.max(1, targets),
        downAt: null, parts: [], y: 0.5, echo: {} };
}

function bossBonus(at) { // the points the boss pays brought down at beat `at`: the act's BOSS_BONUS within the level's own
    // bars, and less the longer the fight runs past them, by rounds (loopLen, loop.js): a round more halves it, two more
    // thirds it; times the combo's multiplier as it stands, so a boss beaten on a long streak pays as the streak does
    // (overdrive's doubling does not apply), and as the combo cannot climb past the first round (earning, loop.js) a
    // fight drawn out only loses; at the difficulty's rate (modePoints, run.js)
    var own = (COUNT_IN_BARS + wave.bars) * BEATS_PER_BAR;
    var over = loopLen > 0 ? Math.max(0, at - own) / loopLen : 0;
    return modePoints(BOSS_BONUS * levelAct(level) * multiplier() / (1 + over));
}

function bossSlow() { // what the radar's arm is slowed by: 1 unless Static Bloom is up and hurt
    return boss && boss.kind == "radar" && boss.downAt === null ? 1 + BOSS_SLOW * (1 - boss.health / boss.max) : 1;
}

function bossPortsOpen() { // can a target struck hurt the boss now: always, but for Overdrive's, open only in overdrive
    return !boss || boss.kind != "chaser" || driveOn();
}

function bossHit(n, port) { // a target struck (port), or n lasers absorbed: health off it, and at none, down it goes
    if (!bossUp() || (port && !bossPortsOpen())) {
        return;
    }
    boss.health = Math.max(0, boss.health - n);
    if (boss.health == 0) {
        bossDown();
    }
}

function bossDown() { // the boss breaks up, the bar plays out, and the level ends there, cleared: its end is brought in
    // to the end of this bar, or of the next when the break-up would not be over by then
    boss.downAt = beatPos;
    var last = -1; // the beats stop after the last one judged, or after this one, whichever is later: a press that
    for (var j in judged) { // fell early on the beat ahead and brought the boss down has that beat count
        last = Math.max(last, Number(j));
    }
    boss.playEnd = Math.max(Math.ceil(beatPos), last + 1);
    bossBonusWon = bossBonus(beatPos); // the fight's points: the most for one finished in the first round
    score += bossBonusWon;
    var barEnd = (Math.floor(beatPos / BEATS_PER_BAR) + 1) * BEATS_PER_BAR;
    if (barEnd < beatPos + BOSS_BREAK) {
        barEnd += BEATS_PER_BAR;
    }
    totalBeats = Math.min(totalBeats, Math.max(barEnd, boss.playEnd));
    nextSpawn = spawnQueue.length; // nothing more comes on
    clearObjects(); // and what is on goes
    gateTo = {}; // no gate left to pass or miss
    gateFacing = {};
    for (var b in beatColors) { // nothing in the pause wants a colour: the cue shows none
        if (Number(b) >= boss.playEnd) {
            delete beatColors[b];
        }
    }
    switchForm("wave");
    synthCharged(0, actSong(level).key);
    musicFinish((boss.playEnd * msPerBeat() - simNowMs()) / 1000); // the song's last chord, on the pause's first beat
    var W = gameArea.canvas.width, H = gameArea.canvas.height, from = bossSparkFrom();
    popPoints(bossBonusWon, from.x, from.y, "BOSS"); // said where it breaks up, as a hit's points are
    for (var i = 0; i < BOSS_PARTICLES; i++) { // its sparks, flying off
        boss.parts.push({ x: from.x + (fxHash(i, 21) - 0.5) * from.w, y: from.y + (fxHash(i, 22) - 0.5) * from.h,
            vx: from.vx * (0.3 + fxHash(i, 23)), vy: (fxHash(i, 24) - 0.5) * 160, s: 2 + 3 * fxHash(i, 25),
            hot: fxHash(i, 26) < 0.4 });
    }
}

function bossSparkFrom() { // where the sparks start and which way they fly, by kind: { x, y, w, h, vx }, in px
    var W = gameArea.canvas.width, H = gameArea.canvas.height, col = W * BOSS_NODE_W;
    if (boss.kind == "radar") {
        return { x: W / 2, y: H / 2, w: 0.2 * H, h: 0.2 * H, vx: 0 };
    }
    if (boss.kind == "chaser") {
        return { x: W - col / 2, y: boss.y * H, w: col, h: BOSS_CHASE_H * H, vx: -320 };
    }
    if (boss.kind == "mirror") {
        return { x: BOSS_MIRROR_X * W, y: bossEchoY() * H, w: 60, h: 60, vx: -320 };
    }
    return { x: W - col / 2, y: H / 2, w: col, h: H, vx: -320 }; // a node at the right edge, and the twin's right one
}

function bossStep() { // each step: the chaser's node eases toward the piece's height
    if (bossUp() && boss.kind == "chaser") {
        boss.y += ((gamePiece.y + gamePiece.height / 2) / gameArea.canvas.height - boss.y) * BOSS_CHASE;
    }
}

function bossBeat(b) { // a beat went by: the mirror remembers where the piece is, and in its own bars fires, on every
    // other beat, at where the piece was a bar ago, a beam warned the level's warning ahead
    if (!bossUp() || boss.kind != "mirror") {
        return;
    }
    boss.echo[b] = (gamePiece.y + gamePiece.height / 2) / gameArea.canvas.height;
    var was = boss.echo[b - BOSS_ECHO_BEATS], lead = Math.ceil(warnBeats());
    if (was === undefined || form != "wave" || b % BOSS_ECHO_EVERY != 0 || b + lead >= totalBeats) {
        return;
    }
    hazards.push(makeHazard({ fire: b + lead, axis: "h", pos: Math.max(BEAM_TOP, Math.min(0.97 - BEAM_SIZE, was - BEAM_SIZE / 2)),
        size: BEAM_SIZE, color: null }, warnBeats()));
}

function bossEchoY() { // where the mirror's head is: where the piece was a bar ago, or the middle before it knows
    var was = boss.echo[Math.floor(beatPos) - BOSS_ECHO_BEATS];
    return was === undefined ? 0.5 : was;
}

function drawBoss() { // the boss, behind the lasers and the targets, by kind; once down, its sparks
    if (!boss) {
        return;
    }
    var W = gameArea.canvas.width, H = gameArea.canvas.height, col = W * BOSS_NODE_W;
    ctx.save();
    useWindow();
    if (boss.downAt !== null) {
        var u = Math.min(1, (beatPos - boss.downAt) / BOSS_BREAK);
        if (u < 1) {
            boss.parts.forEach(function (p) {
                ctx.globalAlpha = 0.9 * (1 - u);
                ctx.fillStyle = p.hot ? COLORS.laserCore : COLORS.laser;
                ctx.fillRect(p.x + p.vx * u, p.y + p.vy * u, p.s, p.s);
            });
        }
        ctx.restore();
        return;
    }
    var life = boss.health / boss.max, pulse = Math.max(0, 1 - beatFrac() * 3);
    if (boss.kind == "twin") {
        bossColumn(0, col, -1, life, pulse); // a node at each edge, its light toward the middle
        bossColumn(W - col, W, 1, life, pulse);
        bossPorts(facing > 0 ? W - col / 2 : col / 2, life);
    } else if (boss.kind == "radar") { // the node in the middle: the radar's pivot, a disc with a pulsing rim
        var r = 0.08 * H;
        var g = ctx.createRadialGradient(W / 2, H / 2, r * 0.2, W / 2, H / 2, r * 1.6);
        g.addColorStop(0, "rgba(255,42,109," + (0.5 + 0.4 * life).toFixed(3) + ")");
        g.addColorStop(1, "rgba(255,42,109,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(W / 2 - r * 1.6, H / 2 - r * 1.6, r * 3.2, r * 3.2);
        ctx.globalAlpha = 0.45 + 0.55 * pulse * life;
        ctx.strokeStyle = COLORS.laser;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.3 + 0.6 * life;
        ctx.strokeStyle = COLORS.laserCore;
        ctx.lineWidth = 1;
        ctx.stroke();
        bossPorts(W - col / 2, life);
    } else if (boss.kind == "chaser") { // a block at the right edge, on the piece's height, a step behind it
        var top = Math.max(0, Math.min(H - BOSS_CHASE_H * H, boss.y * H - BOSS_CHASE_H * H / 2));
        bossColumn(W - col, W, 1, life, pulse, top, top + BOSS_CHASE_H * H);
        bossPorts(W - col / 2, life, bossPortsOpen() ? 1 : 0.35);
    } else if (boss.kind == "mirror") { // the mirror of the piece: two waves trailing to the right from a head at
        // where the piece was a bar ago, in the piece's colours but dim, round a core in the laser's red
        var hx = BOSS_MIRROR_X * W, hy = bossEchoY() * H, gap = waveGap(beatPos, WAVE_GAP);
        ctx.lineCap = "round";
        [[-1, COLORS.cyan], [1, COLORS.magenta]].forEach(function (w) {
            ctx.strokeStyle = w[1];
            ctx.beginPath();
            for (var dx = 0; dx <= BOSS_MIRROR_TAIL; dx += 5) {
                var yy = hy + w[0] * gap * Math.sin(Math.PI * dx / 40 + beatPos * 2) * (1 - dx / BOSS_MIRROR_TAIL);
                if (dx == 0) {
                    ctx.moveTo(hx, yy);
                } else {
                    ctx.lineTo(hx + dx, yy);
                }
            }
            ctx.globalAlpha = 0.15 * life + 0.1;
            ctx.lineWidth = 8;
            ctx.stroke();
            ctx.globalAlpha = 0.5 * life + 0.2;
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        ctx.globalAlpha = 0.6 + 0.4 * pulse;
        ctx.fillStyle = COLORS.laser;
        ctx.beginPath();
        ctx.arc(hx, hy, CORE_R * 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLORS.laserCore;
        ctx.beginPath();
        ctx.arc(hx, hy, CORE_R, 0, Math.PI * 2);
        ctx.fill();
    } else { // a node at the right edge, where the targets come from
        bossColumn(W - col, W, 1, life, pulse);
        bossPorts(W - col / 2, life);
    }
    ctx.restore();
}

function bossColumn(x0, x1, side, life, pulse, top, bottom) { // a node's column between x0 and x1, its light toward the
    // middle of the screen (side: 1 at the right edge, -1 at the left), its edge pulsing on the beat and dimming as its
    // health goes, vents across it; the whole height unless given a top and a bottom
    var H = gameArea.canvas.height, y0 = top || 0, y1 = bottom === undefined ? H : bottom;
    var g = ctx.createLinearGradient(side > 0 ? x0 : x1, 0, side > 0 ? x1 : x0, 0);
    g.addColorStop(0, "rgba(255,42,109,0)");
    g.addColorStop(1, "rgba(255,42,109," + (0.2 + 0.4 * life).toFixed(3) + ")");
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    var edge = side > 0 ? x0 : x1 - 3;
    ctx.globalAlpha = 0.45 + 0.55 * pulse * life;
    ctx.fillStyle = COLORS.laser;
    ctx.fillRect(edge, y0, 3, y1 - y0);
    ctx.globalAlpha = 0.3 + 0.6 * life;
    ctx.fillStyle = COLORS.laserCore;
    ctx.fillRect(side > 0 ? x0 : x1 - 1, y0, 1, y1 - y0);
    ctx.globalAlpha = 0.12 + 0.25 * pulse;
    for (var yy = y0 + 12; yy < y1; yy += 24) {
        ctx.fillRect(x0 + 6, yy, x1 - x0 - 12, 1);
    }
}

function bossPorts(px, life, open) { // a port at px, at the height of every target still on its way, in the target's
    // colour; `open`, if given, is how bright: shut ports are dim
    var k = open === undefined ? 1 : open;
    hazards.forEach(function (h) {
        if (h instanceof Target && h.hitAt === null) {
            var c = h.center(), tint = h.color ? COLORS[h.color] : COLORS.laserCore;
            ctx.globalAlpha = 0.5 * k;
            ctx.fillStyle = COLORS.laser;
            ctx.beginPath();
            ctx.arc(px, c.y, c.r * 0.55, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.9 * k;
            ctx.strokeStyle = tint;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

function drawBossBar() { // the top stripe's slot: the boss's name and its health, in place of the level's progress
    var W = gameArea.canvas.width, life = boss.downAt === null ? boss.health / boss.max : 0;
    ctx.save();
    useWindow();
    ctx.globalAlpha = BAR_TRACK;
    ctx.fillStyle = COLORS.laser;
    ctx.fillRect(0, BAR_TOP, W, BAR_H);
    ctx.globalAlpha = BAR_ALPHA;
    ctx.fillRect(0, BAR_TOP, W * life, BAR_H);
    ctx.globalAlpha = 1;
    ctx.font = "bold 14px Arial";
    ctx.fillStyle = COLORS.laserCore;
    var note = boss.downAt !== null ? "DOWN   +" + bossBonusWon : boss.health + " / " + boss.max
        + (passes > 0 ? "   ROUND " + (passes + 1) + " (SCORE HELD)" : "") // the loop's round, once it has gone round: nothing
        // is earned in it (earning, loop.js)
        + "   BONUS " + bossBonus(beatPos) // what it pays brought down now: less as the fight runs on
        + (boss.kind == "chaser" && !driveOn() ? "   ports shut: overdrive opens them" : "");
    ctx.fillText(boss.name + "   " + note, 12, BAR_TOP + BAR_H - 5);
    ctx.restore();
}
