// Lazer Wave -- the input. The actions and what is bound to them; the keys and mouse buttons, the touch fingers and
// which of them steers, the on-screen touch buttons and their drawing, a controller's buttons and sticks, the pause
// panel and the touch resume countdown, the input mode that follows the last real input, and the listeners that feed
// all of it, which gameArea.load binds once through bindInput. index.html loads this with a plain <script src>, as
// globals rather than modules, so the game still opens straight off disk. Nothing here runs at load beyond the
// tables and one matchMedia question.
//
// It reaches into the menus (buttonAt, geom, openMenu, closeMenu, menuPress, cycleSetting, setHovered), the level flow
// (startGame, startTouchGame, startPadGame, restartRun, retryLevel, quitRun, chooseResult), the message block
// (centerText, buttonText, showMessage, msgButtons), the loop (gameArea, onActionPress, onActionRelease) and the paused
// redraw (drawLevel); the game reaches back for canAct, actionHeld, actionKey, setPause, touchButtons and
// drawTouchControls.

// The actions: every button the game has, and what triggers it on each input. The game hears about them through
// onActionPress and onActionRelease (loop.js), once per real change: a second source pressing an action already held
// is not a second press, and it carries the moment the input actually happened (the event's timeStamp), which a
// rhythm game judges by: a handler can run a frame late when the page is busy. A power that lasts while held should read actionHeld each step rather than trusting the
// events, since a release during a pause or between levels is recorded but not announced.
//   keys:  keyName() values ("Shift", " ", "z", ...)     mouse: a MouseEvent.button (0 left, 1 middle, 2 right)
//   pad:   a controller's buttons (PAD, below);  padKeys: their names, the first the one the game shows
//   label: the touch button's text and the help screen's name for it
//   beat:  the kind of beat it hits (waves.js), which is also its name, so a beat finds the action that hits it
//   lit:   when its touch button should stand out, if ever;  now: its touch button's text, when that changes
//
// A controller is read through the browser's Gamepad API, in its standard mapping, whose button numbers these are
// (named as on an Xbox pad). The left side hits cyan and the right side magenta, as Z and X and the mouse buttons do:
// triggers, bumpers or the face buttons, whichever suits the hands. A and Y are the gate and overdrive; the left stick
// or the D-pad steers; START pauses. On a screen, the stick or D-pad moves between its buttons, A presses the one lit,
// B backs out, and START starts, resumes or carries on
const PAD = { a: 0, b: 1, x: 2, y: 3, lb: 4, rb: 5, lt: 6, rt: 7, start: 9, up: 12, down: 13, left: 14, right: 15 };
const ACTIONS = {
    cyan: { label: "CYAN", keys: ["z"], mouse: 0, pad: [PAD.lt, PAD.lb, PAD.x], padKeys: ["LT", "LB", "X"],
        color: COLORS.cyan, beat: "cyan",
        help: "on a cyan beat, as your waves meet: the top wave lights up for it" },
    magenta: { label: "MAGENTA", keys: ["x"], mouse: 2, pad: [PAD.rt, PAD.rb, PAD.b], padKeys: ["RT", "RB", "B"],
        color: COLORS.magenta, beat: "magenta",
        help: "on a magenta beat: the bottom wave lights. A beat with no laser takes either" },
    gate: { label: "GATE", keys: [" "], mouse: 1, pad: [PAD.a, PAD.y], padKeys: ["A", "Y"],
        color: COLORS.laserCore, beat: "gate", // off a gate, overdrive
        lit: function () { return gateAhead() || driveReady(); },
        now: function () { return gateAhead() ? "GATE" : "OVERDRIVE"; },
        help: "on a gate, switches wave and laser; anywhere else, spends a full overdrive meter" },
};
const ACTION_NAMES = Object.keys(ACTIONS); // in the order they are laid out, first in the corner

var held = {}; // what is holding each action down: which of its keys, the mouse, and how many fingers
ACTION_NAMES.forEach(function (name) { held[name] = { keys: {}, mouse: false, touch: 0 }; });

