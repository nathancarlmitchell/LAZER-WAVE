// Lazer Wave -- the input. The actions and what is bound to them; the keys and mouse buttons, the touch fingers and
// which of them steers, the on-screen touch buttons and their drawing, the pause and the touch resume countdown, the
// input mode that follows the last real input, and the listeners that feed all of it, which gameArea.load binds once
// through bindInput. index.html loads this with a plain <script src>, as globals rather than modules, so the game
// still opens straight off disk. Nothing here runs at load beyond the tables and one matchMedia question.
//
// It reaches into the menus (buttonAt, openMenu, closeMenu, menuPress, cycleSetting), the level flow (startGame,
// startTouchGame, restartRun), the loop (gameArea, onActionPress, onActionRelease) and the paused redraw (drawLevel);
// the game reaches back for canAct, actionHeld, setPause, touchButtons and drawTouchControls.

// The actions: every button the game has, and what triggers it on each input. The game hears about them through
// onActionPress and onActionRelease (loop.js), once per real change: a second source pressing an action already held
// is not a second press, and it carries the moment the input actually happened (the event's timeStamp), which a
// rhythm game judges by: a handler can run a frame late when the page is busy. A power that lasts while held should read actionHeld each step rather than trusting the
// events, since a release during a pause or between levels is recorded but not announced.
//   keys:  keyName() values ("Shift", " ", "z", ...)     mouse: a MouseEvent.button (0 left, 1 middle, 2 right)
//   label: the touch button's text and the help screen's name for it
//   beat:  the colour of beat it hits (waves.js), which is also its name, so a colour finds the action that hits it
//   lit:   when its touch button should stand out, if ever
const ACTIONS = {
    cyan: { label: "CYAN", keys: ["z"], mouse: 0, color: COLORS.cyan, beat: "cyan",
        help: "on a cyan beat, as your waves meet: the top wave lights up for it" },
    magenta: { label: "MAGENTA", keys: ["x"], mouse: 2, color: COLORS.magenta, beat: "magenta",
        help: "on a magenta beat: the bottom wave lights. A beat with no laser takes either" },
    overdrive: { label: "OVERDRIVE", keys: [" "], mouse: 1, color: COLORS.laserCore,
        lit: function () { return driveReady(); },
        help: "when the meter beside your shields is full: two bars untouchable, double points" },
};
const ACTION_NAMES = Object.keys(ACTIONS); // in the order they are laid out, first in the corner

var held = {}; // what is holding each action down: which of its keys, the mouse, and how many fingers
ACTION_NAMES.forEach(function (name) { held[name] = { keys: {}, mouse: false, touch: 0 }; });

