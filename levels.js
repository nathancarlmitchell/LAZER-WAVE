// Lazer Wave -- a level's beginning and its end. startGame and the touch start that seeds it, the way into a level the
// run hasn't played (its act's story and its card, story.js), the wait after a death, a cleared level's results and
// the CONTINUE and RETRY they wait on, the epilogue and the finish, the restart from it, the message block that lays
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
    startTime = Date.now();
    startRunLives(); // the difficulty is locked in from here: its button only lives on the start screen
    gamePiece = new component(PIECE_SIZE, PIECE_SIZE, COLORS.piece, e.pageX - PIECE_SIZE / 2, e.pageY - PIECE_SIZE / 2); // centered on the cursor
    gamePiece.update = function () { drawPlayer(this); };
    gameStart = true;
    runFrom = level;
    enterLevel();
}

function startRunAt(n, p) { // the level select: a run from level n, started as START starts one for the input in use
    // (p: where the pointer was, for the mouse's piece)
    menuScreen = ""; // it goes without being drawn again: the story comes up over it
    hoveredButton = "";
    level = n;
    if (inputMode == "touch") {
        startTouchGame();
    } else if (inputMode == "pad") {
        startPadGame();
    } else {
        startGame({ pageX: p ? p.x : gameArea.canvas.width / 4, pageY: p ? p.y : gameArea.canvas.height / 2 });
    }
}