// Input: the mouse (with keyboard), touch, or a controller ("pad"). inputMode follows the last real input and picks
// the labels and controls.
var inputMode = (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ? "touch" : "mouse";
var lastTouchTime = 0; // when the last touch event arrived; mouse events a browser makes up after a touch are ignored
var activeTouches = 0; // fingers down
var TOUCH_GAIN = 1.25; // touch steering: the piece moves 1.25px for each px the steering finger moves
var TOUCH_SIDE = "right"; // which edge the action buttons and the pause icon sit against
var touch = { steerId: null, lastX: 0, lastY: 0, roles: {}, order: 0 }; // what each finger is doing, and which one steers
var resumeTimer = null; // the 3-2-1 countdown after a touch resume
var pauseNo = 0; // counts pauses (and cut-short countdowns): a finger lifted during the pause it came down in resumes
var layoutClick = false; // this mouse press switched the start screen to the mouse layout; its click only shows it
var rotated = false; // a phone or tablet held upright: the game is drawn turned a quarter clockwise, so it always plays landscape

function canAct() { // actions only work while playing and unpaused
    return alive && !pause;
}

function actionHeld(name) { // is anything holding this action down
    var h = held[name];
    for (var k in h.keys) {
        return true; // only held keys are ever in it
    }
    return h.mouse || h.touch > 0;
}

function holdSource(name, source, down) { // source is "mouse", "touch", or the keyName of a key
    var h = held[name];
    if (source == "touch") {
        h.touch = Math.max(0, h.touch + (down ? 1 : -1));
    } else if (source == "mouse") {
        h.mouse = down;
    } else if (down) {
        h.keys[source] = true;
    } else {
        delete h.keys[source];
    }
}

function eventTime(e) { // when an input happened, on performance.now()'s clock; now, if the event can't say
    var now = performance.now();
    var t = e && e.timeStamp;
    return typeof t == "number" && t > 0 && t <= now && now - t < 250 ? t : now;
}

function pressAction(name, source, time) { // a key, button or finger went down on an action, at `time`
    var was = actionHeld(name);
    holdSource(name, source, true);
    if (!was && canAct()) {
        onActionPress(name, time === undefined ? performance.now() : time);
    }
}

function releaseAction(name, source) { // and came up again
    var was = actionHeld(name);
    holdSource(name, source, false);
    if (was && !actionHeld(name) && canAct()) {
        onActionRelease(name);
    }
}

function actionForKey(key) { // the action bound to a keyName, or ""
    for (var i = 0; i < ACTION_NAMES.length; i++) {
        if (ACTIONS[ACTION_NAMES[i]].keys.indexOf(key) >= 0) {
            return ACTION_NAMES[i];
        }
    }
    return "";
}

function actionForMouse(button) { // the action bound to a mouse button, or ""
    for (var i = 0; i < ACTION_NAMES.length; i++) {
        if (ACTIONS[ACTION_NAMES[i]].mouse === button) {
            return ACTION_NAMES[i];
        }
    }
    return "";
}

function actionForPad(button) { // the action bound to a controller button, or ""
    for (var i = 0; i < ACTION_NAMES.length; i++) {
        if (ACTIONS[ACTION_NAMES[i]].pad.indexOf(button) >= 0) {
            return ACTION_NAMES[i];
        }
    }
    return "";
}

function actionKey(name) { // what to press for an action in the input in use: "SPACE", "Z", "A", "LT"; by touch, its
    // button's label
    var a = ACTIONS[name];
    if (inputMode == "touch") {
        return a.label;
    }
    return inputMode == "pad" ? a.padKeys[0] : a.keys[0] == " " ? "SPACE" : a.keys[0].toUpperCase();
}

var MOUSE_BIT = { 0: 1, 1: 4, 2: 2 }; // MouseEvent.button to its bit in MouseEvent.buttons

function setPause(paused) { // pause or resume play; only while alive
    if (paused && pause && stopResume()) { // pausing during a touch resume countdown stops it: show the panel again
        drawPauseScreen();
        return;
    }
    if (!alive || paused == pause) {
        return;
    }
    if (!paused && menuUp()) { // the instructions are up over this pause and own the screen: nothing resumes under
        return; // them, not P and not a touch countdown, or the level would run unseen until BACK put the panel back
    }
    cancelResume();
    pause = paused;
    pauseHover = ""; // each pause's panel starts with nothing lit
    gameArea.canvas.style.cursor = pause ? "default" : "none"; // let the player line the cursor back up with their piece
    if (pause) {
        pauseStart = Date.now();
        pauseNo++;
        pauseMusic(); // a rhythm game's clock is the song: it has to stop when the game does
        drawPauseScreen();
    } else { // exclude paused time from the run's clock
        startTime += Date.now() - pauseStart;
        beatAudio(); // woken, if the browser put it to sleep over the pause
        latchLatency(true); // and its delay read again: a device slept or changed over a long pause
        resumeMusic();
    }
}

function releaseAll() { // the player went away (window blur, app switch, a system gesture): let go of everything and pause
    ACTION_NAMES.forEach(function (name) {
        var was = actionHeld(name);
        held[name] = { keys: {}, mouse: false, touch: 0 };
        if (was && canAct()) {
            onActionRelease(name);
        }
    });
    touch.roles = {};
    touch.steerId = null;
    setPause(true); // this also stops a resume countdown
}

function cancelResume() { // stop a touch resume countdown
    if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
    }
}

function stopResume() { // a touch resume countdown was cut short: stay paused and wait for a new tap
    if (!resumeTimer) {
        return false;
    }
    cancelResume();
    pauseNo++; // fingers already down don't count as that tap
    return true;
}

function startResumeCountdown() { // the resume's 3, 2, 1 (400ms each): by touch a tap's, and RESUME's with the mouse
    // too, so the player can put their thumbs down, or the cursor back on the piece, first
    if (resumeTimer || !pause || !alive || menuUp()) {
        return;
    }
    beatAudio(); // the audio woken now, so its delay has settled by the time play does (latchLatency, loop.js)
    var n = 3;
    var beat = function () {
        resumeTimer = null;
        if (!pause || !alive) {
            return;
        }
        if (n == 0) {
            setPause(false);
            return;
        }
        drawPauseScreen(n);
        n -= 1;
        resumeTimer = setTimeout(beat, 400);
    };
    beat();
}

// The pause panel: how to resume, and its buttons, left to right, with the line under each label, which is its key at
// a keyboard and its name in Japanese otherwise. RESUME resumes at once with a controller; with the mouse or a finger
// it counts 3-2-1 first (startResumeCountdown), so the cursor can be put back on the piece and the thumbs put down.
// P, ESC and, by touch, a tap anywhere else resume as they always did
const PAUSE_BUTTONS = {
    resume: { label: "RESUME", keys: "P / ESC", jp: "再開" },
    retry: { label: "RETRY", keys: "R", jp: "リトライ" },
    quit: { label: "QUIT", keys: "Q", jp: "終了" },
};
var PAUSE_PANEL = 28; // how far the panel reaches past what is on it
var pauseHover = ""; // the pause button under the mouse, under a finger held on it, or picked with a controller
var pauseArmed = false; // a mouse press began on the panel, so its click may press a button

function pauseButtons() { // the pause buttons, in order: every input gets the lot (H opens the help over the panel)
    return ["resume", "retry", "quit"];
}

function drawPauseScreen(countdown) { // over the level, frozen as it stood: how to resume and the buttons, or by
    // touch the resume's 3-2-1. Drawn afresh each time (a hover, a resize, a change of input), the level first
    drawLevel();
    var touch = inputMode == "touch", pad = inputMode == "pad";
    ctx.fillStyle = COLORS.magenta;
    if (countdown) {
        ctx.font = "140px Arial";
        centerText(String(countdown), 0);
        if (!touch && !pad) { // the mouse's piece jumps to the cursor as play resumes: this is the moment to line it up
            ctx.font = "22px Arial";
            ctx.fillStyle = COLORS.text;
            centerText("Move the cursor onto your piece", 50);
        }
        showMessage(PAUSE_PANEL);
        useWindow();
        return;
    }
    ctx.font = (touch ? 64 : 60) + "px Arial";
    centerText("PAUSED", 0);
    if (touch) { // the buttons straight under it, so the panel's foot, near the thumb resting on the action buttons,
        // is words: a tap meant to resume that lands low resumes. Steering is relative: nothing to line up
        showPauseButtons(28);
        ctx.fillStyle = COLORS.text;
        ctx.font = "36px Arial";
        centerText("TAP TO RESUME", msgBottom() + 50);
        ctx.font = "22px Arial";
        centerText("Your piece stays put. Drag to steer.", msgBottom() + 34);
    } else {
        ctx.fillStyle = COLORS.text;
        ctx.font = "25px Arial";
        centerText(pad ? "START or B to resume" : "P or ESC to resume", 40);
        if (!pad) {
            ctx.font = "18px Arial";
            centerText("Move the cursor onto your piece first", 72);
        }
        showPauseButtons(msgBottom() + 30);
    }
    showMessage(PAUSE_PANEL);
    useWindow();
}

