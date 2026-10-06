// Lazer Wave -- a level's beginning and its end. startGame and the touch start that seeds it, the way into a level the
// run hasn't played (its act's story and its card, story.js), the results a level ends on and what they wait for (a
// clear's CONTINUE and RETRY, a death's TRY AGAIN and QUIT, the game over's PLAY AGAIN and QUIT), the epilogue and
// the finish, the restart from it, the message block that lays
// out the screens between levels (measured, centred and fitted to the window), and gameOver, which is where a level
// cleared or lost becomes records, messages and the next level. index.html loads this with a plain <script src>, as
// globals rather than modules, so the game still opens straight off disk.
//
// It drives the game rather than reading it: playLevel sets it running, gameOver stops it. Both reach into the loop
// (gameArea, startLevel), the world (clearObjects, component), the records and the effects (fxReset).

function startGame(e) { // START, or a level picked on the level select: the run begins at `level`, the story of its
    // act first if it opens one
    startScreenIntervals.forEach(function (id) { clearInterval(id); });
    loadAudio();
    playSound(aud_click);
    startupStop(); // the startup sequence, if it is still going: the run has its own sounds
    themeStop(false, THEME_GO); // and the menu theme, which the menus start again from the top (theme.js)
    startTime = Date.now();
    onlineRunBegins(); // the best a run or a rush has had, for its total to beat to be offered (online.js)
    startRunLives(); // the difficulty is locked in from here: its buttons are only on the difficulty screen and the
    // level select
    carryHp = carryMeter = carryCombo = null; // a run begins on full shields, an empty meter and no combo
    runPeakCombo = 0;
    gamePiece = new component(PIECE_SIZE, PIECE_SIZE, COLORS.piece, e.pageX - PIECE_SIZE / 2, e.pageY - PIECE_SIZE / 2); // centered on the cursor
    gamePiece.update = function () { drawPlayer(this); };
    gameStart = true;
    runFrom = level;
    selectRun = false; // START's run goes on from level to level; the level select says otherwise after this
    enterLevel();
}

function startRunFrom(p) { // the difficulty screen: a full run from the first level, on the difficulty just chosen, started
    // as START used to start one for the input in use (p: where the pointer was, for the mouse's piece); or, for the
    // BOSS RUSH mode (playMode, menu.js), the boss rush, from its first boss
    var rush = playMode == "rush";
    menuScreen = ""; // it goes without being drawn again: the story comes up over it
    hoveredButton = "";
    level = rush ? RUSH_LEVELS[0] : 1;
    bossRush = rush;
    if (inputMode == "touch") {
        startTouchGame();
    } else if (inputMode == "pad") {
        startPadGame();
    } else {
        startGame({ pageX: p ? p.x : gameArea.canvas.width / 4, pageY: p ? p.y : gameArea.canvas.height / 2 });
    }
}

function startRunAt(n, p) { // the level select: a run from level n, started as START starts one for the input in use
    // (p: where the pointer was, for the mouse's piece)
    menuScreen = ""; // it goes without being drawn again: the story comes up over it
    hoveredButton = "";
    level = n;
    bossRush = false;
    if (inputMode == "touch") {
        startTouchGame();
    } else if (inputMode == "pad") {
        startPadGame();
    } else {
        startGame({ pageX: p ? p.x : gameArea.canvas.width / 4, pageY: p ? p.y : gameArea.canvas.height / 2 });
    }
    selectRun = true; // one level: its results end at the select
}

function enterLevel() { // the run comes to a level it hasn't played: the story of the act it opens, if it opens one,
    // then its card, then the level. A death or a retry comes back to it without them (startNextLevel), and practice
    // goes straight in
    if (practice) {
        playLevel();
        return;
    }
    var card = function () { showLevelCard(level, playLevel); };
    if (level == actFirstLevel(levelAct(level))) {
        showActIntro(levelAct(level), card);
    } else {
        card();
    }
}

function playLevel() { // an attempt at the level begins: after its card, after a death, or on a retry
    gameArea.start();
    alive = true;
    if (!practice && !bossRush) { // practice is never recorded, and the boss rush keeps records of its own
        reachedLevel(level);
    }
    restFrame = null; // the next transition screen gets a fresh copy
    pause = false;
    var cx = gamePiece.x + gamePiece.width / 2;
    var cy = gamePiece.y + gamePiece.height / 2;
    if (inputMode != "mouse" && (cx < 0 || cy < 0 || cx > gameArea.canvas.width || cy > gameArea.canvas.height)) {
        // the window shrank between levels: back to the touch start spot (the level starts empty). The mouse's piece
        // goes where the cursor is anyway
        gameArea.x = gameArea.canvas.width * 0.25;
        gameArea.y = gameArea.canvas.height * 0.5;
        gamePiece.x = gameArea.x - gamePiece.width / 2;
        gamePiece.y = gameArea.y - gamePiece.height / 2;
    }
    startLevel(); // the game's own setup for the level about to be played
    onlinePlayStarts(); // and the play's ticket from the site, if there is one to ask (online.js)
    // No pause here for a window without focus: a press brought the player here (the card's, or a results button),
    // and the card waits for a player who has gone away before going on by itself (storyFrame, story.js). Phones and
    // embedded frames report no focus even as they are tapped, and were starting every level paused
}

function startTouchGame() { // start from a tap: the piece starts at the left middle, and sounds are unlocked in this tap
    ALL_SFX.forEach(function (sound) {
        // mobile browsers only let a sound play later if it was first played during a tap; pausing at once keeps it silent
        var playing = sound.play();
        sound.pause();
        if (playing) {
            playing.catch(function () {}); // pausing before playback starts rejects play()
        }
    });
    var startX = gameArea.canvas.width * 0.25;
    var tb = touchButtons();
    if (tb.side == "left") { // that quarter is where the buttons are now: start clear of them, no further
        startX = Math.max(startX, tb.box.right + 40);
    }
    var startY = gameArea.canvas.height * 0.5;
    startGame({ pageX: startX, pageY: startY });
    gameArea.x = startX; // the steering target starts on the piece
    gameArea.y = startY;
}

function startPadGame() { // start from a controller: the piece starts where a touch start puts it
    var startX = gameArea.canvas.width * 0.25;
    var startY = gameArea.canvas.height * 0.5;
    startGame({ pageX: startX, pageY: startY });
    gameArea.x = startX;
    gameArea.y = startY;
}

function restartRun() { // after the finish screen, start a fresh run from where this one began, and its story
    runFinished = false;
    restartArmed = false;
    level = runFrom;
    deaths = 0;
    score = 0;
    runScore = 0;
    onlineRunBegins();
    startRunLives();
    carryHp = carryMeter = carryCombo = null;
    runPeakCombo = 0;
    startTime = Date.now();
    enterLevel();
}

function startNextLevel() { // the level again: after a death, or on a retry
    gameArea.clear();
    playLevel();
}

// A message is collected line by line, measured, and drawn as one block: every line truly centred (or, in a column,
// lined up), the block centred on the screen, and the whole thing scaled to fill the room it has -- the lines it holds
// depend on the level, the score and the deaths, so it is the one band that has to be measured at draw time rather
// than written down.
var msgBlock = []; // the lines queued so far, measured and drawn by showMessage

function centerText(text, dy, passes, x) { // queue a line dy from the block's baseline, in the font and fill set now,
    // centred x from the block's middle (on it, by default); passes > 1 repeats it 1px down and right for a bold look
    msgBlock.push({ text: text, x: x || 0, align: "center", dy: dy, passes: passes || 1, font: ctx.font, fill: ctx.fillStyle });
}