function enterLevel() { // the run comes to a level it hasn't played: the story of the act it opens, if it opens one,
    // then its card, then the level. A death or a retry comes back to it without them (startNextLevel)
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
    levelStart = Date.now(); // the split clock; startTime runs across the whole run, skipping pauses
    levelBeat = 0;
    reachedLevel(level);
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
    if (!document.hasFocus()) { // player left during the level transition; wait for them
        setPause(true);
    }
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

function wait(time) {
    setTimeout(startNextLevel, time);
}

function restartRun() { // after the finish screen, start a fresh run from where this one began, and its story
    runFinished = false;
    restartArmed = false;
    level = runFrom;
    deaths = 0;
    score = 0;
    runScore = 0;
    startRunLives();
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

function printText(text, dy, x) { // queue a line printed as the title is: cyan copies trailing up and left, a pixel
    // apart, and magenta over them, in the font set now, centred x from the block's middle (on it, by default)
    msgBlock.push({ text: text, x: x || 0, align: "center", dy: dy, passes: 1, font: ctx.font, fill: COLORS.magenta,
        print: COLORS.cyan, trail: PRINT_TRAIL });
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
        low = Math.max(low, msgBlock[i].dy + (msgBlock[i].button ? msgBlock[i].h : 0));
    }
    return low;
}

function showSplit(dy) { // the level's time, and what it was before, on every cleared screen
    if (levelBeat <= 0) {
        return; // nothing timed: a level that was never played can't have a split
    }
    var best = rec().level[level]; // recordLevel has already taken it
    ctx.font = "30px Arial";
    ctx.fillStyle = levelRecord ? COLORS.good : COLORS.text;
    centerText(splitText(levelBeat) + (levelRecord ? "   NEW BEST" : "   best " + splitText(best)), dy);
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
var RESULTS_TOP = -95, RESULTS_BOTTOM = 50; // every column's first and last lines: over the grade, RANK, level with
                                            // the tables' headings; under it, the best, level with their last rows

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

function showBreakdown(dy) { // how the cleared level's beats went, which is what its rank is worked out from: how
    // many there were and the longest combo of them, then a row for each way a beat can go, with how many went that
    // way and what share
    var beats = playBeats();
    if (beats <= 0) {
        return; // nothing judged, nothing to break down
    }
    var rows = [["PERFECT", perfects, COLORS.cyan], ["GOOD", goods, COLORS.magenta],
        ["MISS", beats - perfects - goods, COLORS.dim]]; // every other beat: gone by unhit, or spent WRONG or OFF TARGET
    var shares = shareTexts(rows.map(function (row) { return row[1]; }));
    var pitch = (RESULTS_BOTTOM - RESULTS_TOP) / rows.length;
    ctx.font = "30px Arial";
    ctx.fillStyle = COLORS.dim;
    columnText(beats + " BEATS", RESULTS_LABEL_X, dy + RESULTS_TOP, "left");
    ctx.font = "24px Arial"; // and the longest run of them hit, over the shares
    columnText("MAX COMBO " + bestCombo, RESULTS_SHARE_X, dy + RESULTS_TOP, "right");
    rows.forEach(function (row, i) {
        var at = dy + RESULTS_TOP + (i + 1) * pitch;
        ctx.font = "bold 30px Arial";
        ctx.fillStyle = row[2];
        columnText(row[0], RESULTS_LABEL_X, at, "left");
        ctx.font = "30px Arial";
        ctx.fillStyle = COLORS.text;
        columnText(String(row[1]), RESULTS_COUNT_X, at, "right");
        ctx.fillStyle = COLORS.dim;
        columnText(shares[i], RESULTS_SHARE_X, at, "right");
    });
}

function showRank(dy) { // the cleared level's rank, large: an S is printed as the title is, the rest in their own
    // colour. Under it, the best this level has had (recordLevel has taken this one)
    var rank = levelRank();
    var best = rec().rank[level];
    ctx.font = "30px Arial";
    ctx.fillStyle = COLORS.dim;
    centerText("RANK ランク", dy + RESULTS_TOP, 1, RESULTS_RANK_X);
    ctx.font = "100px Arial";
    if (rank.grade.charAt(0) == "S") {
        printText(rank.grade, dy, RESULTS_RANK_X);
    } else {
        ctx.fillStyle = rank.color;
        centerText(rank.grade, dy, 3, RESULTS_RANK_X);
    }
    ctx.font = "30px Arial";
    ctx.fillStyle = gradeRecord ? COLORS.good : COLORS.text;
    centerText(gradeRecord ? "NEW BEST" : "best " + best, dy + RESULTS_BOTTOM, 1, RESULTS_RANK_X);
}

function showScore(dy) { // what the cleared level scored, the breakdown's mirror: its points, the most it has been
    // cleared with (NEW BEST when that is these, as the rank's best says under it), and the run's total with its points
    // in, which is what CONTINUE banks
    var rows = [["LEVEL " + level, score], [scoreRecord ? "NEW BEST" : "BEST", rec().score[level]],
        ["TOTAL", runScore + score]];
    var pitch = (RESULTS_BOTTOM - RESULTS_TOP) / rows.length;
    ctx.font = "30px Arial";
    ctx.fillStyle = COLORS.dim;
    columnText("SCORE スコア", RESULTS_SCORE_X, dy + RESULTS_TOP, "left");
    rows.forEach(function (row, i) {
        var at = dy + RESULTS_TOP + (i + 1) * pitch;
        var total = i == rows.length - 1; // the one that matters most, set apart
        var best = i == 1 && scoreRecord; // and a new best, in the colour the other new bests are in
        ctx.font = "bold 30px Arial";
        ctx.fillStyle = best ? COLORS.good : total ? COLORS.text : COLORS.dim;
        columnText(row[0], RESULTS_SCORE_X, at, "left");
        ctx.font = (total ? "bold 36px" : "30px") + " Arial";
        ctx.fillStyle = best ? COLORS.good : total ? COLORS.cyan : COLORS.text;
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
var resultsUp = false; // a cleared level's results are showing
var resultsAt = 0; // when they came up
var resultsHover = ""; // the button under the mouse, or under a finger held on it
var resultsArmed = false; // a mouse press began on them once they could take one
const RESULT_BUTTONS = { // left to right: where each sits (-1 left, 1 right), and the line under its label, which is
    // its keys at a keyboard and its name in Japanese otherwise. CONTINUE is the way on, lit as START is
    retry: { side: -1, label: "RETRY", keys: "R", jp: "リトライ" },
    next: { side: 1, label: "CONTINUE", keys: "ENTER / SPACE", jp: "次へ", primary: true },
};

function showLevelResults() { // the level was cleared: its results come up and wait
    resultsUp = true;
    resultsAt = Date.now();
    resultsHover = "";
    resultsArmed = false;
    playSound(aud_menuSound);
    drawResultsScreen();
}

function drawResultsScreen() { // drawn as they come up, and again on a resize, a hover or a change of input
    drawSky(level, 0, null, SKY_BEHIND); // the level's backdrop, still and dimmed, behind them: the ground as well
    ctx.font = "80px Arial";
    printText("Level " + level + " Clear", -175);
    ctx.font = "60px Arial";
    printText("クリア", -75);
    var line = 0; // the stats under the title, a line apart
    if (timingText()) {
        ctx.font = "30px Arial";
        ctx.fillStyle = timingColor();
        centerText(timingText(), line);
        line += 40;
    }
    showSplit(line);
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
    for (var name in RESULT_BUTTONS) {
        var b = RESULT_BUTTONS[name];
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

function chooseResult(name) { // CONTINUE ("next") or RETRY ("retry")
    if (!resultsReady()) {
        return;
    }
    resultsUp = false;
    resultsHover = "";
    playSound(aud_click);
    startTime += Date.now() - resultsAt; // off the run's clock
    if (name == "next") {
        runScore += score;
        level++;
    }
    score = 0; // the next level, or this one again, starts from nothing
    if (name == "retry") {
        startNextLevel();
    } else if (level > RUN_LEVELS) {
        showEpilogue(showFinish);
    } else {
        enterLevel();
    }
}

function showFinish() { // the last level continued past: the run's time and its total, until a click or R
    var runMs = Date.now() - startTime;
    var full = runFrom == 1; // only a run from the first level can set the best run
    var runBest = full && recordRun(runMs, deaths);
    restFrame = null; // a resize copies this screen, not the results under it
    gameArea.clear();
    ctx.font = "80px Arial";
    if (deaths == 0) {
        printText("Flawless Victory", -175);
    } else {
        printText("You continued.", -175);
        ctx.font = "60px Arial";
        printText("It cost you " + mistakes(deaths) + ".", -87);
    }
    ctx.font = "60px Arial";
    printText("Time: " + millisToMinutesAndSeconds(runMs), 0);
    ctx.font = "30px Arial";
    if (full) {
        ctx.fillStyle = runBest ? COLORS.good : COLORS.text;
        centerText(runBest ? "NEW BEST" : "best " + millisToMinutesAndSeconds(rec().run)
            + "   " + mistakes(rec().runDeaths), 45);
    } else {
        ctx.fillStyle = COLORS.dim;
        centerText("from Level " + runFrom + ": the best run is one from Level 1", 45);
    }
    ctx.font = "60px Arial";
    printText("Total score: " + runScore, msgBottom() + 100);
    ctx.fillStyle = COLORS.text;
    var again = runFrom == 1 ? "" : " from Level " + runFrom; // play again is this run again, from where it began
    if (inputMode == "touch") {
        ctx.font = "40px Arial";
        centerText("Tap to play again" + again, msgBottom() + 70);
    } else if (inputMode == "pad") {
        ctx.font = "30px Arial";
        centerText("Press A to play again" + again, msgBottom() + 60);
    } else {
        ctx.font = "30px Arial";
        centerText("Click or press R to play again" + again, msgBottom() + 60);
    }
    showMessage();
    runFinished = true;
    finishTime = Date.now();
    restartArmed = false; // a click already in progress shouldn't restart
    useWindow();
}

function stopLevel() { // the level stops where it stands, however it ended: the loop, the lasers, the effects
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
    stopLevel();
    gameStart = false; // so the next START is a first start again: a new run, its lives and its clock
    level = 1;
    deaths = 0;
    score = 0;
    runScore = 0;
    restFrame = null;
    hoveredButton = "";
    startMenuTimers();
    updateSloganText(); // which draws the start screen
}

function gameOver() { // the level was cleared or the player died
    var levelCleared = levelComplete();
    stopLevel();
    lifeSpent = false;
    if (levelCleared) {
        recordLevel(level); // its split and its rank
        showLevelResults(); // which keep its score up until CONTINUE banks it or RETRY lets it go
        return;
    }
    deaths += 1;
    lifeSpent = runLives > 0;
    if (lifeSpent) { // a life buys the level's progress back: the death reads as a transition, not a reset
        runLives--;
    }
    playSound(aud_death);
    drawDeathMessage(score);
    wait(2500);
    useWindow();
    if (!lifeSpent) {
        score = 0; // the level starts again from nothing; a life is what keeps a death from doing it
    }
}

function drawDeathMessage(shown) { // the message after a death, over the level's backdrop, still and dimmed
    drawSky(level, 0, null, SKY_BEHIND);
    ctx.font = "80px Arial";
    printText(deathProgress >= 0.9 ? "So Close" : "Try Again", -175);
    ctx.font = "80px Arial";
    printText(String(shown), -54);
    ctx.font = "60px Arial";
    printText("再試行する", 45);
    if (timingText()) {
        ctx.font = "30px Arial";
        ctx.fillStyle = timingColor();
        centerText(timingText(), msgBottom() + 70);
    }
    if (lifeSpent) {
        ctx.font = "30px Arial";
        ctx.fillStyle = COLORS.good;
        centerText("LIFE SPENT   score kept   " + runLives + " left", msgBottom() + 80);
    }
    showMessage();
    useWindow();
}