function showPauseButtons(top) { // the pause buttons in a row, their tops at `top`: finger-sized by touch
    var touch = inputMode == "touch";
    var names = pauseButtons();
    var w = touch ? 176 : 170, h = touch ? 80 : 64, gap = touch ? 20 : 16;
    ctx.font = (touch ? 30 : 26) + "px Arial";
    names.forEach(function (name, i) {
        var b = PAUSE_BUTTONS[name];
        buttonText(name, b.label, inputMode == "mouse" ? b.keys : b.jp, (i - (names.length - 1) / 2) * (w + gap), top,
            w, h, pauseHover == name);
    });
}

function pauseButtonAt(px, py) { // the pause button at a window point, or "": only while the panel is up and still
    return alive && pause && !menuUp() && !resumeTimer ? msgButtonAt(px, py) : "";
}

function setPauseHover(name) { // light the pause button under the mouse, a finger or the controller's pick
    if (alive && pause && !menuUp() && !resumeTimer && name != pauseHover) {
        pauseHover = name;
        drawPauseScreen();
    }
}

function pausePress(name) { // a pause button: RESUME, RETRY or QUIT
    if (!alive || !pause || menuUp() || resumeTimer || !PAUSE_BUTTONS[name]) {
        return;
    }
    if (name == "resume") { // at once with a controller; with the mouse or a finger, after the 3-2-1
        if (inputMode == "pad") {
            setPause(false);
        } else {
            startResumeCountdown();
        }
    } else {
        playSound(aud_click);
        if (name == "retry") {
            retryLevel();
        } else {
            quitRun();
        }
    }
}

function keyName(e) { // the key pressed: a lowercase letter, " " (space), "Shift", "Control", "Escape", or e.key
    var key = e.key === "Spacebar" ? " " : e.key; // old Edge/IE called space "Spacebar"
    if (key && key.length == 1 && /[a-z ]/i.test(key)) {
        return key.toLowerCase(); // letters as typed, so Shift+P or Caps Lock still works
    }
    if (key == "Shift" || key == "Control" || key == "Escape") {
        return key;
    }
    // anything else: an older browser without e.key, a non-Latin keyboard layout, a layout-switch key such as
    // "GroupNext", or a tool that leaves key empty
    return { 16: "Shift", 17: "Control", 27: "Escape", 32: " ", 72: "h", 80: "p", 81: "q", 82: "r" }[e.keyCode] || key;
}

function setInputMode(mode) { // switch between mouse and touch play, redrawing whatever shows labels or controls
    if (mode == inputMode) {
        return;
    }
    inputMode = mode;
    if (!gameStart) {
        drawStartScreen();
    } else if (alive && pause) {
        stopResume();
        if (menuUp()) { // the instructions are up over the pause: redraw them, in the wording for this input
            drawStartScreen();
        } else {
            drawPauseScreen(); // over the level, in this input's wording
        }
    } else if (alive && mode == "mouse") {
        drawLevel(); // without the touch controls
        setPause(true); // the cursor is somewhere else: pause so the player can line it up with the piece
    } else if (resultsUp) { // a cleared level's results: their buttons, in this input's size and wording
        resultsHover = "";
        drawResultsScreen();
    }
}

function screenUpright() { // the device is held upright (a tall window alone could be split screen on a landscape tablet)
    var type = window.screen && screen.orientation && screen.orientation.type;
    if (type) {
        return type.indexOf("portrait") == 0;
    }
    if (typeof window.orientation == "number") { // older iOS Safari
        return window.orientation % 180 == 0;
    }
    return true;
}

function toGame(sx, sy) { // a window point (clientX/Y or pageX/Y) in game coordinates; they differ only while the game is turned
    return rotated ? { x: sy, y: gameArea.canvas.height - sx } : { x: sx, y: sy };
}

function touchEcho(e) { // a mouse event the browser made up after a touch
    return Date.now() - lastTouchTime < 800 || !!(e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents);
}

var touchLayout = null; // touchButtons' last answer, kept until the window or the side changes

function touchButtons() { // the on-screen action buttons for touch play, in window pixels (worked out from the window size)
    var W = gameArea.canvas.width;
    var H = gameArea.canvas.height;
    var was = touchLayout;
    if (was && was.w == W && was.h == H && was.side == TOUCH_SIDE) {
        return was; // nothing that places them has changed. Every caller reads it; none writes to it
    }
    var u = Math.min(W, H);
    var r = Math.max(32, Math.min(48, 0.11 * u)); // radius
    var gap = 16;
    var tb = { buttons: {}, side: TOUCH_SIDE, pause: { x: W - 12 - 48, y: 12, w: 48, h: 48 } };
    ACTION_NAMES.forEach(function (name, i) { // the first in the corner, where the thumb rests, the rest in a row
        var along = i * (2 * r + gap); // leftward in landscape, upward in portrait
        tb.buttons[name] = W >= H ? { x: W - 20 - r - along, y: H - 24 - r, r: r } : { x: W - 20 - r, y: H - 24 - r - along, r: r };
    });
    var list = ACTION_NAMES.map(function (name) { return tb.buttons[name]; });
    if (TOUCH_SIDE == "left") { // laid out against the right edge, then mirrored whole, so both hands get the same reach
        list.forEach(function (c) { c.x = W - c.x; });
        tb.pause.x = W - tb.pause.x - tb.pause.w;
    }
    var pad = 14;
    // the cluster's footprint, which the quick reject in touchButtonAt uses. It runs to the bottom of the window on
    // whichever side it is
    tb.box = {
        left: TOUCH_SIDE == "left" ? 0 : Math.min.apply(null, list.map(function (c) { return c.x - c.r; })) - pad,
        right: TOUCH_SIDE == "left" ? Math.max.apply(null, list.map(function (c) { return c.x + c.r; })) + pad : W,
        top: Math.min.apply(null, list.map(function (c) { return c.y - c.r; })) - pad,
    };
    tb.w = W; // what it was worked out for, so the next call can tell whether it still holds
    tb.h = H;
    touchLayout = tb;
    return tb;
}