function columnText(text, x, dy, align) { // queue a line that ends at x instead of centring on it: its left end there
    // ("left") or its right ("right"), so the lines of a column line up
    msgBlock.push({ text: text, x: x, align: align, dy: dy, passes: 1, font: ctx.font, fill: ctx.fillStyle });
}

var PRINT_TRAIL = 8; // copies a printed line trails
var COMBO_TRAIL = 3; // and a line in the results' smaller face (the MAX COMBO heading), in proportion

function printText(text, dy, x) { // queue a line printed as the title is: cyan copies trailing up and left, a pixel
    // apart, and magenta over them, in the font set now, centred x from the block's middle (on it, by default)
    msgBlock.push({ text: text, x: x || 0, align: "center", dy: dy, passes: 1, font: ctx.font, fill: COLORS.magenta,
        print: COLORS.cyan, trail: PRINT_TRAIL });
}

function columnPrint(text, x, dy, align, trail) { // a printed line, as printText's, that lines up at x as columnText's
    // does, trailing `trail` copies
    msgBlock.push({ text: text, x: x, align: align, dy: dy, passes: 1, font: ctx.font, fill: COLORS.magenta,
        print: COLORS.cyan, trail: trail });
}

var LEFT_OF_X = { left: 0, center: 0.5, right: 1 }; // how much of a line's width lies left of its x, by its alignment

var msgButtons = []; // the last message's buttons, where the fit put them in window pixels: { name, left, top, right,
                     // bottom }, for the clicks and taps on them

function buttonText(name, text, sub, x, dy, w, h, lit, primary) { // queue a button: a w x h box, its top dy and its
    // middle x from the block's middle, framed as the menus' are, its label in the font set now over a smaller line;
    // lit is the one under the mouse or a finger, and primary the way on, filled as START is
    msgBlock.push({ button: name, text: text, sub: sub, x: x, align: "center", dy: dy, w: w, h: h, lit: lit,
        primary: primary, passes: 1, font: ctx.font });
}

function msgButtonAt(px, py) { // the button of the last message at a window point, or ""
    for (var i = 0; i < msgButtons.length; i++) {
        var b = msgButtons[i];
        if (px >= b.left && px <= b.right && py >= b.top && py <= b.bottom) {
            return b.name;
        }
    }
    return "";
}

