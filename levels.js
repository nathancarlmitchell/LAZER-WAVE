// Lazer Wave -- a level's beginning and its end. startGame and the touch start that seeds it, the waits between
// levels and the restart from the finish, the message block that lays out the screens between levels and the finish
// itself (measured, centred and fitted to the window), and gameOver, which is where a level cleared or lost becomes
// records, messages and the next level. index.html loads this with a plain <script src>, as globals rather than
// modules, so the game still opens straight off disk.
//
// It drives the game rather than reading it: startGame sets it running, gameOver stops it. Both reach into the loop
// (gameArea, startLevel), the world (clearObjects, component), the records and the effects (fxReset).

function startGame(e) {
    if (!gameStart) { // first start
        startScreenIntervals.forEach(function (id) { clearInterval(id); });
        loadAudio();
        playSound(aud_click);
        startTime = Date.now();
        startRunLives(); // the difficulty is locked in from here: its button only lives on the start screen
        gamePiece = new component(PIECE_SIZE, PIECE_SIZE, COLORS.piece, e.pageX - PIECE_SIZE / 2, e.pageY - PIECE_SIZE / 2); // centered on the cursor
        gamePiece.update = function () { drawPlayer(this); };
    }
    gameArea.start();
    gameStart = true;
    alive = true;
    levelStart = Date.now(); // the split clock; startTime runs across the whole run, skipping pauses
    levelBeat = 0;
    reachedLevel(level);
    restFrame = null; // the next transition screen gets a fresh copy
    pause = false;
    var cx = gamePiece.x + gamePiece.width / 2;
    var cy = gamePiece.y + gamePiece.height / 2;
    if (inputMode == "touch" && (cx < 0 || cy < 0 || cx > gameArea.canvas.width || cy > gameArea.canvas.height)) {
        // the window shrank between levels: back to the touch start spot (the level starts empty)
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

function wait(time) {
    setTimeout(startNextLevel, time);
}

function restartRun() { // after the finish screen, start a fresh run from level 1
    runFinished = false;
    restartArmed = false;
    level = 1;
    deaths = 0;
    score = 0;
    startRunLives();
    startTime = Date.now();
    startNextLevel();
}

function startNextLevel() {
    gameArea.clear();
    startGame();
}

// A message is collected line by line, measured, and drawn as one block: every line truly centred, the block centred
// on the screen, and the whole thing scaled to fill the room it has -- the lines it holds depend on the level, the
// score and the deaths, so it is the one band that has to be measured at draw time rather than written down.
var msgBlock = []; // the lines queued so far, measured and drawn by showMessage

function centerText(text, dy, passes) { // queue a line dy from the block's baseline, in the font and fill set now;
    // passes > 1 repeats it 1px down and right for a bold look
    msgBlock.push({ text: text, dy: dy, passes: passes || 1, font: ctx.font, fill: ctx.fillStyle });
}

var PRINT_TRAIL = 8; // copies a printed line trails

function printText(text, dy) { // queue a line printed as the title is: cyan copies trailing up and left, a pixel apart,
    // and magenta over them, in the font set now
    msgBlock.push({ text: text, dy: dy, passes: 1, font: ctx.font, fill: COLORS.magenta, print: COLORS.cyan, trail: PRINT_TRAIL });
}

function msgBottom() { // the lowest line queued so far, so another can be put under whatever a branch put up
    var low = 0;
    for (let i = 0; i < msgBlock.length; i++) {
        low = Math.max(low, msgBlock[i].dy);
    }
    return low;
}

function showSplit() { // the level's time under the message, and what it was before, on every cleared screen
    if (levelBeat <= 0) {
        return; // nothing timed: a level that was never played can't have a split
    }
    var best = rec().level[level - 1]; // recordLevel has already taken it, and level has already moved on
    ctx.font = "30px Arial";
    ctx.fillStyle = levelRecord ? COLORS.good : COLORS.text;
    centerText(splitText(levelBeat) + (levelRecord ? "   NEW BEST" : "   best " + splitText(best)),
        msgBottom() + 80);
}

function showRank() { // the cleared level's rank, large, under everything else on the screen: an S is printed as the
    // title is, the rest in their own colour. Under it, the best this level has had (recordLevel has taken this one)
    var rank = levelRank();
    var best = rec().rank[level - 1]; // level has already moved on
    var dy = msgBottom() + 160;
    ctx.font = "30px Arial";
    ctx.fillStyle = COLORS.dim;
    centerText("RANK ランク", dy - 95);
    ctx.font = "100px Arial";
    if (rank.grade.charAt(0) == "S") {
        printText(rank.grade, dy);
    } else {
        ctx.fillStyle = rank.color;
        centerText(rank.grade, dy, 3);
    }
    ctx.font = "30px Arial";
    ctx.fillStyle = gradeRecord ? COLORS.good : COLORS.text;
    centerText(gradeRecord ? "NEW BEST" : "best " + best, dy + 50);
}

function showMessage() { // draw the queued lines centred and as large as this screen allows, and return that scale
    if (!msgBlock.length) {
        return 1;
    }
    var left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (let i = 0; i < msgBlock.length; i++) {
        var line = msgBlock[i];
        ctx.font = line.font;
        var m = ctx.measureText(line.text);
        left = Math.min(left, -m.width / 2 - (line.trail || 0)); // a print's trail reaches up and left, as far as it is long
        right = Math.max(right, m.width / 2 + line.passes - 1); // the bold passes reach 1px further for each repeat
        top = Math.min(top, line.dy - m.actualBoundingBoxAscent - (line.trail || 0));
        bottom = Math.max(bottom, line.dy + m.actualBoundingBoxDescent + line.passes - 1);
    }
    var s = fitBand(right - left, bottom - top);
    var dx = -(left + right) / 2;
    var dy = -(top + bottom) / 2; // the lines sit mostly above their baseline, so the block has to come down to the middle
    ctx.setTransform(s, 0, 0, s, gameArea.canvas.width / 2, gameArea.canvas.height / 2);
    ctx.textAlign = "center";
    for (let i = 0; i < msgBlock.length; i++) {
        var l = msgBlock[i];
        ctx.font = l.font;
        if (l.trail) { // a printed line: the copies trailing up and left first, then the line over them
            ctx.fillStyle = l.print;
            for (let q = l.trail; q > 0; q--) {
                ctx.fillText(l.text, dx - q, l.dy + dy - q);
            }
        }
        ctx.fillStyle = l.fill;
        for (let p = 0; p < l.passes; p++) {
            ctx.fillText(l.text, dx + p, l.dy + dy + p);
        }
    }
    ctx.textAlign = "start"; // the rest of the game draws left-aligned text
    msgBlock.length = 0;
    return s;
}

function gameOver() { // the level was cleared or the player died
    gameArea.stop();
    var levelCleared = levelComplete();
    alive = false;
    endLevel(); // the game's own teardown, whichever way the level ended
    lifeSpent = false;
    gameArea.clear();
    clearObjects();
    fxReset();
    gameArea.canvas.style.cursor = "default";
    if (levelCleared) { // Next level
        recordLevel(level); // the split for the one just played, before level moves on
        level++;
        if (level > RUN_LEVELS) { // the finish
            var runMs = Date.now() - startTime;
            var runBest = recordRun(runMs, deaths);
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
            ctx.fillStyle = runBest ? COLORS.good : COLORS.text;
            centerText(runBest ? "NEW BEST" : "best " + millisToMinutesAndSeconds(rec().run)
                + "   " + mistakes(rec().runDeaths), 45);
            showRank(); // the last level's
            ctx.fillStyle = COLORS.text;
            if (inputMode == "touch") {
                ctx.font = "40px Arial";
                centerText("Tap to play again", msgBottom() + 70);
            } else {
                ctx.font = "30px Arial";
                centerText("Click or press R to play again", msgBottom() + 60);
            }
            showMessage();
            runFinished = true;
            finishTime = Date.now();
            restartArmed = false; // a click already in progress shouldn't restart
            useWindow();
            score = 0;
            return;
        }
        playSound(aud_menuSound);
        ctx.font = "80px Arial";
        printText("Level " + (level - 1) + " Clear", -175);
        ctx.font = "60px Arial";
        printText("クリア", -75);
        ctx.font = "30px Arial";
        ctx.fillStyle = COLORS.text;
        centerText("Score " + score + "   best combo " + bestCombo, 0);
        if (timingText()) {
            ctx.fillStyle = timingColor();
            centerText(timingText(), 40);
        }
        showSplit();
        showRank();
        showMessage();
        useWindow();
        ctx.fillStyle = COLORS.magenta;
        drawBanners(40, 20, bannerScale());
        wait(3000);
    } else { // you lose
        deaths += 1;
        lifeSpent = runLives > 0;
        if (lifeSpent) { // a life buys the level's progress back: the death reads as a transition, not a reset
            runLives--;
        }
        playSound(aud_death);
        drawDeathMessage(score);
        wait(2500);
    }
    useWindow();
    if (!lifeSpent) {
        score = 0; // a cleared level starts the next one at nothing; a life is what keeps a death from doing it
    }
}

function drawDeathMessage(shown) { // the message after a death
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