function touchButtonAt(px, py) { // an action's name, "pause" or "" for a touch at a window point
    var tb = touchButtons();
    var p = tb.pause;
    if (px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) {
        return "pause";
    }
    if (px < tb.box.left || px > tb.box.right || py < tb.box.top) {
        return "";
    }
    var best = "";
    var bestDistance = Infinity;
    ACTION_NAMES.forEach(function (name) { // anywhere near the cluster counts as its nearest button
        var c = tb.buttons[name];
        var d = Math.sqrt(Math.pow(px - c.x, 2) + Math.pow(py - c.y, 2));
        if (d < bestDistance) {
            bestDistance = d;
            best = name;
        }
    });
    return best;
}

function drawTouchControls() { // touch play: the action buttons and pause icon, over the world and under the piece
    if (inputMode != "touch" || !alive) {
        return;
    }
    var tb = touchButtons();
    ctx.save();
    useWindow();
    ACTION_NAMES.forEach(function (name) {
        var a = ACTIONS[name], c = tb.buttons[name];
        ctx.globalAlpha = actionHeld(name) ? 0.45 : a.lit && a.lit() ? 0.35 : 0.15;
        ctx.fillStyle = a.color;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 3;
        ctx.strokeStyle = a.color;
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.font = "bold " + Math.round(0.4 * c.r) + "px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = COLORS.text;
        ctx.fillText(a.now ? a.now() : a.label, c.x, c.y, 1.7 * c.r); // squeezed to fit rather than spill out
    });
    var p = tb.pause; // pause icon: two bars
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = COLORS.text;
    ctx.fillRect(p.x + 12, p.y + 8, 11, 32);
    ctx.fillRect(p.x + 25, p.y + 8, 11, 32);
    ctx.restore();
}

function steerBy(dx, dy) { // touch steering is relative: move the piece's target by the finger's movement
    if (gameArea.x === undefined) { // no target yet: start from where the piece is
        gameArea.x = gamePiece.x + gamePiece.width / 2;
        gameArea.y = gamePiece.y + gamePiece.height / 2;
    }
    gameArea.x = Math.max(0, Math.min(gameArea.canvas.width, gameArea.x + dx * TOUCH_GAIN));
    gameArea.y = Math.max(0, Math.min(gameArea.canvas.height, gameArea.y + dy * TOUCH_GAIN));
}

function forgetTouch(id) { // a finger is gone: release its action and hand steering to the newest other steering finger
    var info = touch.roles[id];
    delete touch.roles[id];
    if (!info) {
        return null;
    }
    if (ACTIONS[info.role]) {
        releaseAction(info.role, "touch");
    }
    if (id === touch.steerId) {
        touch.steerId = null;
        var next = null;
        for (var other in touch.roles) {
            var o = touch.roles[other];
            if (o.role == "steer" && (!next || o.order > next.order)) {
                next = o;
            }
        }
        if (next) { // continue from where that finger is, so the piece doesn't jump
            touch.steerId = next.id;
            touch.lastX = next.x;
            touch.lastY = next.y;
        }
    }
    return info;
}

function reconcileTouches(list) { // let go of any finger the browser no longer reports (a lost touchend)
    var down = {};
    for (var i = 0; i < list.length; i++) {
        down[list[i].identifier] = true;
    }
    for (var id in touch.roles) {
        if (!down[id]) {
            forgetTouch(touch.roles[id].id);
        }
    }
    activeTouches = list.length;
}

function onTouchStart(e) {
    if (e.cancelable) {
        e.preventDefault(); // no scrolling, zooming or made-up mouse events
    }
    lastTouchTime = Date.now();
    reconcileTouches(e.touches);
    window.focus(); // as for mouse clicks: an embedded game needs focus to receive keys and stay unpaused
    var wasTouch = inputMode == "touch";
    setInputMode("touch");
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var p = toGame(t.clientX, t.clientY);
        var info = { id: t.identifier, x: p.x, y: p.y, order: ++touch.order, role: "none", pausedAt: pause ? pauseNo : -1, switched: !wasTouch };
        if (menuUp() || !gameStart) {
            setHovered(buttonAt(p.x, p.y)); // press feedback, on whichever screen is up
            if (calTaking() && !buttonAt(p.x, p.y)) { // the timing test: a finger taps as it comes down, anywhere but
                calTap(eventTime(e)); // on BACK
            }
        } else if (deathAnimUp()) { // the death animation plays out whatever is pressed: the touch does nothing
        } else if (wasTouch && pauseButtonAt(p.x, p.y)) { // a pause button, on the panel that was showing: not an
            info.role = "pbutton"; // action and not a resume, and it keeps the role until it lifts
            info.button = pauseButtonAt(p.x, p.y);
            setPauseHover(info.button);
        } else if (storyUp()) { // a story screen: the finger presses it when it lifts
            info.role = "story";
        } else if (runFinished) {
            if (Date.now() - finishTime >= 1000) {
                restartArmed = true; // same rule as a mouse click: only a touch that starts on the finish screen, after 1s
            }
        } else if (resultsUp) { // a cleared level's results: a touch that starts on a button, once they take one, and
            // not one that only switched them to the touch layout
            var choice = wasTouch && resultsReady() ? resultButtonAt(p.x, p.y) : "";
            if (choice) {
                info.role = "result";
                info.result = choice;
                setResultsHover(choice);
            }
        } else {
            // the buttons also work between levels, so an action held into the next level is held in it (as with the
            // mouse); a touch that switches from mouse play steers, as the buttons weren't showing
            var button = wasTouch ? touchButtonAt(p.x, p.y) : "";
            info.role = button || "steer"; // a finger keeps its role until it lifts, even if it slides off its button
            if (ACTIONS[button]) {
                pressAction(button, "touch", eventTime(e));
            } else if (!button) { // the newest steering finger steers
                touch.steerId = t.identifier;
                touch.lastX = p.x;
                touch.lastY = p.y;
            }
        }
        touch.roles[t.identifier] = info;
    }
}

function onTouchMove(e) {
    if (e.cancelable) {
        e.preventDefault();
    }
    lastTouchTime = Date.now();
    reconcileTouches(e.touches);
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var p = toGame(t.clientX, t.clientY);
        var info = touch.roles[t.identifier];
        if (!info) {
            continue;
        }
        info.x = p.x;
        info.y = p.y;
        if (menuUp() || !gameStart) {
            setHovered(buttonAt(p.x, p.y));
        } else if (info.role == "result") { // lit while the finger is still on the button it came down on
            setResultsHover(resultButtonAt(p.x, p.y) == info.result ? info.result : "");
        } else if (info.role == "pbutton") {
            setPauseHover(pauseButtonAt(p.x, p.y) == info.button ? info.button : "");
        } else if (t.identifier === touch.steerId) {
            var dx = p.x - touch.lastX;
            var dy = p.y - touch.lastY;
            touch.lastX = p.x; // movement while paused or between levels is dropped, not saved up
            touch.lastY = p.y;
            if (alive && !pause && !resumeTimer) {
                steerBy(dx, dy);
            }
        }
    }
}