// Input: the mouse (with keyboard) or touch. inputMode follows the last real input and picks the labels and controls.
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
    gameArea.canvas.style.cursor = pause ? "default" : "none"; // let the player line the cursor back up with their piece
    if (pause) {
        pauseStart = Date.now();
        pauseNo++;
        pauseMusic(); // a rhythm game's clock is the song: it has to stop when the game does
        drawPauseScreen();
    } else { // exclude paused time from the completion timer, and from the level's split
        startTime += Date.now() - pauseStart;
        levelStart += Date.now() - pauseStart;
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

function startResumeCountdown() { // touch resume: 3, 2, 1 (400ms each), so the player can put their thumbs down first
    if (resumeTimer || !pause || !alive || menuUp()) {
        return;
    }
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

function drawPauseScreen(countdown) { // drawn once over the frozen frame; countdown is the touch resume's 3-2-1
    if (inputMode == "touch") {
        drawTouchPauseScreen(countdown);
        return;
    }
    useBand(PAUSE_BAND); // the panel, not the whole frame
    var centerX = LAYOUT_W / 2;
    var centerY = LAYOUT_H / 2;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(centerX - 220, centerY - 70, 440, 160);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.magenta;
    ctx.font = "60px Arial";
    ctx.fillText("PAUSED", centerX, centerY);
    ctx.fillStyle = COLORS.text;
    ctx.font = "25px Arial";
    ctx.fillText("P to resume,  H for instructions", centerX, centerY + 40);
    ctx.font = "18px Arial";
    ctx.fillText("Move the cursor onto your piece first", centerX, centerY + 72);
    ctx.textAlign = "start"; // the rest of the game draws left-aligned text
    useWindow();
}

function drawTouchPauseScreen(countdown) { // touch play: tap anywhere to resume (steering is relative, so nothing to line up)
    drawLevel(); // a clean frame under the panel
    useBand(TOUCH_PAUSE_BAND);
    var centerX = LAYOUT_W / 2;
    var centerY = LAYOUT_H / 2;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(centerX - 280, centerY - 120, 560, 240);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.magenta;
    if (countdown) {
        ctx.font = "140px Arial";
        ctx.fillText(countdown, centerX, centerY + 50);
    } else {
        ctx.font = "72px Arial";
        ctx.fillText("PAUSED", centerX, centerY - 40);
        ctx.fillStyle = COLORS.text;
        ctx.font = "40px Arial";
        ctx.fillText("TAP TO RESUME", centerX, centerY + 18);
        ctx.font = "24px Arial";
        ctx.fillText("Your piece stays put. Drag to steer.", centerX, centerY + 56);
        var h = PAUSE_HELP; // the one tap here that does something other than resume
        ctx.fillStyle = COLORS.cyan;
        ctx.fillRect(centerX + h.dx, centerY + h.dy, h.w, h.h);
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(centerX + h.dx + 2, centerY + h.dy + 2, h.w - 4, h.h - 4);
        ctx.fillStyle = COLORS.magenta;
        ctx.font = "26px Arial";
        ctx.fillText("HELP 説明", centerX + h.dx + h.w / 2, centerY + h.dy + h.h / 2 + 9, h.w - 12);
    }
    ctx.textAlign = "start";
    useWindow();
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
    return { 16: "Shift", 17: "Control", 27: "Escape", 32: " ", 72: "h", 80: "p", 82: "r" }[e.keyCode] || key;
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
            drawLevel();
            drawPauseScreen();
        }
    } else if (alive && mode == "mouse") {
        drawLevel(); // without the touch controls
        setPause(true); // the cursor is somewhere else: pause so the player can line it up with the piece
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
        ctx.fillText(a.label, c.x, c.y, 1.7 * c.r); // squeezed to fit the circle rather than spill out of it
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
        } else if (pause && alive && pauseHelpAt(p.x, p.y)) {
            info.role = "phelp"; // not an action and not a resume: it keeps the role until it lifts
        } else if (runFinished) {
            if (Date.now() - finishTime >= 1000) {
                restartArmed = true; // same rule as a mouse click: only a touch that starts on the finish screen, after 1s
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
        } else if (info.role == "phelp" && pauseHelpAt(p.x, p.y)) {
            openMenu("help"); // over the frozen level; closing it puts the panel back
        } else if (pause && info.pausedAt == pauseNo && Date.now() - pauseStart > 300) { // began during this pause
            startResumeCountdown(); // a tap anywhere resumes (after the pause has been up for a moment)
        }
    }
    reconcileTouches(e.touches);
    if (e.type == "touchcancel") {
        if (!gameStart && e.touches.length === 0) {
            setHovered(""); // no start-screen button stays pressed
        }
        if (alive) {
            releaseAll(); // a system gesture took the touch: pause rather than let the player die
        }
        return;
    }
    if (e.touches.length === 0 && last) {
        if (menuUp()) { // up over the start screen or over a paused level: either way it owns the tap
            setHovered("");
            menuPress(buttonAt(last.x, last.y)); // a tap on nothing does nothing: it must not start or resume
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
                startTouchGame(); // a tap anywhere else starts (it has to be on touchend for sound to be allowed)
            }
        } else if (runFinished && restartArmed) {
            restartRun();
        }
    }
}

function bindInput() { // the touch, mouse, keyboard and page listeners, registered once by gameArea.load. The touch
    // ones go on the canvas; the rest on the window and the document, so a press anywhere is a press
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
        }
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
            menuPress(button); // a press on nothing here does nothing: it must not reach the game
        } else if (button == "start") {
            startGame({ pageX: p.x, pageY: p.y });
        } else if (button && START_BUTTONS[button].menu) {
            openMenu(START_BUTTONS[button].menu);
        } else if (button && START_BUTTONS[button].setting) {
            cycleSetting(START_BUTTONS[button].setting);
        } else if (runFinished && restartArmed) { // play again from the finish screen
            restartRun();
        }
    });
    window.addEventListener('mousedown', function (e) {
        e.preventDefault();
        if (touchEcho(e)) {
            return;
        }
        layoutClick = !gameStart && !activeTouches && inputMode != "mouse";
        if (!activeTouches) {
            setInputMode("mouse");
        }
        window.focus(); // preventDefault stops the page taking focus when embedded in an iframe
        if (e.button == 0 && runFinished && Date.now() - finishTime >= 1000) {
            // only a click that starts on the finish screen restarts, and not in the first second,
            // so a press held as the last level ends doesn't wipe the results before they're seen
            restartArmed = true;
        }
        var action = actionForMouse(e.button);
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
        var key = keyName(e);
        if (key == "Escape" && menuUp()) { // a menu screen's other way out, for anyone who expects it
            e.preventDefault();
            closeMenu();
            return;
        }
        if (key == "h" && !e.repeat && !menuUp() && (!gameStart || (alive && pause))) {
            e.preventDefault(); // the instructions, from the start screen or from a pause
            stopResume(); // a resume already counting down would come back under them
            openMenu("help");
            return;
        }
        if (key == "r" && runFinished && !e.repeat && !e.ctrlKey && !e.metaKey) { // R = play again (Ctrl+R still reloads)
            restartRun();
        }
        if (key == "p") {
            e.preventDefault();
            if (!e.repeat) { // holding P shouldn't flip pause on every key repeat
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