function drawMsgButton(b, dx, dy, s) { // a queued button, in the block's frame, and a note of where it landed
    var bx = dx + b.x - b.w / 2, by = dy + b.dy;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(bx, by, b.w, b.h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(bx + 2, by + 2, b.w - 4, b.h - 4);
    var glow = b.lit ? 0.35 : b.primary ? 0.2 : 0; // START's fill, and more of it under the mouse or a finger
    if (glow) {
        ctx.globalAlpha = glow;
        ctx.fillStyle = COLORS.cyan;
        ctx.fillRect(bx + 2, by + 2, b.w - 4, b.h - 4);
        ctx.globalAlpha = 1;
    }
    var size = parseInt(b.font, 10); // "30px Arial"
    ctx.textAlign = "center";
    ctx.font = b.font;
    ctx.fillStyle = glow ? COLORS.text : COLORS.magenta;
    ctx.fillText(b.text, bx + b.w / 2, by + b.h * 0.56, b.w - 16);
    ctx.font = Math.round(size * 0.6) + "px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(b.sub, bx + b.w / 2, by + b.h * 0.86, b.w - 16);
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    msgButtons.push({ name: b.button, left: W / 2 + s * bx, top: H / 2 + s * by, right: W / 2 + s * (bx + b.w),
        bottom: H / 2 + s * (by + b.h) });
}

function msgBottom() { // the lowest line queued so far, so another can be put under whatever a branch put up: a
    // line's baseline, or a button's foot
    var low = 0;
    for (let i = 0; i < msgBlock.length; i++) {
        low = Math.max(low, msgBlock[i].dy + (msgBlock[i].button ? msgBlock[i].h : msgBlock[i].drawing ? msgBlock[i].below : 0));
    }
    return low;
}

// The cleared level's results, under everything else on the screen and side by side, as a rhythm game's are: its beats
// broken down on the left, the rank they earned in the middle, and what it scored on the right. x is from the middle
// of the block, the two tables mirroring each other about the rank; the lines are placed from the grade's baseline
var RESULTS_LABEL_X = -490; // the breakdown: where its names start,
var RESULTS_COUNT_X = -275; // where its counts end,
var RESULTS_SHARE_X = -165; // and where its shares end
var RESULTS_RANK_X = 0; // the rank's middle
var RESULTS_SCORE_X = 165; // the score: where its names start,
var RESULTS_POINTS_X = 490; // and where its points end
var TIMING_SCALE_MS = 200; // the results' timing scale runs this far either side of the beat, as the calibration's does
var TIMING_SCALE_W = 300; // layout px from its middle to either end
var TIMING_BIN_MS = 10; // the presses are counted by this much of offset, and each count drawn as one cell of the heat map
var RESULTS_TOP = -95, RESULTS_BOTTOM = 50; // every column's first and last lines: over the grade, RANK, level with
                                            // the tables' headings; under it, the best, level with their last rows
var REACH_UP = 8; // a death's results: how far over the rank's baseline the figure for how far this attempt got sits,
var REACH_BEST_DY = 26; // the furthest-yet line under it, and the lives'
var REACH_LIVES_DOWN = 2; // row, its middle a little below the other columns' last lines to leave it room
var LIFE_OUT_MS = 900; // the life a death spent goes out over this long as its results come up
var LIFE_RESULTS = 1.25; // the lives drawn up to this much larger there than in the HUD, to stand with the column's
var LIFE_RESULTS_ROOM = 280; // lines, but never in a row longer than this, which keeps clear of the columns either side

function resultsLifeScale() { // the lives' size on a death's results
    return Math.min(LIFE_RESULTS, LIFE_RESULTS_ROOM / livesWidth(runLivesMax()));
}

function showTimingScale() { // queue the timing scale under whatever is up, if the attempt pressed inside the window
    // at all: a drawing, measured by the box it fills
    if (timings.length) {
        msgBlock.push({ drawing: drawTimingScale, x: 0, dy: msgBottom() + 70, w: 2 * TIMING_SCALE_W + 180, above: 48, below: 36 });
    }
}

function drawTimingScale(cx, ay) { // the scale, as the calibration's: a line from early to late with the beat in its
    // middle and the windows shaded either side of it, a heat map over it of where the attempt's presses landed --
    // each cell of TIMING_BIN_MS in the colour of what a press there earned, and brighter the more landed in it --
    // and a marker where they come to on average, as the line over it says in words
    var k = TIMING_SCALE_W / TIMING_SCALE_MS; // px a ms
    var at = function (ms) { return cx + Math.max(-TIMING_SCALE_MS, Math.min(TIMING_SCALE_MS, ms)) * k; };
    var grade = function (off) { // the colour of what a press this far off earns
        return off <= perfectMs() ? COLORS.cyan : off <= greatMs() ? COLORS.magenta : off <= goodMs() ? COLORS.text
            : COLORS.late;
    };
    [badMs(), goodMs(), greatMs(), perfectMs()].forEach(function (w) { // the windows, widest first, each over the last
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = grade(w);
        ctx.fillRect(at(-w), ay - 30, at(w) - at(-w), 30);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(cx - TIMING_SCALE_W, ay - 1, 2 * TIMING_SCALE_W, 2);
    ctx.font = "18px Arial";
    ctx.textAlign = "center";
    for (var ms = -TIMING_SCALE_MS; ms <= TIMING_SCALE_MS; ms += 50) {
        var major = ms % 100 == 0;
        ctx.fillStyle = ms == 0 ? COLORS.text : COLORS.dim;
        ctx.fillRect(at(ms) - 1, ay - (major ? 8 : 5), 2, major ? 16 : 10);
        if (major) {
            ctx.fillText(ms == 0 ? "BEAT" : (ms > 0 ? "+" : "") + ms, at(ms), ay + 30);
        }
    }
    ctx.font = "20px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.textAlign = "right";
    ctx.fillText("EARLY", cx - TIMING_SCALE_W - 12, ay + 7);
    ctx.textAlign = "left";
    ctx.fillText("LATE", cx + TIMING_SCALE_W + 12, ay + 7);
    ctx.textAlign = "center";
    var bins = {}, most = 0; // the presses by cell
    timings.forEach(function (t) {
        var b = Math.floor(Math.max(-TIMING_SCALE_MS, Math.min(TIMING_SCALE_MS - 1, t)) / TIMING_BIN_MS);
        bins[b] = (bins[b] || 0) + 1;
        most = Math.max(most, bins[b]);
    });
    for (var b in bins) {
        ctx.fillStyle = grade(Math.abs((Number(b) + 0.5) * TIMING_BIN_MS));
        ctx.globalAlpha = 0.3 + 0.7 * bins[b] / most;
        ctx.fillRect(at(Number(b) * TIMING_BIN_MS), ay - 28, TIMING_BIN_MS * k, 26);
    }
    ctx.globalAlpha = 1;
    if (timingCount >= 4) { // where they come to: a marker over them, in the average's colour
        var mx = at(timingSum / timingCount);
        ctx.fillStyle = timingColor();
        ctx.beginPath();
        ctx.moveTo(mx - 8, ay - 46);
        ctx.lineTo(mx + 8, ay - 46);
        ctx.lineTo(mx, ay - 34);
        ctx.closePath();
        ctx.fill();
    }
}

// FLAWLESS, under a clear's title when the attempt missed nothing, broke no combo and lost no shield (levelFlawless,
// loop.js). Worth no points: a flare, the word in the waves' two colours meeting in white, a streak of light through it,
// stamped in a moment after the results come up and glinting while they stay, where they are drawn every frame (with
// less motion, still)
var FLAWLESS_FONT = "bold 56px Arial";
var FLAWLESS_DY = 12; // its baseline, under the title's Japanese line
var FLAWLESS_NEXT = 52; // from its foot to the baseline of the line under it
var FLAWLESS_REACH = 120; // layout px the streak runs past the word at either end
var FLAWLESS_IN = 0.4, FLAWLESS_STAMP = 0.3; // seconds after the results come up that it stamps in, and how long that takes
var FLAWLESS_GLINT = 2.6, FLAWLESS_SWEEP = 0.7; // seconds from one glint to the next, and a glint's sweep across it

function showFlawless(dy) { // queue it: a drawing, measured by the word and its streak
    ctx.font = FLAWLESS_FONT;
    var w = ctx.measureText("FLAWLESS").width;
    msgBlock.push({ drawing: drawFlawless, x: 0, dy: dy, w: w + 2 * FLAWLESS_REACH, above: 48, below: 10 });
}

function drawFlawless(cx, ay) { // the flare, the word's baseline at ay, centred on cx
    var moving = fxLook() == "full", t = (Date.now() - resultsAt) / 1000 - FLAWLESS_IN;
    var k = moving ? Math.max(0, Math.min(1, t / FLAWLESS_STAMP)) : 1;
    if (k <= 0) {
        return; // not in yet
    }
    var ease = 1 - Math.pow(1 - k, 3);
    ctx.save();
    ctx.font = FLAWLESS_FONT;
    ctx.textAlign = "center";
    var w = ctx.measureText("FLAWLESS").width, my = ay - 20; // the word's middle, by its capitals
    ctx.translate(cx, my); // stamped: from half as big again, coming up to full
    ctx.scale(1 + 0.5 * (1 - ease), 1 + 0.5 * (1 - ease));
    ctx.translate(-cx, -my);
    ctx.globalAlpha = ease;
    var reach = w / 2 + FLAWLESS_REACH; // the streak, behind the word: cyan from the left, magenta from the right, white
    var streak = ctx.createLinearGradient(cx - reach, 0, cx + reach, 0); // where they meet
    streak.addColorStop(0, COLORS.cyan + "00");
    streak.addColorStop(0.35, COLORS.cyan + "aa");
    streak.addColorStop(0.5, COLORS.laserCore);
    streak.addColorStop(0.65, COLORS.magenta + "aa");
    streak.addColorStop(1, COLORS.magenta + "00");
    ctx.strokeStyle = streak;
    ctx.lineCap = "round";
    [[14, 0.12], [5, 0.3], [2, 0.9]].forEach(function (pass) { // haze, glow, core
        ctx.globalAlpha = ease * pass[1];
        ctx.lineWidth = pass[0];
        ctx.beginPath();
        ctx.moveTo(cx - reach, my);
        ctx.lineTo(cx + reach, my);
        ctx.stroke();
    });
    ctx.globalAlpha = ease;
    ctx.lineJoin = "round";
    ctx.lineWidth = 8; // a dark edge, so it reads over the backdrop and its own streak
    ctx.strokeStyle = COLORS.bg;
    ctx.strokeText("FLAWLESS", cx, ay);
    var fill = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    fill.addColorStop(0, COLORS.cyan);
    fill.addColorStop(0.5, COLORS.laserCore);
    fill.addColorStop(1, COLORS.magenta);
    ctx.shadowColor = COLORS.laserCore + "99";
    ctx.shadowBlur = 18;
    ctx.fillStyle = fill;
    ctx.fillText("FLAWLESS", cx, ay);
    ctx.shadowBlur = 0;
    var sweep = moving ? (t % FLAWLESS_GLINT) / FLAWLESS_SWEEP : 2; // a glint crossing the letters, now and then
    if (sweep < 1) {
        var gx = cx - w / 2 - 40 + sweep * (w + 80);
        var glint = ctx.createLinearGradient(gx - 36, 0, gx + 36, 0);
        glint.addColorStop(0, "#ffffff00");
        glint.addColorStop(0.5, "#ffffffee");
        glint.addColorStop(1, "#ffffff00");
        ctx.fillStyle = glint;
        ctx.fillText("FLAWLESS", cx, ay);
    }
    var star = moving ? Math.max(0, 1 - Math.abs(sweep - 1.05) * 3) : 0.6; // and a star where it leaves them
    if (star > 0) {
        ctx.globalAlpha = ease * star;
        drawSparkle(cx + w / 2 + 4, ay - 42, 16 * star);
    }
    ctx.restore();
}

function drawSparkle(sx, sy, r) { // a star of light, white as the glints are, reaching r from its middle: four points,
    // thin
    ctx.fillStyle = COLORS.laserCore;
    ctx.beginPath();
    ctx.moveTo(sx, sy - r);
    ctx.lineTo(sx + r * 0.18, sy - r * 0.18);
    ctx.lineTo(sx + r, sy);
    ctx.lineTo(sx + r * 0.18, sy + r * 0.18);
    ctx.lineTo(sx, sy + r);
    ctx.lineTo(sx - r * 0.18, sy + r * 0.18);
    ctx.lineTo(sx - r, sy);
    ctx.lineTo(sx - r * 0.18, sy - r * 0.18);
    ctx.closePath();
    ctx.fill();
}

// The rank comes up a moment after the results do, so there is a beat of not knowing: every grade stamps in as
// FLAWLESS does, from bigger, coming up to full, once FLAWLESS has landed (or would have: a level can be cleared FLAWLESS
// short of an S+, and an S or less without it), the best under it coming up with it. A plain grade (A down to F) stamps
// in its own colour and is still from there. The S ranks shine as FLAWLESS does, and the higher the more (SHINES): each
// printed as an S always was, lit by a glow, and glinting just after FLAWLESS does, as if the one light ran down the
// screen to it. An S+ has a white sheen drifting across its face, a star where its glint leaves it and a spark; an SS
// (every beat PERFECT and nothing lost: levelRank, loop.js) its face in the waves' two colours meeting in white, the
// white drifting, a larger star and three sparks, twinkling in turn, so it never quite settles. With less motion, the
// rank is there with the results, still
var RANK_IN = FLAWLESS_IN + FLAWLESS_STAMP + 0.1; // seconds after the results come up that the rank stamps in
var RANK_STAMP = 0.2; // how much bigger than full a plain grade stamps in from,
var RANK_PASSES = 3; // and its copies a pixel apart, that make it bold (as centerText's passes)
var SHINE_GLINT_LAG = 0.45; // seconds an S rank's glint follows FLAWLESS's
var SHINE_SHEEN = 3.5; // seconds a sheen takes to drift across and back,
var SHINE_SHEEN_REACH = 0.2, SHINE_SHEEN_W = 0.25; // how far either way of the middle it goes, and how far either side
// of it the colours come back, as shares of the width
var SHINE_EDGE = 5; // px: the dark edge round a face in the waves' colours, so its cyan end stands off the print's
var SHINE_TWINKLE = 0.5; // seconds a spark takes to come up and go
var SHINE_SPARKS = [[-0.56, 1.06, 1.0], [0.62, 0.5, 1.6], [-0.32, -0.08, 2.2]]; // the sparks, in the order a rank gets
// them: across, from its middle as a share of its half width; up, from its baseline as a share of its letters' height;
// and when in each round of the glint each twinkles, in seconds
var SHINE_SPARK_R = 14; // px: a spark at its brightest
const SHINES = { // by grade: face, its front ("print", magenta as printText's; "sheen", that with a white band drifting
    // across it; "prism", the waves' two colours meeting in white, the white drifting, edged dark); glow, px of white
    // light round it; stamp, how much bigger than full it stamps in from; star, px the star where its glint leaves it
    // reaches, or none; sparks, how many of SHINE_SPARKS twinkle round it
    S: { face: "print", glow: 8, stamp: 0.25, star: 0, sparks: 0 },
    "S+": { face: "sheen", glow: 12, stamp: 0.4, star: 14, sparks: 1 },
    SS: { face: "prism", glow: 18, stamp: 0.5, star: 18, sparks: 3 },
};

function rankIn() { // 0..1: how far the rank has stamped in, eased; with less motion, in at once
    if (fxLook() != "full") {
        return 1;
    }
    var k = Math.max(0, Math.min(1, ((Date.now() - resultsAt) / 1000 - RANK_IN) / FLAWLESS_STAMP));
    return 1 - Math.pow(1 - k, 3);
}

function showGrade(rank, dy, x) { // queue the rank's grade in the font set now: a drawing, measured by its print and
    // its sparks
    var m = ctx.measureText(rank.grade), font = ctx.font;
    msgBlock.push({ drawing: function (cx, ay) { drawGrade(rank, font, cx, ay); }, x: x, dy: dy,
        w: m.width + 2 * (PRINT_TRAIL + SHINE_SPARK_R + 8), above: m.actualBoundingBoxAscent + PRINT_TRAIL + 2 * SHINE_SPARK_R,
        below: m.actualBoundingBoxDescent + SHINE_SPARK_R });
}

function drawGrade(rank, font, cx, ay) { // the grade, its baseline at ay, centred on cx: stamping in, and shining if it
    // is an S (SHINES)
    var ease = rankIn();
    if (ease <= 0) {
        return; // not in yet
    }
    var text = rank.grade, shine = SHINES[text];
    var moving = fxLook() == "full", since = (Date.now() - resultsAt) / 1000, t = since - RANK_IN;
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    var m = ctx.measureText(text), w = m.width, h = m.actualBoundingBoxAscent, my = ay - h / 2;
    var grow = 1 + (shine ? shine.stamp : RANK_STAMP) * (1 - ease); // stamped: from bigger, coming up to full
    ctx.translate(cx, my);
    ctx.scale(grow, grow);
    ctx.translate(-cx, -my);
    ctx.globalAlpha = ease;
    if (!shine) { // a plain grade: in its own colour, bold, and nothing more
        ctx.fillStyle = rank.color;
        for (var p = 0; p < RANK_PASSES; p++) {
            ctx.fillText(text, cx + p, ay + p);
        }
        ctx.restore();
        return;
    }
    ctx.fillStyle = COLORS.cyan; // the print: its copies trailing up and left, as printText's
    for (var q = PRINT_TRAIL; q > 0; q--) {
        ctx.fillText(text, cx - q, ay - q);
    }
    var face = COLORS.magenta;
    if (shine.face != "print") { // the sheen: where the white is, drifting, and the colours either side of it
        var white = moving ? 0.5 + SHINE_SHEEN_REACH * Math.sin(2 * Math.PI * t / SHINE_SHEEN) : 0.5;
        var from = shine.face == "prism" ? COLORS.cyan : COLORS.magenta;
        face = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        face.addColorStop(0, from);
        face.addColorStop(white - SHINE_SHEEN_W, from);
        face.addColorStop(white, COLORS.laserCore);
        face.addColorStop(white + SHINE_SHEEN_W, COLORS.magenta);
        face.addColorStop(1, COLORS.magenta);
    }
    if (shine.face == "prism") {
        ctx.lineJoin = "round";
        ctx.lineWidth = SHINE_EDGE;
        ctx.strokeStyle = COLORS.bg;
        ctx.strokeText(text, cx, ay);
    }
    ctx.shadowColor = COLORS.laserCore + "99";
    ctx.shadowBlur = shine.glow;
    ctx.fillStyle = face;
    ctx.fillText(text, cx, ay);
    ctx.shadowBlur = 0;
    var round = since - FLAWLESS_IN - SHINE_GLINT_LAG; // FLAWLESS's glints' clock, a little behind
    var sweep = moving && round >= 0 ? (round % FLAWLESS_GLINT) / FLAWLESS_SWEEP : 2;
    if (sweep < 1) { // the glint, leaning as it crosses
        var gx = cx - w / 2 - 40 + sweep * (w + 80);
        var glint = ctx.createLinearGradient(gx - 22, ay, gx + 22, ay - h * 0.45);
        glint.addColorStop(0, "#ffffff00");
        glint.addColorStop(0.5, "#ffffffee");
        glint.addColorStop(1, "#ffffff00");
        ctx.fillStyle = glint;
        ctx.fillText(text, cx, ay);
    }
    var star = moving ? Math.max(0, 1 - Math.abs(sweep - 1.05) * 3) : 0.6; // a star where it leaves them
    if (shine.star && star > 0) {
        ctx.globalAlpha = ease * star;
        drawSparkle(cx + w / 2 + 6, ay - h - 4, shine.star * star);
    }
    if (moving) { // and the sparks, each twinkling once a round, in turn
        SHINE_SPARKS.slice(0, shine.sparks).forEach(function (s) {
            var at = round >= 0 ? (round + FLAWLESS_GLINT - s[2]) % FLAWLESS_GLINT : -1;
            var lit = at >= 0 ? Math.max(0, 1 - Math.abs(at - SHINE_TWINKLE / 2) * 2 / SHINE_TWINKLE) : 0;
            if (lit > 0) {
                ctx.globalAlpha = ease * lit;
                drawSparkle(cx + s[0] * w / 2, ay - s[1] * h, SHINE_SPARK_R * lit);
            }
        });
    }
    ctx.restore();
}

function showResults() { // the three columns, under whatever the screen has put up so far
    var dy = msgBottom() + 160;
    showBreakdown(dy);
    showRank(dy);
    showScore(dy);
}

function shareTexts(counts) { // the counts as whole percentages of their total that add up to 100, as a breakdown's
    // should: each rounded down, then the points that leaves over handed to the ones rounded down furthest. None shows
    // 0% while it has any, which would read as none at all: it takes 1% from the largest, which can spare it
    var total = counts.reduce(function (sum, n) { return sum + n; }, 0);
    var p = counts.map(function (n) { return Math.floor(100 * n / total); });
    var cut = counts.map(function (n) { return 100 * n % total; }); // what rounding down cut off, exactly, so a tie
                                                                     // goes to the one listed first
    var over = 100 - p.reduce(function (sum, v) { return sum + v; }, 0);
    counts.map(function (n, i) { return i; })
        .sort(function (a, b) { return cut[b] - cut[a]; })
        .slice(0, over).forEach(function (i) { p[i]++; });
    counts.forEach(function (n, i) {
        if (n > 0 && p[i] == 0) {
            p[p.indexOf(Math.max.apply(null, p))]--;
            p[i] = 1;
        }
    });
    return p.map(function (v) { return v + "%"; });
}

function showBreakdown(dy, judged) { // how the level's beats went, which is what its rank is worked out from: the
    // longest combo of them against how many there were (or, after a death, how many the attempt got through:
    // `judged`), then a row for each way a beat can go, with how many went that way and what share
    var beats = judged === undefined ? playBeats() : judged;
    if (beats <= 0) {
        return; // nothing judged, nothing to break down
    }
    var rows = [["PERFECT", perfects, COLORS.cyan], ["GREAT", greats, COLORS.magenta], ["GOOD", goods, COLORS.text],
        ["BAD", bads, COLORS.late], ["MISS", beats - perfects - greats - goods - bads, COLORS.dim]]; // every other
        // beat: gone by unhit, or spent WRONG or OFF TARGET
    var shares = shareTexts(rows.map(function (row) { return row[1]; }));
    var pitch = (RESULTS_BOTTOM + 30 - RESULTS_TOP) / rows.length; // five rows against the other columns' three: they
    // run on a little under them, in a smaller face
    var heading = "MAX COMBO " + bestCombo + " / " + beats, tier = rankFor(bestCombo / beats); // the column's heading,
    // in the colour the rank's scale gives that share of the beats: one combo through them all is an S's, printed as
    // the title is
    ctx.font = "30px Arial";
    if (tier.color) {
        ctx.fillStyle = tier.color;
        columnText(heading, RESULTS_LABEL_X, dy + RESULTS_TOP, "left");
    } else {
        columnPrint(heading, RESULTS_LABEL_X, dy + RESULTS_TOP, "left", COMBO_TRAIL);
    }
    rows.forEach(function (row, i) {
        var at = dy + RESULTS_TOP + (i + 1) * pitch;
        ctx.font = "bold 26px Arial";
        ctx.fillStyle = row[2];
        columnText(row[0], RESULTS_LABEL_X, at, "left");
        ctx.font = "26px Arial";
        ctx.fillStyle = COLORS.text;
        columnText(String(row[1]), RESULTS_COUNT_X, at, "right");
        ctx.fillStyle = COLORS.dim;
        columnText(shares[i], RESULTS_SHARE_X, at, "right");
    });
}

function showRank(dy) { // the cleared level's rank, large, stamping in a moment after the results come up: an S, an S+
    // or an SS printed as the title is and shining over that, the rest in their own colour (drawGrade). Under it, coming
    // up with it, the best this level has had (recordLevel has taken this one)
    var rank = levelRank();
    var best = bossRush ? rec().rushRank[level] : rec().rank[level]; // the boss rush's own, in the rush
    ctx.font = "30px Arial";
    ctx.fillStyle = COLORS.dim;
    centerText("RANK ランク", dy + RESULTS_TOP, 1, RESULTS_RANK_X);
    ctx.font = "100px Arial";
    showGrade(rank, dy, RESULTS_RANK_X);
    if (practice) { // nothing kept: what was practised, in its place, made smaller to keep clear of the columns
        var said = practiceTitle(), room = RESULTS_SCORE_X - RESULTS_SHARE_X - 40; // either side ("LEVEL 14  GREEN
        ctx.font = "22px Arial"; // FLASH  FROM BAR 8" is too long for them at full size)
        var wide = ctx.measureText(said).width;
        if (wide > room) {
            ctx.font = Math.floor(22 * room / wide) + "px Arial";
        }
        ctx.fillStyle = COLORS.dim;
        centerText(said, dy + RESULTS_BOTTOM, 1, RESULTS_RANK_X);
        return;
    }
    ctx.font = "30px Arial";
    var bestLine = gradeRecord ? "NEW BEST" : "best " + best, tone = gradeRecord ? COLORS.good : COLORS.text;
    msgBlock.push({ drawing: function (cx, ay) { // as the rank lands: nothing told of it before it is shown
        ctx.save();
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.globalAlpha = rankIn();
        ctx.fillStyle = tone;
        ctx.fillText(bestLine, cx, ay);
        ctx.restore();
    }, x: RESULTS_RANK_X, dy: dy + RESULTS_BOTTOM, w: ctx.measureText(bestLine).width, above: 24, below: 8 });
}

function showScore(dy, dead) { // what the level scored, the breakdown's mirror: its points (on a boss level, what the
    // boss paid of them on a line of its own), then on a run the run's TOTAL with them and the most a run has had (NEW
    // BEST when that is this one, as the rank's best says under it, after a death too, the run's points being kept), or,
    // from the level select, the most the level has been cleared with on its own (NEW BEST when that is these; after a
    // death it is just shown)
    var rows = [[practice ? "POINTS" : "LEVEL " + level, score, ""]];
    if (!dead && bossBonusWon > 0) { // of the level's points, what the boss paid (bossBonus, boss.js)
        rows.push(["BOSS", "+" + bossBonusWon, "boss"]);
    }
    if (practice) { // nothing kept to set them against: the hits shields would have paid for instead, and the most this
        // setup has scored this session (practice.js), NEW BEST when that is these
        rows.push(["HITS", practiceHits, practiceHits ? "hit" : "top"]);
        rows.push([practiceNewBest() ? "NEW BEST" : "SESSION BEST", practiceBestText(), practiceNewBest() ? "top" : ""]);
    } else if (selectRun) {
        var best = rec().score[level];
        rows.push([!dead && scoreRecord ? "NEW BEST" : "BEST", best === undefined ? "-" : best, !dead && scoreRecord ? "top" : ""]);
    } else {
        rows.push(["TOTAL", runScore + score, "total"]);
        rows.push([runRecord ? "NEW BEST" : bossRush ? "BEST RUSH" : "BEST RUN", // a rush's against a rush's
            (bossRush ? rec().rushScore : rec().runScore) || "-", runRecord ? "top" : ""]);
    }
    var pitch = (RESULTS_BOTTOM - RESULTS_TOP) / rows.length;
    ctx.font = "30px Arial";
    ctx.fillStyle = COLORS.dim;
    columnText("SCORE スコア", RESULTS_SCORE_X, dy + RESULTS_TOP, "left");
    rows.forEach(function (row, i) {
        var at = dy + RESULTS_TOP + (i + 1) * pitch;
        var total = row[2] == "total"; // the one that matters most, set apart
        var top = row[2] == "top"; // a new best, in the colour the other new bests are in
        var bonus = row[2] == "boss"; // and the boss's bonus, in its colour
        var hit = row[2] == "hit"; // and practice's hits, in the laser's
        ctx.font = "bold 30px Arial";
        ctx.fillStyle = top ? COLORS.good : total ? COLORS.text : hit ? COLORS.warn : COLORS.dim;
        columnText(row[0], RESULTS_SCORE_X, at, "left");
        ctx.font = (total ? "bold 36px" : "30px") + " Arial";
        ctx.fillStyle = top ? COLORS.good : total ? COLORS.cyan : bonus ? COLORS.laser : hit ? COLORS.warn : COLORS.text;
        columnText(String(row[1]), RESULTS_POINTS_X, at, "right");
    });
}

function showMessage(panel) { // draw the queued lines centred and as large as this screen allows, and return that
    // scale; panel, if given, is how far a backing panel reaches past them, for a message over a level
    msgButtons = [];
    if (!msgBlock.length) {
        return 1;
    }
    var pad = panel || 0;
    var left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (let i = 0; i < msgBlock.length; i++) {
        var line = msgBlock[i];
        if (line.button) { // a box: its own edges
            left = Math.min(left, line.x - line.w / 2);
            right = Math.max(right, line.x + line.w / 2);
            top = Math.min(top, line.dy);
            bottom = Math.max(bottom, line.dy + line.h);
            continue;
        }
        if (line.drawing) { // a drawing (the timing scale, a death's lives): the box it says it fills, above and below
            // its baseline
            left = Math.min(left, line.x - line.w / 2);
            right = Math.max(right, line.x + line.w / 2);
            top = Math.min(top, line.dy - line.above);
            bottom = Math.max(bottom, line.dy + line.below);
            continue;
        }
        ctx.font = line.font;
        var m = ctx.measureText(line.text);
        var start = line.x - m.width * LEFT_OF_X[line.align]; // where the line begins
        left = Math.min(left, start - (line.trail || 0)); // a print's trail reaches up and left, as far as it is long
        right = Math.max(right, start + m.width + line.passes - 1); // the bold passes reach 1px further for each repeat
        top = Math.min(top, line.dy - m.actualBoundingBoxAscent - (line.trail || 0));
        bottom = Math.max(bottom, line.dy + m.actualBoundingBoxDescent + line.passes - 1);
    }
    var s = fitBand(right - left + 2 * pad, bottom - top + 2 * pad);
    var dx = -(left + right) / 2;
    var dy = -(top + bottom) / 2; // the lines sit mostly above their baseline, so the block has to come down to the middle
    ctx.setTransform(s, 0, 0, s, gameArea.canvas.width / 2, gameArea.canvas.height / 2);
    if (pad) {
        ctx.fillStyle = COLORS.panel;
        var pw = right - left + 2 * pad, ph = bottom - top + 2 * pad; // the block is centred on the origin now
        ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
    }
    for (let i = 0; i < msgBlock.length; i++) {
        var l = msgBlock[i];
        if (l.button) {
            drawMsgButton(l, dx, dy, s);
            continue;
        }
        if (l.drawing) {
            l.drawing(dx + l.x, dy + l.dy);
            continue;
        }
        ctx.font = l.font;
        ctx.textAlign = l.align;
        if (l.trail) { // a printed line: the copies trailing up and left first, then the line over them
            ctx.fillStyle = l.print;
            for (let q = l.trail; q > 0; q--) {
                ctx.fillText(l.text, dx + l.x - q, l.dy + dy - q);
            }
        }
        ctx.fillStyle = l.fill;
        for (let p = 0; p < l.passes; p++) {
            ctx.fillText(l.text, dx + l.x + p, l.dy + dy + p);
        }
    }
    ctx.textAlign = "start"; // the rest of the game draws left-aligned text
    msgBlock.length = 0;
    return s;
}

// A cleared level's results wait for the player. CONTINUE adds the level's score to the run's total and goes on to the
// next level, or after the last to the finish; RETRY plays the level again from nothing, and the total doesn't take
// this attempt's points. Neither takes a press for the first RESULTS_GRACE_MS, so a press held or mashed as the level
// ends can't skip them unseen, and the time they are up is left off the run's clock, as a pause's is.
var RESULTS_GRACE_MS = 1000;
var resultsUp = false; // a level's results are showing: a clear's, a death's, or the game over's
var resultsKind = "clear"; // which: "clear", "death" (a life spent, the level again on offer) or "over" (none left)
var resultsAt = 0; // when they came up
var resultsSky = 0, resultsClock = 0, resultsFrame = 0; // the level's backdrop moves on behind them: the second it had
    // reached, when (performance.now()) the results came up, and the frame that draws them again over it
var resultsHover = ""; // the button under the mouse, or under a finger held on it
var resultsArmed = false; // a mouse press began on them once they could take one
const RESULT_BUTTONS = { // by the results' kind, left to right: where each sits (-1 left, 1 right), and the line under
    // its label, which is its keys at a keyboard and its name in Japanese otherwise. The way on is lit as START is
    clear: { retry: { side: -1, label: "RETRY", keys: "R", jp: "リトライ" },
        next: { side: 1, label: "CONTINUE", keys: "ENTER / SPACE", jp: "次へ", primary: true } },
    death: { quit: { side: -1, label: "QUIT", keys: "Q", jp: "終了" },
        again: { side: 1, label: "TRY AGAIN", keys: "ENTER / R", jp: "リトライ", primary: true } },
    over: { quit: { side: -1, label: "QUIT", keys: "Q", jp: "終了" },
        again: { side: 1, label: "PLAY AGAIN", keys: "ENTER / R", jp: "もう一度", primary: true } },
};

function resultButtons() { // the buttons the results up have: a clear's way on is CONTINUE, or after a level played
    // from the level select, LEVELS, which is where it goes, and after practice PRACTICE, with AGAIN for RETRY
    var buttons = RESULT_BUTTONS[resultsKind];
    if (resultsKind == "clear" && practice) {
        return { retry: { side: -1, label: "AGAIN", keys: "R", jp: "もう一度" },
            next: { side: 1, label: "PRACTICE", keys: "ENTER / SPACE", jp: "練習", primary: true } };
    }
    if (resultsKind == "clear" && selectRun) {
        return { retry: buttons.retry, next: { side: 1, label: "LEVELS", keys: "ENTER / SPACE", jp: "レベル", primary: true } };
    }
    return buttons;
}

function resultPrimary() { // the way on: the button a controller lights first, and START presses
    var buttons = resultButtons();
    for (var name in buttons) {
        if (buttons[name].primary) {
            return name;
        }
    }
    return "";
}

function resultForKey(key) { // the button a key presses on the results up, or "": a clear's R is RETRY and its ENTER
    // or SPACE CONTINUE; a death's or the game over's R, ENTER or SPACE is the way on, and Q is QUIT
    if (resultsKind == "clear") {
        return key == "r" ? "retry" : key == "Enter" || key == " " ? "next" : "";
    }
    return key == "q" ? "quit" : key == "r" || key == "Enter" || key == " " ? "again" : "";
}

function raiseResults(kind) { // the level ended: its results come up, of the kind, and wait
    resultsKind = kind;
    resultsUp = true;
    resultsAt = Date.now();
    resultsHover = "";
    resultsArmed = false;
    resultsSky = wave ? beatPos * msPerBeat() / 1000 : 0; // the backdrop carries on from where the level left it
    resultsClock = performance.now();
    if (kind == "clear") {
        playSound(aud_menuSound);
        var flawless = levelFlawless(); // a new best, or a FLAWLESS, rings as it is said (sfx.js): a run's, the level
        if (flawless || gradeRecord || scoreRecord || runRecord // select's, or practice's when it beat one it had
            || practice && practiceRun.from > 0 && practiceNewBest()) {
            var ring = flawless ? FLAWLESS_IN : gradeRecord && fxLook() == "full" ? RANK_IN + FLAWLESS_STAMP // a best
                : REWARD_DELAY; // grade's as it lands, not before it is shown
            playSfx(sfxReward, ring, SFX_LEVELS.reward, { key: actSong(level).key, flawless: flawless });
        }
    } else if (kind == "over") { // and the game over, as the tube goes off
        playSfx(sfxGameOver, 0, SFX_LEVELS.gameOver);
    }
    if (kind == "over" || kind == "clear" && selectRun) { // a run or a rush over, or a level from the select cleared: its
        onlineOffer(kind == "over" ? "over" : "level"); // name asked for, if the score makes its board (online.js)
    }
    drawResultsScreen();
    cancelAnimationFrame(resultsFrame);
    if (fxLook() == "full") { // the backdrop moves, so they are drawn again every frame; with less motion it is still
        resultsFrame = requestAnimationFrame(resultsStep);
    }
}

function resultsSkyTime() { // the second the backdrop is at behind the results
    return resultsSky + (performance.now() - resultsClock) / 1000;
}

function resultsStep() { // each frame while they are up: the backdrop has moved, so draw them again over it
    if (!resultsUp) {
        return;
    }
    drawResultsScreen();
    resultsFrame = requestAnimationFrame(resultsStep);
}

function drawResultsScreen() { // drawn as they come up, and again on a resize, a hover or a change of input
    if (resultsKind != "clear") {
        drawDeathResults();
        return;
    }
    drawSky(level, resultsSkyTime(), null, SKY_RESULTS); // the level's backdrop, moving on and dimmed, behind them:
    // the ground as well
    ctx.font = "80px Arial";
    printText(practice ? "Practice" : "Level " + level + " Clear", -175);
    ctx.font = "60px Arial";
    printText(practice ? "練習" : "クリア", -75);
    var next = 0; // the line under the title
    if (levelFlawless()) { // no miss, one combo through every beat, no hit: said, and worth nothing more
        showFlawless(FLAWLESS_DY);
        next = msgBottom() + FLAWLESS_NEXT;
    }
    if (timingText()) { // how the presses sat against the beat, under the title
        ctx.font = "30px Arial";
        ctx.fillStyle = timingColor();
        centerText(timingText(), next);
    }
    showTimingScale(); // and where every one of them landed, under that
    showResults();
    showResultButtons();
    showMessage();
    useWindow();
    ctx.fillStyle = COLORS.magenta;
    drawBanners(40, 20, bannerScale());
}

function showResultButtons() { // RETRY and CONTINUE, side by side under the results: finger-sized by touch
    var touch = inputMode == "touch";
    var w = touch ? 360 : 300, h = touch ? 100 : 76;
    var top = msgBottom() + 50;
    ctx.font = (touch ? 40 : 30) + "px Arial";
    var buttons = resultButtons();
    for (var name in buttons) {
        var b = buttons[name];
        buttonText(name, b.label, inputMode == "mouse" ? b.keys : b.jp, b.side * (w / 2 + 20), top, w, h,
            resultsHover == name, b.primary);
    }
}

function resultsReady() { // up, and past the moment a stray press could skip them
    return resultsUp && Date.now() - resultsAt >= RESULTS_GRACE_MS;
}

function resultButtonAt(px, py) { // the button at a window point, "retry" or "next", or ""
    return resultsUp ? msgButtonAt(px, py) : "";
}

function setResultsHover(name) { // light the button under the mouse or a finger, and put out the last
    if (resultsUp && name != resultsHover) {
        resultsHover = name;
        drawResultsScreen();
    }
}

function chooseResult(name) { // a button on the results: a clear's CONTINUE ("next") or RETRY ("retry"), a death's
    // TRY AGAIN or the game over's PLAY AGAIN ("again"), or QUIT ("quit")
    if (!resultsReady()) {
        return;
    }
    resultsUp = false;
    cancelAnimationFrame(resultsFrame);
    resultsHover = "";
    playSound(aud_click);
    startTime += Date.now() - resultsAt; // off the run's clock
    if (name == "quit") {
        endRun();
    } else if (resultsKind == "death") { // the level again, from full shields: on a run with its points kept, which the
        // life spent paid for; from the level select, which has no lives, from nothing, as the pause's RETRY, so its
        // best score is always one attempt's
        if (selectRun || practice) {
            score = 0;
        }
        startNextLevel();
    } else if (resultsKind == "over") { // the run again, from where it began
        restartRun();
    } else {
        if (name == "next" && (selectRun || practice)) { // a level played from the level select ends here: back to the
            endRun(); // select, its bests recorded; and practice back to the practice screen
            return;
        }
        if (name == "next") { // on to the next level, with the shields, the charge and the combo this one left
            carryHp = hp;
            carryMeter = drive.start === null ? drive.meter : 0;
            carryCombo = combo;
            runScore += score; // the run's total (recorded at the clear, recordRunScore)
            level = bossRush ? rushNext(level) : level + 1; // in the boss rush, the next boss
        }
        score = 0; // the next level, or this one again, starts from nothing
        if (name == "retry") {
            startNextLevel();
        } else if (level > RUN_LEVELS) { // the last one past: the epilogue and the finish, or the rush's finish
            if (bossRush) {
                showFinish();
            } else {
                showEpilogue(showFinish);
            }
        } else {
            enterLevel();
        }
    }
}

function showFinish() { // the last level continued past: the run's time and its total, until a click or R
    var runMs = Date.now() - startTime;
    var full = runFrom == 1 || bossRush; // only a run from the first level can set the best run; a rush is always whole
    var runBest = full && (bossRush ? recordRush(runMs, deaths) : recordRun(runMs, deaths));
    restFrame = null; // a resize copies this screen, not the results under it
    gameArea.clear();
    playSfx(sfxFinale, 0, SFX_LEVELS.finale); // the finale (sfx.js)
    onlineOffer("finish"); // and the name asked for, if the total makes its board (online.js)
    ctx.font = "80px Arial";
    if (deaths == 0) {
        printText(bossRush ? "Flawless Boss Rush" : "Flawless Victory", -175);
    } else {
        printText(bossRush ? "Boss Rush Clear" : "You continued.", -175);
        ctx.font = "60px Arial";
        printText("It cost you " + mistakes(deaths) + ".", -87);
    }
    ctx.font = "60px Arial";
    printText("Time: " + millisToMinutesAndSeconds(runMs), 0);
    ctx.font = "30px Arial";
    if (full) {
        ctx.fillStyle = runBest ? COLORS.good : COLORS.text;
        centerText(runBest ? "NEW BEST" : "best " + millisToMinutesAndSeconds(bossRush ? rec().rush : rec().run)
            + "   " + mistakes(bossRush ? rec().rushDeaths : rec().runDeaths), 45);
    } else {
        ctx.fillStyle = COLORS.dim;
        centerText("from Level " + runFrom + ": the best run is one from Level 1", 45);
    }
    ctx.font = "60px Arial";
    printText("Total score: " + runScore, msgBottom() + 100);
    ctx.fillStyle = COLORS.text;
    var again = bossRush ? "play the boss rush again" : "play again" + (runFrom == 1 ? "" : " from Level " + runFrom); //
    // this run again, from where it began
    if (inputMode == "touch") {
        ctx.font = "40px Arial";
        centerText("Tap to " + again, msgBottom() + 70);
    } else if (inputMode == "pad") {
        ctx.font = "30px Arial";
        centerText("Press A to " + again, msgBottom() + 60);
    } else {
        ctx.font = "30px Arial";
        centerText("Click or press R to " + again, msgBottom() + 60);
    }
    showMessage();
    runFinished = true;
    finishTime = Date.now();
    restartArmed = false; // a click already in progress shouldn't restart
    useWindow();
}

function stopLevel() { // the level stops where it stands, however it ended: the loop, the lasers, the effects
    notePracticeScore(); // a practice attempt's points, a press since the last step's included, before anything clears them
    gameArea.stop();
    alive = false;
    endLevel(); // the game's own teardown
    gameArea.clear();
    clearObjects();
    fxReset();
    gameArea.canvas.style.cursor = "default";
}

function leavePause() { // the pause ends some other way than resuming: its time still comes off the run's clock
    cancelResume();
    startTime += Date.now() - pauseStart;
    pause = false;
    pauseHover = "";
}

function retryLevel() { // RETRY, from the pause: the level again from its start, keeping nothing. It isn't a death:
    // it costs the run the time it took, and that's all
    leavePause();
    stopLevel();
    score = 0;
    startNextLevel();
}

function quitRun() { // QUIT, from the pause: the run ends, unrecorded, and the start screen comes back
    leavePause();
    endRun();
}

function endRun() { // the run ends, unrecorded, from the pause's QUIT or the results': the start screen comes back,
    // or the level select, for a run that came from it
    stopLevel();
    gameStart = false; // so the next START is a first start again: a new run, its lives and its clock
    level = 1;
    deaths = 0;
    score = 0;
    runScore = 0;
    bossRush = false;
    carryHp = carryMeter = carryCombo = null;
    restFrame = null;
    hoveredButton = "";
    startMenuTimers();
    updateSloganText(); // which draws the start screen
    if (practice) { // practice: back to the practice screen, as it was left
        practice = false;
        openMenu("practice");
    } else if (selectRun) { // the run came from the level select: back to it, with any bests it just set
        openMenu("levels");
    }
    themeSync(); // the menus' theme, from the top
}

function gameOver() { // the level was cleared or the player died
    var levelCleared = levelComplete();
    if (!practice && !selectRun) { // the run's combo at its longest so far, against the longest a full run or a rush
        recordRunCombo(runPeakCombo); // has had (run.js)
    }
    var picture = levelCleared ? null : deathPicture(); // the hit as it stands, before the level is cleared away
    stopLevel();
    if (levelCleared) {
        if (practice) { // nothing to record
            gradeRecord = scoreRecord = runRecord = false;
        } else if (bossRush) { // the rush's own records: the boss's rank in it, and the rush's total
            recordRushLevel(level);
            runRecord = recordRushScore(runScore + score);
        } else {
            recordLevel(level); // its rank, and from the level select its score
            runRecord = !selectRun && recordRunScore(runScore + score); // on a run, its total so far against the most a run has had
        }
        raiseResults("clear"); // which keep its score up until CONTINUE banks it or RETRY lets it go
        return;
    }
    deaths += 1;
    runRecord = !practice && !selectRun // a run's total, or a rush's, stands at a death too, its points kept: against the
        && (bossRush ? recordRushScore(runScore + score) : recordRunScore(runScore + score)); // most one has scored
    reachRecord = !practice && !bossRush && recordReach(level, deathProgress); // the furthest an attempt has got, while the
    // level is unbeaten (on a run, or from the level select: the rush's deaths leave the level's records alone)
    playSound(aud_death);
    var kind = "over"; // none left: the run is over
    if (selectRun || practice) { // a level from the level select has no lives (runLivesMax, run.js): a death offers it
        kind = "death"; // again, as often as it takes, and is never the game over (and practice can't die at all)
    } else if (runLives > 0) { // a life buys the level again, its points kept: the death's results say so, and wait
        runLives--; // for TRY AGAIN
        kind = "death";
    }
    var results = function () { raiseResults(kind); };
    if (picture) { // the death animation first (death.js), then them
        startDeathAnim(picture, results);
    } else {
        results();
    }
}

function drawDeathResults() { // a death's results, over the level's backdrop, still and dimmed: how far the attempt
    // got, where its presses landed, its beats so far and its points, the lives left (on a run), and TRY AGAIN or QUIT;
    // or, with none left, the game over, and PLAY AGAIN or QUIT
    var over = resultsKind == "over";
    drawSky(level, resultsSkyTime(), null, SKY_RESULTS);
    ctx.font = "64px Arial"; // the level, by number and name, and under it FAIL with its Japanese, or So Close for an
    printText("Level " + level + "  " + levelDef(level).name, -175); // attempt that nearly made it
    var close = !over && deathProgress >= 0.9;
    ctx.font = "72px Arial";
    printText(close ? "So Close  再試行する" : "FAIL  失敗", -80);
    if (perfFailed) { // the performance meter failed the track, not a laser: said, as it was over the death
        ctx.font = "bold 26px Arial";
        ctx.fillStyle = COLORS.warn;
        centerText("PERFORMANCE METER EMPTY", -36);
    }
    if (timingText()) {
        ctx.font = "30px Arial";
        ctx.fillStyle = timingColor();
        centerText(timingText(), 0);
    }
    showTimingScale(); // and where every one of them landed, as a clear's results show it
    var dy = msgBottom() + 160;
    showBreakdown(dy, Math.max(0, nextJudge - firstPlayBeat(), perfects + greats + goods + bads)); // the beats it got
    // through: judged by then, and any hit early on top
    showReached(dy, over);
    showScore(dy, true);
    showResultButtons();
    showMessage();
    useWindow();
    ctx.fillStyle = over ? COLORS.warn : COLORS.magenta;
    drawBanners(40, 20, bannerScale());
}

function showReached(dy, over) { // in the rank's place: how far through the level the attempt got (on a boss level, how
    // far the boss was worn down: at full health it is 0%), and the lives left
    ctx.font = "30px Arial";
    ctx.fillStyle = COLORS.dim;
    centerText("REACHED 到達", dy + RESULTS_TOP, 1, RESULTS_RANK_X);
    ctx.font = "84px Arial"; // a little under the rank's 100px: a figure runs wider than a letter. Its baseline a little
    ctx.fillStyle = COLORS.text; // over the rank's, so it sits midway between the heading and the line under it; white
    centerText(Math.round(deathProgress * 100) + "%", dy - REACH_UP, 3, RESULTS_RANK_X); // on a game over too: the
    // banners carry the red
    var far = rec().reach[level]; // the furthest an attempt has got while the level is unbeaten (recordReach has this one)
    if (reachRecord) { // this one got further than any before: under it, as the rank's new best is
        ctx.font = "bold 22px Arial";
        ctx.fillStyle = COLORS.good;
        centerText("NEW BEST", dy + REACH_BEST_DY, 1, RESULTS_RANK_X);
    } else if (far !== undefined && far > deathProgress) { // or the furthest one before, in the same terms
        ctx.font = "22px Arial";
        ctx.fillStyle = COLORS.text;
        centerText("best " + Math.round(far * 100) + "%", dy + REACH_BEST_DY, 1, RESULTS_RANK_X);
    }
    if (runLivesMax() > 0) { // the lives, as the HUD shows them (drawLife, hud.js): all of them spent on a game over;
        // none from the level select, which has none
        msgBlock.push({ drawing: drawLivesLeft, x: RESULTS_RANK_X, dy: dy + RESULTS_BOTTOM + REACH_LIVES_DOWN,
            w: livesWidth(runLivesMax()) * resultsLifeScale(), above: 9 * resultsLifeScale(), below: 9 * resultsLifeScale() });
    }
}

function drawLivesLeft(cx, cy) { // a death's lives, centred on (cx, cy): lit while they last, dim once spent, and the one
    // this death spent going out as the results come up, where they are drawn again every frame (with less motion,
    // already out)
    var n = runLivesMax();
    var out = fxLook() == "full" ? Math.min(1, (Date.now() - resultsAt) / LIFE_OUT_MS) : 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(resultsLifeScale(), resultsLifeScale());
    for (var i = 0; i < n; i++) {
        drawLife(i * (LIFE_W + LIFE_GAP) - livesWidth(n) / 2, 0,
            i < runLives ? 1 : resultsKind == "death" && i == runLives ? 1 - out : 0);
    }
    ctx.restore();
}