function onTouchEnd(e) { // touchend and touchcancel
    if (e.cancelable) {
        e.preventDefault();
    }
    lastTouchTime = Date.now();
    var last = null;
    var switched = false; // the lifted finger switched the start screen from the mouse layout
    for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        var p = toGame(t.clientX, t.clientY);
        last = p;
        var info = forgetTouch(t.identifier);
        switched = !!(info && info.switched);
        if (!info || e.type == "touchcancel") {
            continue;
        }
        if (info.role == "pause" && (!pause || resumeTimer) && touchButtonAt(p.x, p.y) == "pause") { // also stops a countdown
            setPause(true);
        } else if (info.role == "story") {
            storyPress();
        } else if (info.role == "result") { // lifted on the button it came down on: that's the choice
            if (resultButtonAt(p.x, p.y) == info.result) {
                chooseResult(info.result);
            } else {
                setResultsHover("");
            }
        } else if (info.role == "pbutton") { // lifted on the pause button it came down on: pressed. Slid off: nothing
            if (pauseButtonAt(p.x, p.y) == info.button) {
                pausePress(info.button);
            } else {
                setPauseHover("");
            }
        } else if (pause && info.pausedAt == pauseNo && Date.now() - pauseStart > 300) { // began during this pause
            startResumeCountdown(); // a tap anywhere resumes (after the pause has been up for a moment)
        }
    }
    reconcileTouches(e.touches);
    if (e.type == "touchcancel") {
        if (!gameStart && e.touches.length === 0) {
            setHovered(""); // no start-screen button stays pressed
        }
        setResultsHover(""); // nor a results one
        setPauseHover(""); // nor a pause one
        if (alive) {
            releaseAll(); // a system gesture took the touch: pause rather than let the player die
        }
        return;
    }
    if (e.touches.length === 0 && last) {
        if (menuUp()) { // up over the start screen or over a paused level: either way it owns the tap
            setHovered("");
            menuPress(buttonAt(last.x, last.y), last); // a tap on nothing does nothing: it must not start or resume
        } else if (!gameStart) {
            var button = buttonAt(last.x, last.y);
            setHovered("");
            if (switched) {
                // this tap switched the start screen to the touch layout; it only shows it
            } else if (button && START_BUTTONS[button].menu) {
                openMenu(START_BUTTONS[button].menu);
            } else if (button && START_BUTTONS[button].setting) {
                cycleSetting(START_BUTTONS[button].setting);
            } else {
                openMenu("difficulty"); // a tap anywhere else is START: the difficulty screen, whose buttons start the run
            }
        } else if (runFinished && restartArmed) {
            restartRun();
        }
    }
}

// The controller, read every frame while one is connected: the Gamepad API has no events for its buttons, only its
// state to poll. In play a press goes to its action, timed by when the controller last reported rather than when the
// frame noticed, and the sticks steer as a finger does, moving where the piece is heading at a speed they set. On a
// screen they move between its buttons, lighting one, and the buttons press it.
var PAD_DEAD = 0.2; // of a stick's travel that does nothing: a stick at rest sits a little off centre
var PAD_SPEED = 1.8; // the piece's top speed on the stick, in lengths of the window's shorter side a second...
var PAD_CURVE = 1.5; // ...reached along this curve, so a small push is a fine adjustment
var PAD_DPAD = 0.75; // how hard the D-pad pushes, as a stick would
var PAD_PRESS = 0.5, PAD_LET_GO = 0.35; // an analogue trigger goes down past the one, and up again under the other
var PAD_POINT = 0.5; // how far a stick must lean to point a way on a screen, or to count as picking the controller up
var PAD_REPEAT_FIRST = 400, PAD_REPEAT = 150; // ms: a way held on a screen moves again after the first, then every
var pads = { frame: null, last: 0, down: {}, screen: "", dir: "", repeatAt: 0 }; // the polling; each controller's
    // buttons as they last were; and the screen and the way the last frame saw

function padsNow() { // the connected controllers: none where the page isn't allowed them
    try {
        var list = navigator.getGamepads ? navigator.getGamepads() : [];
        return Array.prototype.filter.call(list || [], function (p) { return p && p.connected; });
    } catch (e) { // a frame whose permissions policy leaves controllers out throws here
        return [];
    }
}

function startPadPolling() { // a controller showed itself (a browser shows one to the page on its first press)
    if (pads.frame === null && padsNow().length) {
        pads.last = performance.now();
        pads.frame = requestAnimationFrame(pollPads);
    }
}

function stickPush(x, y) { // a stick's lean past the dead zone, along the curve: { x, y }, 0 to 1 long
    var m = Math.sqrt(x * x + y * y);
    if (!(m > PAD_DEAD)) { // NaN from a broken reading, too
        return { x: 0, y: 0 };
    }
    var k = Math.pow(Math.min(1, (m - PAD_DEAD) / (1 - PAD_DEAD)), PAD_CURVE) / m;
    return { x: x * k, y: y * k };
}

function padDirection(v) { // the way a lean points on a screen: "left", "right", "up", "down", or "" for none
    if (Math.max(Math.abs(v.x), Math.abs(v.y)) < PAD_POINT) {
        return "";
    }
    return Math.abs(v.x) > Math.abs(v.y) ? (v.x < 0 ? "left" : "right") : (v.y < 0 ? "up" : "down");
}

function pollPads(now) { // one frame of every controller: its buttons' changes, then its sticks
    pads.frame = null;
    var list = padsNow();
    var real = performance.now();
    var edges = []; // the buttons that went down or came up since the last frame, in order
    var lean = { x: 0, y: 0 }, push = { x: 0, y: 0 }; // the sticks and D-pads, all together: as leant, and as steered
    var seen = {};
    list.forEach(function (p) {
        seen[p.index] = true;
        var was = pads.down[p.index] || {};
        var down = {};
        var time = typeof p.timestamp == "number" && p.timestamp > 0 && p.timestamp <= real && real - p.timestamp < 250
            ? p.timestamp : real; // when it last reported: a press happened then, not when this frame came round
        for (var i = 0; i < p.buttons.length; i++) {
            var b = p.buttons[i];
            var v = typeof b == "number" ? b : b.value || (b.pressed ? 1 : 0);
            down[i] = v >= (was[i] ? PAD_LET_GO : PAD_PRESS);
            if (down[i] != !!was[i]) {
                edges.push({ button: i, down: down[i], time: time, source: "pad" + p.index + ":" + i });
            }
        }
        pads.down[p.index] = down;
        var dx = (down[PAD.right] ? 1 : 0) - (down[PAD.left] ? 1 : 0);
        var dy = (down[PAD.down] ? 1 : 0) - (down[PAD.up] ? 1 : 0);
        var dm = Math.sqrt(dx * dx + dy * dy) || 1;
        var sticks = [[p.axes[0], p.axes[1]]];
        if (p.mapping == "standard") {
            sticks.push([p.axes[2], p.axes[3]]); // the right stick steers too, for whoever prefers it
        }
        sticks.forEach(function (s) {
            var x = +s[0] || 0, y = +s[1] || 0;
            var curved = stickPush(x, y);
            lean.x += x;
            lean.y += y;
            push.x += curved.x;
            push.y += curved.y;
        });
        lean.x += dx / dm;
        lean.y += dy / dm;
        push.x += PAD_DPAD * dx / dm;
        push.y += PAD_DPAD * dy / dm;
    });
    for (var gone in pads.down) { // a controller unplugged: whatever it held, it holds no longer
        if (!seen[gone]) {
            for (var button in pads.down[gone]) {
                if (pads.down[gone][button]) {
                    edges.push({ button: Number(button), down: false, time: real, source: "pad" + gone + ":" + button });
                }
            }
            delete pads.down[gone];
        }
    }
    var m = Math.sqrt(push.x * push.x + push.y * push.y);
    if (m > 1) {
        push.x /= m;
        push.y /= m;
    }
    var dir = padDirection(lean);
    if (dir || edges.some(function (e) { return e.down; })) {
        setInputMode("pad"); // before the presses, so what they bring up is worded for the controller
    }
    edges.forEach(function (e) { padButton(e.button, e.down, e.time, e.source); });
    if (canAct()) {
        if (inputMode == "pad") { // only then: an idle controller's drifting stick mustn't move a mouse's piece
            padSteer(push, Math.min(0.1, Math.max(0, (now - pads.last) / 1000)));
        }
        pads.screen = "";
        pads.repeatAt = Infinity; // a way held from play into a screen waits to be let go before it moves anything
    } else {
        var screen = padScreen();
        if (screen != pads.screen) {
            pads.screen = screen;
            pads.repeatAt = Infinity; // and so does one held from one screen into the next
        } else if (dir && dir != pads.dir) {
            padMove(screen, dir);
            pads.repeatAt = now + PAD_REPEAT_FIRST;
        } else if (dir && now >= pads.repeatAt) {
            padMove(screen, dir);
            pads.repeatAt = now + PAD_REPEAT;
        }
        if (inputMode == "pad" && screen && !padFocus(screen)) { // a screen worked with the controller always has a
            setPadFocus(screen, padDefault(screen)); // button lit, so A is never a guess
        }
    }
    pads.dir = dir;
    pads.last = now;
    if (list.length) {
        pads.frame = requestAnimationFrame(pollPads);
    }
}

function padSteer(push, dt) { // the sticks move where the piece is heading, as a finger does, from wherever it is; in
    // laser form, only up and down
    if (!push.x && !push.y) {
        return;
    }
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    if (gameArea.x === undefined) {
        gameArea.x = gamePiece.x + gamePiece.width / 2;
        gameArea.y = gamePiece.y + gamePiece.height / 2;
    }
    var step = PAD_SPEED * Math.min(W, H) * dt;
    if (form != "laser") {
        gameArea.x = Math.max(0, Math.min(W, gameArea.x + push.x * step));
    }
    gameArea.y = Math.max(0, Math.min(H, gameArea.y + push.y * step));
}

function padButton(button, down, time, source) { // a controller button went down or came up
    if (onlineEntryUp()) { // a name being asked for (online.js): A posts it, B passes, and nothing else is heard
        if (down && button == PAD.a) {
            onlineSubmit();
        } else if (down && button == PAD.b) {
            onlineSkip();
        }
        return;
    }
    var action = actionForPad(button);
    if (!down) {
        if (action) {
            releaseAction(action, source);
        }
        return;
    }
    if (canAct()) { // playing: its action, or the pause
        if (button == PAD.start) {
            setPause(true);
        } else if (action) {
            pressAction(action, source, time);
        }
        return;
    }
    var screen = padScreen();
    if (calTaking() && action && button != PAD.b) { // the timing test: a hit button taps (B still backs out)
        calTap(time);
        return;
    }
    if (button == PAD.a) {
        padConfirm(screen);
    } else if (button == PAD.b) {
        padBack(screen);
    } else if (button == PAD.start) {
        padStart(screen);
    }
}

function padScreen() { // the screen a controller is working: "menu", "start", "pause", "results", "finish", "story",
    // "death" (the animation), or "" for none it can (a level playing, a touch resume counting down)
    if (menuUp()) {
        return "menu";
    }
    if (storyUp()) {
        return "story";
    }
    if (deathAnimUp()) {
        return "death";
    }
    if (!gameStart) {
        return "start";
    }
    if (alive) {
        return pause && !resumeTimer ? "pause" : "";
    }
    return resultsUp ? "results" : runFinished ? "finish" : "";
}

function padFocus(screen) { // the button lit on it
    return screen == "start" || screen == "menu" ? hoveredButton : screen == "pause" ? pauseHover
        : screen == "results" ? resultsHover : "";
}

function setPadFocus(screen, name) {
    if (screen == "start" || screen == "menu") {
        setHovered(name);
    } else if (screen == "pause") {
        setPauseHover(name);
    } else if (screen == "results") {
        setResultsHover(name);
    }
}

function padTargets(screen) { // its buttons, their middles and half their sizes, each list in one frame of reference:
    // { name, x, y, hw, hh }
    if (screen == "start" || screen == "menu") {
        return Object.keys(buttonTable()).map(function (name) {
            var g = geom(name);
            return g ? { name: name, x: g.dx + g.w / 2, y: g.dy + g.h / 2, hw: g.w / 2, hh: g.h / 2 } : null;
        }).filter(Boolean);
    }
    if (screen == "pause" || screen == "results") { // messages: where the fit put them
        return msgButtons.map(function (b) {
            return { name: b.name, x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2,
                hw: (b.right - b.left) / 2, hh: (b.bottom - b.top) / 2 };
        });
    }
    return [];
}

function padDefault(screen) { // the button lit when a controller comes to a screen: the way on
    if (screen == "start") {
        return "start";
    }
    if (screen == "menu" && menuScreen == "scores") { // the board shown
        return "sc_kind_" + scoresView.kind;
    }
    if (screen == "menu" && difficultyScreen()) { // the difficulty chosen last
        return "diff_" + difficulty;
    }
    if (screen == "menu" && menuScreen == "practice") { // PLAY, the way on
        return "pr_play";
    }
    if (screen == "menu" && menuScreen == "levels") { // the level a player carrying on would play
        return "level_" + (levelNextUp() || RUN_LEVELS);
    }
    if (screen == "results") {
        return resultPrimary();
    }
    var list = padTargets(screen); // the pause's RESUME, a menu's first row
    return list.length ? list[0].name : "";
}

function padMove(screen, dir) { // light the nearest button that way, if there is one: one wholly past the lit one's
    // edge, nearest along the way, and closer to straight on counts for more. Straight on is anything the way passes
    // over, edge to edge: a row of two under a wide button is under it, not off to either side, and between those the
    // one whose middle is nearer
    var list = padTargets(screen);
    var from = null;
    list.forEach(function (c) {
        if (c.name == padFocus(screen)) {
            from = c;
        }
    });
    if (!from) {
        setPadFocus(screen, padDefault(screen));
        return;
    }
    var best = "", bestScore = Infinity;
    list.forEach(function (c) {
        var dx = c.x - from.x, dy = c.y - from.y;
        var along = dir == "left" ? -dx : dir == "right" ? dx : dir == "up" ? -dy : dy;
        var side = dir == "left" || dir == "right";
        var past = along - (side ? c.hw + from.hw : c.hh + from.hh); // edge to edge along the way
        var across = side ? Math.abs(dy) : Math.abs(dx); // middle to middle
        var gap = Math.max(0, across - (side ? c.hh + from.hh : c.hw + from.hw)); // and edge to edge
        var score = along + 2 * gap + across / 1000;
        if (past > -1 && score < bestScore) {
            bestScore = score;
            best = c.name;
        }
    });
    if (best) {
        setPadFocus(screen, best);
    }
}

function padConfirm(screen) { // A: press the lit button, or the one that would be lit
    var name = padFocus(screen) || padDefault(screen);
    if (screen == "start") {
        var b = START_BUTTONS[name];
        if (name == "start") {
            openMenu("difficulty"); // START: the difficulty screen, whose buttons start the run
        } else if (b && b.menu) {
            openMenu(b.menu);
        } else if (b && b.setting) {
            cycleSetting(b.setting);
        }
    } else if (screen == "menu") {
        menuPress(name);
    } else if (screen == "pause") {
        pausePress(name);
    } else if (screen == "results") {
        chooseResult(name);
    } else if (screen == "finish") {
        padPlayAgain();
    } else if (screen == "story") {
        storyPress();
    } // and nothing on the death animation, which plays out
}

function padBack(screen) { // B: out of a menu, or back into the level from the pause
    if (screen == "menu") {
        closeMenu();
    } else if (screen == "pause") {
        pausePress("resume");
    }
}

function padStart(screen) { // START: the way on from wherever it is pressed
    if (screen == "start") {
        openMenu("difficulty"); // START: the difficulty screen, whose buttons start the run
    } else if (screen == "menu") {
        closeMenu();
    } else if (screen == "pause") {
        pausePress("resume");
    } else if (screen == "results") {
        chooseResult(resultPrimary());
    } else if (screen == "finish") {
        padPlayAgain();
    } else if (screen == "story") {
        storyPress();
    }
}

function padPlayAgain() { // the finish screen's play again: as a click, not in its first second
    if (runFinished && Date.now() - finishTime >= 1000) {
        restartRun();
    }
}

function bindInput() { // the touch, mouse, keyboard, controller and page listeners, registered once by gameArea.load.
    // The touch ones go on the canvas; the rest on the window and the document, so a press anywhere is a press
    window.addEventListener("gamepadconnected", startPadPolling); // then read every frame while one stays connected
    startPadPolling(); // one the page can already see
    var touchOptions = { passive: false }; // so preventDefault can stop scrolling, zooming and made-up mouse events
    gameArea.canvas.addEventListener("touchstart", onTouchStart, touchOptions);
    gameArea.canvas.addEventListener("touchmove", onTouchMove, touchOptions);
    gameArea.canvas.addEventListener("touchend", onTouchEnd, touchOptions);
    gameArea.canvas.addEventListener("touchcancel", onTouchEnd, touchOptions);
    document.addEventListener("gesturestart", function (e) { e.preventDefault(); }, touchOptions); // iOS pinch zoom
    document.addEventListener("gesturechange", function (e) { e.preventDefault(); }, touchOptions);
    window.addEventListener("orientationchange", function () { setTimeout(windowResize, 300); }); // iOS can report the new size late
    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            releaseAll();
        } else if (audioCtx) {
            beatAudio(); // back: the audio woken, if the browser put it to sleep meanwhile
        }
        themeSync(); // the menu theme stops out of sight, and comes back with the page (theme.js)
    });
    window.addEventListener("pagehide", releaseAll);
    window.addEventListener('click', function (e) {
        if (touchEcho(e)) {
            return;
        }
        if (layoutClick) { // the press switched the start screen to the mouse layout; the click only shows it
            layoutClick = false;
            return;
        }
        var p = toGame(e.pageX, e.pageY);
        var button = (gameStart && !menuUp()) ? "" : buttonAt(p.x, p.y);
        if (menuUp()) {
            menuPress(button, p); // a press on nothing here does nothing: it must not reach the game
        } else if (button == "start") {
            openMenu("difficulty"); // the difficulty screen, whose buttons start the run
        } else if (button && START_BUTTONS[button].menu) {
            openMenu(START_BUTTONS[button].menu);
        } else if (button && START_BUTTONS[button].setting) {
            cycleSetting(START_BUTTONS[button].setting);
        } else if (storyUp()) { // a story screen: the rest of its lore, or on
            storyPress();
        } else if (runFinished && restartArmed) { // play again from the finish screen
            restartRun();
        } else if (resultsArmed && resultButtonAt(p.x, p.y)) { // a button on a level's results
            chooseResult(resultButtonAt(p.x, p.y));
        } else if (pauseArmed && pauseButtonAt(p.x, p.y)) { // HELP, RETRY or QUIT, from the pause panel
            pausePress(pauseButtonAt(p.x, p.y));
        }
    });
    window.addEventListener('mousedown', function (e) {
        e.preventDefault();
        if (touchEcho(e)) {
            return;
        }
        var wasMouse = inputMode == "mouse";
        layoutClick = !gameStart && !activeTouches && !wasMouse;
        if (!activeTouches) {
            setInputMode("mouse");
        }
        window.focus(); // preventDefault stops the page taking focus when embedded in an iframe
        if (deathAnimUp()) { // the death animation plays out whatever is pressed: the press goes nowhere
            return;
        }
        if (e.button == 0 && runFinished && Date.now() - finishTime >= 1000) {
            // only a click that starts on the finish screen restarts, and not in the first second,
            // so a press held as the last level ends doesn't wipe the results before they're seen
            restartArmed = true;
        }
        // and a cleared level's buttons take a click that starts once they are ready, on the layout that was showing;
        // the pause panel's, one that starts while it is up
        resultsArmed = e.button == 0 && wasMouse && resultsReady();
        pauseArmed = e.button == 0 && wasMouse && alive && pause && !menuUp();
        var action = actionForMouse(e.button);
        if (calTaking() && action) { // the timing test: a click taps as it goes down, anywhere but on BACK
            var at = toGame(e.pageX, e.pageY);
            if (!buttonAt(at.x, at.y)) {
                calTap(eventTime(e));
            }
        }
        if (action) {
            pressAction(action, "mouse", eventTime(e));
        }
    });
    window.addEventListener('mouseup', function (e) {
        e.preventDefault();
        if (touchEcho(e)) {
            return;
        }
        var action = actionForMouse(e.button);
        if (action) {
            releaseAction(action, "mouse");
        }
    });
    window.addEventListener('mousemove', function (e) {
        if (touchEcho(e)) {
            return;
        }
        if (!activeTouches && Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0) >= 2) {
            setInputMode("mouse"); // a real mouse moved (small jitter doesn't count)
        }
        if (inputMode != "mouse") {
            return;
        }
        mouseMove(e); // start-screen hover
        var over = toGame(e.pageX, e.pageY);
        if (resultsUp) { // and a cleared level's buttons'
            setResultsHover(resultButtonAt(over.x, over.y));
        } else if (alive && pause) { // and the pause panel's
            setPauseHover(pauseButtonAt(over.x, over.y));
        }
        ACTION_NAMES.forEach(function (name) { // catch buttons released outside the window
            var b = ACTIONS[name].mouse;
            if (b === undefined) {
                return;
            }
            var down = (e.buttons & MOUSE_BIT[b]) != 0;
            if (held[name].mouse && !down) {
                releaseAction(name, "mouse");
            }
        });
        if (gameStart) { // the piece follows the cursor (movePiece moves it there each step)
            var p = toGame(e.pageX, e.pageY);
            gameArea.x = p.x;
            gameArea.y = p.y;
        }
    });
    window.addEventListener('blur', releaseAll); // releases aren't seen while the window is unfocused; don't keep playing
    window.addEventListener('keydown', function (e) {
        if (onlineEntryUp()) { // a name being typed (online.js): its panel has the keys
            return;
        }
        var key = keyName(e);
        if (key == "Escape" && menuUp()) { // a menu screen's other way out, for anyone who expects it
            e.preventDefault();
            closeMenu();
            return;
        }
        if (deathAnimUp() && !e.ctrlKey && !e.metaKey) { // the death animation plays out whatever is pressed: nothing
            e.preventDefault(); // hears the key
            return;
        }
        if (calTaking() && actionForKey(key) && !e.ctrlKey && !e.metaKey) { // the timing test: an action key taps
            e.preventDefault();
            if (!e.repeat) {
                calTap(eventTime(e));
            }
            return;
        }
        if (!e.repeat && !e.ctrlKey && !e.metaKey && calKey(key)) { // and on its reading, ENTER uses it and R goes again
            e.preventDefault();
            return;
        }
        if (storyUp() && (key == "Enter" || key == " " || key == "Escape" || actionForKey(key))
            && !e.ctrlKey && !e.metaKey) { // a story screen: ENTER, SPACE, ESCAPE or an action key presses it, and
            e.preventDefault(); // nothing else hears the key
            if (!e.repeat) {
                storyPress();
            }
            return;
        }
        if (key == "l" && !e.repeat && !menuUp() && !gameStart && !e.ctrlKey && !e.metaKey) {
            e.preventDefault(); // the level select, from the start screen
            openMenu("levels");
            return;
        }
        if (key == "h" && !e.repeat && !menuUp() && (!gameStart || (alive && pause)) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault(); // the instructions, from the start screen or from a pause (Ctrl+H is the browser's)
            stopResume(); // a resume already counting down would come back under them
            openMenu("help");
            return;
        }
        if (key == "r" && runFinished && !e.repeat && !e.ctrlKey && !e.metaKey) { // R = play again (Ctrl+R still reloads)
            restartRun();
        }
        if (resultsUp && resultForKey(key) && !e.ctrlKey && !e.metaKey) {
            // a level's results: a clear's R = RETRY, ENTER or SPACE = CONTINUE; a death's R, ENTER or SPACE = TRY
            // AGAIN (PLAY AGAIN at the game over) and Q = QUIT. Nothing else hears the key, not even the action SPACE
            // is bound to
            e.preventDefault();
            if (!e.repeat) {
                chooseResult(resultForKey(key));
            }
            return;
        }
        if ((key == "r" || key == "q") && alive && pause && !menuUp() && !e.ctrlKey && !e.metaKey) {
            e.preventDefault(); // the pause panel's RETRY and QUIT
            if (!e.repeat) {
                pausePress(key == "r" ? "retry" : "quit");
            }
            return;
        }
        if ((key == "p" || key == "Escape") && !e.ctrlKey && !e.metaKey) { // pause, and again to resume (Ctrl+P is
            e.preventDefault(); // the browser's: print, not pause)
            if (!e.repeat) { // holding the key shouldn't flip pause on every key repeat
                setPause(!pause);
            }
        }
        var action = actionForKey(key);
        if (action) {
            e.preventDefault();
            if (!e.repeat) { // a held key repeats, and a repeat is not a press
                pressAction(action, key, eventTime(e));
            }
        }
    });
    window.addEventListener('keyup', function (e) {
        var action = actionForKey(keyName(e));
        if (action) {
            releaseAction(action, keyName(e));
        }
    });
}
