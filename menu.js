// Lazer Wave -- the start screen and its menus. The buttons of the start, settings and help screens and what they do,
// the settings they cycle and remember, the hover flash, the slogans, and the glitches that tear the start screen now
// and then. index.html loads this with a plain <script src>, as globals rather than modules, so the game still opens
// straight off disk. Nothing here runs at load beyond building the tables: the timers are started by onLoad, in the
// game's script, once everything they draw with exists.
//
// It draws with the game's canvas and context (ctx, gameArea), reads its input mode, and reaches the records and the
// difficulty through their own functions; the game reaches in for the screens (drawStartScreen, openMenu, closeMenu),
// the hit test (buttonAt, geom), the settings (loadSettings, cycleSetting) and the timers (startMenuTimers,
// startScreenIntervals).

var GAME_TITLE = "LAZER WAVE";
var GAME_TITLE_JP = "レーザーウェーブ";

// start-screen buttons, relative to the center of the layout; used for drawing, hover and clicks
// `touch` is the bigger layout used for touch play (labels centered in the boxes)
const START_BUTTONS = {
    start: { dx: -410, dy: -32, w: 300, h: 60, label: "CLICK TO START", sub: "クリックして開始",
        touch: { dx: -450, dy: -60, w: 400, h: 150 }, touchLabel: "TAP TO START", touchSub: "タップして開始" },
    // the run's difficulty, under START because it decides the run, and the two screens of their own
    difficulty: { dx: -410, dy: 60, w: 300, h: 44, setting: "difficulty",
        touch: { dx: -450, dy: 110, w: 400, h: 90 } },
    options: { dx: -410, dy: 124, w: 300, h: 44, menu: "options",
        touch: { dx: 60, dy: -60, w: 400, h: 110 } },
    help: { dx: -410, dy: 188, w: 300, h: 44, menu: "help",
        touch: { dx: 60, dy: 80, w: 400, h: 110 } },
};

var menuScreen = ""; // which menu screen is up: "" for none, "options" for the settings, "help" for the
                     // instructions. The instructions are the one that can also come up over a paused level

function menuUp() {
    return menuScreen != "";
}

// the settings screen's own buttons. One layout for both mouse and touch: it is a menu of its own, with room to be
// read either way, so there is nothing for the start screen's two layouts to disagree about
const OPTION_BUTTONS = {
    options_effects: { dx: -300, dy: -176, w: 600, h: 70, setting: "options" },
    options_steering: { dx: -300, dy: -96, w: 600, h: 70, setting: "steering" },
    options_buttons: { dx: -300, dy: -16, w: 600, h: 70, setting: "buttons" },
    options_timing: { dx: -300, dy: 64, w: 600, h: 70, setting: "timing" },
    options_back: { dx: -170, dy: 214, w: 340, h: 64, back: true, label: "BACK" },
};

function buttonTable() { // whichever screen's buttons are live
    return menuScreen == "options" ? OPTION_BUTTONS : menuScreen == "help" ? HELP_BUTTONS : START_BUTTONS;
}

function buttonDef(name) { // a live button's definition, for the things that only need its flags
    return buttonTable()[name];
}

const FX_MODES = ["auto", "full", "reduced", "off"]; // what the effects button cycles through
const FX_MODE_LABELS = { auto: "Auto", full: "Full", reduced: "Reduced", off: "Off" };
const TOUCH_GAINS = [0.75, 1, 1.25, 1.5, 2]; // px the piece moves per px of finger
const TOUCH_SIDES = ["right", "left"]; // the edge the action buttons sit against, for the hand that holds the phone
const TIMING_OFFSETS = [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100]; // ms: how late this player's presses land
var timingOffset = 0; // taken off every press before it is judged (loop.js), so a steady lateness can be tuned out

function effectsLabel() { // what the effects button reads: for "auto", also what the device is asking for
    var name = FX_MODE_LABELS[fxMode] || fxMode;
    return fxMode == "auto" ? name + " (" + FX_MODE_LABELS[fxLook()] + ")" : name;
}

// each setting is a value cycled by its own button and remembered between runs. read() is what the button says,
// pick() takes a stored string and returns the value to use, or undefined if it isn't one of ours
const SETTINGS = {
    options: { store: "lazerwave.effects",
        read: function () { return "EFFECTS: " + effectsLabel().toUpperCase(); },
        next: function () { fxMode = FX_MODES[(FX_MODES.indexOf(fxMode) + 1) % FX_MODES.length]; return fxMode; },
        pick: function (v) { return FX_MODES.indexOf(v) >= 0 ? v : undefined; },
        apply: function (v) { fxMode = v; } },
    steering: { store: "lazerwave.steering",
        read: function () { return "STEERING: " + TOUCH_GAIN.toFixed(2) + "x"; },
        next: function () {
            var i = TOUCH_GAINS.indexOf(TOUCH_GAIN); // an unlisted value (an old save, a hand edit) steps to the first
            TOUCH_GAIN = TOUCH_GAINS[(i + 1) % TOUCH_GAINS.length];
            return String(TOUCH_GAIN);
        },
        pick: function (v) { return TOUCH_GAINS.indexOf(parseFloat(v)) >= 0 ? parseFloat(v) : undefined; },
        apply: function (v) { TOUCH_GAIN = v; } },
    difficulty: { store: "lazerwave.difficulty", // its button is on the start screen, but it is stored like the rest
        read: function () { return mode().label; },
        next: function () {
            var i = 0;
            while (i < DIFFICULTIES.length && DIFFICULTIES[i].name != difficulty) { i++; }
            difficulty = DIFFICULTIES[(i + 1) % DIFFICULTIES.length].name;
            return difficulty;
        },
        pick: function (v) {
            for (var i = 0; i < DIFFICULTIES.length; i++) {
                if (DIFFICULTIES[i].name === v) { return v; }
            }
            return undefined;
        },
        apply: function (v) { difficulty = v; } },
    timing: { store: "lazerwave.timing",
        read: function () { return "TIMING OFFSET: " + (timingOffset > 0 ? "+" : "") + timingOffset + " ms"; },
        next: function () {
            var i = TIMING_OFFSETS.indexOf(timingOffset);
            timingOffset = TIMING_OFFSETS[(i + 1) % TIMING_OFFSETS.length];
            return String(timingOffset);
        },
        pick: function (v) { return TIMING_OFFSETS.indexOf(parseFloat(v)) >= 0 ? parseFloat(v) : undefined; },
        apply: function (v) { timingOffset = v; } },
    buttons: { store: "lazerwave.buttons",
        read: function () { return "BUTTONS: " + TOUCH_SIDE.toUpperCase(); },
        next: function () {
            TOUCH_SIDE = TOUCH_SIDES[(TOUCH_SIDES.indexOf(TOUCH_SIDE) + 1) % TOUCH_SIDES.length];
            return TOUCH_SIDE;
        },
        pick: function (v) { return TOUCH_SIDES.indexOf(v) >= 0 ? v : undefined; },
        apply: function (v) { TOUCH_SIDE = v; } },
};

function loadSettings() { // whatever was chosen last time, if the browser will tell us
    for (var name in SETTINGS) {
        var s = SETTINGS[name];
        try {
            var saved = s.pick(window.localStorage.getItem(s.store));
            if (saved !== undefined) {
                s.apply(saved);
            }
        } catch (e) { // private windows and blocked storage throw rather than return null: keep the default
        }
    }
}

function cycleSetting(name) { // a settings button: step to its next value and remember it
    var s = SETTINGS[name];
    var value = s.next();
    try {
        window.localStorage.setItem(s.store, value);
    } catch (e) { // nothing to do: the setting still applies for this run
    }
    playSound(aud_click);
    drawStartScreen();
}

var hoveredButton = ""; // start-screen button under the mouse (or finger)

function startLayout() { // "classic" (the mouse layout) or "touch" (bigger, centered buttons)
    return inputMode == "touch" ? "touch" : "classic";
}

function geom(name) { // a live button's rectangle, or null if it isn't on the screen that is up
    if (menuUp()) {
        return buttonTable()[name] || null; // a menu screen has one layout, so there is nothing to choose
    }
    var b = START_BUTTONS[name];
    if (!b) {
        return null;
    }
    return startLayout() == "classic" ? b : b.touch;
}

function buttonAt(px, py) { // name of the live button at a window point, or ""
    var f = screenFrame();
    if (!(f.scale > 0)) {
        return "";
    }
    var lx = (px - f.x) / f.scale; // the point in layout coordinates
    var ly = (py - f.y) / f.scale;
    var table = buttonTable();
    for (var name in table) {
        var b = geom(name);
        if (!b) {
            continue; // not shown in this layout, so nothing to hit
        }
        var left = LAYOUT_W / 2 + b.dx;
        var top = LAYOUT_H / 2 + b.dy;
        if (lx > left && lx < left + b.w && ly > top && ly < top + b.h) {
            return name;
        }
    }
    return "";
}

function mouseMove(event) { // highlight the button under the mouse, on the start screen or on a menu over a pause
    if (!gameStart || menuUp()) {
        var p = toGame(event.clientX, event.clientY);
        setHovered(buttonAt(p.x, p.y));
    }
}

function setHovered(name) { // highlight one button (or none)
    if (name != hoveredButton) { // only one button highlighted at a time
        drawStartScreen(); // erase the old highlight
        hoveredButton = name;
    }
}

function drawStartButtonText() { // the START button's label, in the current fill style
    var b = START_BUTTONS.start, g = geom("start");
    var touch = startLayout() == "touch";
    var cx = LAYOUT_W / 2 + g.dx + g.w / 2, cy = LAYOUT_H / 2 + g.dy;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = (touch ? 44 : 26) + "px Arial";
    ctx.fillText(touch ? b.touchLabel : b.label, cx, cy + g.h * (touch ? 0.45 : 0.48));
    ctx.font = (touch ? 28 : 18) + "px Arial";
    ctx.fillText(touch ? b.touchSub : b.sub, cx, cy + g.h * (touch ? 0.8 : 0.85));
    ctx.restore();
}

function drawTitle(shadowColor, passes) { // the title: stacked shadow copies, then magenta on top
    ctx.font = "80px Arial";
    ctx.fillStyle = shadowColor;
    for (let count = 130 - passes; count < 130; count++){ // Bold effect
        ctx.fillText(GAME_TITLE, count, count + 80);
        ctx.fillText(GAME_TITLE_JP, count + 100, count + 180);
    }
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText(GAME_TITLE, 130, 210);
    ctx.fillText(GAME_TITLE_JP, 230, 310);
}

function title_colors(){ // Flashing colors on start screen
    if (menuUp()) {
        return; // a menu screen is up: these run on a timer and would paint the title over it
    }
    useLayout();
    drawTitle(getRandomNeon(), 3);
    useWindow();
}

function start_button_colors(){ // Flashing colors on the start button
    if (menuUp()) {
        return;
    }
    if (hoveredButton == "start" || (inputMode == "touch" && !hoveredButton)) { // in touch play START always flashes
        var g = geom("start");
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = getRandomNeon();
        var i_x = getRandomInteger(-1, 1);
        var i_y = getRandomInteger(-1, 1);
        useLayout();
        ctx.fillRect(LAYOUT_W / 2 + g.dx + i_x, LAYOUT_H / 2 + g.dy + i_y, g.w + i_x, g.h + i_y);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = COLORS.text;
        drawStartButtonText();
        useWindow();
    }
}

var flashNo = 0; // ticks of the hover flash. Its colours are hashed off this rather than drawn from Math.random,
                 // because the instructions can be up over a paused level and the spawns' stream must not move

function flashColor() { // a colour for this tick of the flash, none from the spawns' stream
    flashNo++;
    var c = "#";
    for (var i = 0; i < 3; i++) {
        c += ("0" + Math.floor(fxHash(flashNo, i) * 256).toString(16)).slice(-2);
    }
    return c;
}

function highlightControl() { // Flashing edge on the hovered button, on whichever menu screen is up
    var g = buttonDef(hoveredButton) ? geom(hoveredButton) : null;
    if (!g) {
        return; // nothing under the cursor, or nothing shown in this layout
    }
    var bx = LAYOUT_W / 2 + g.dx, by = LAYOUT_H / 2 + g.dy;
    useScreenFrame(); // a menu row is fitted to its screen's band; the start screen's buttons are in the whole frame
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = flashColor();
    ctx.fillRect(bx, by, g.w, 2);
    ctx.fillRect(bx, by + g.h - 2, g.w, 2);
    ctx.fillRect(bx, by, 2, g.h);
    ctx.fillRect(bx + g.w - 2, by, 2, g.h);
    ctx.globalAlpha = 1.0;
    useWindow();
}

// the slogan over the title, and where it sits, in layout coordinates. One is picked again every three seconds; the
// room it has is about 420 layout px at 40px Arial
var sloganText = "";
var sloganY = 120;
var sloganX = 100;
const SLOGANS = ["Now in neon!", "Feel the beat", "Ride the wave", "Stay in time", "Don't blink", "Synthwave certified",
    "Lasers included", "On the one", "Off-beat is death", "Now with rhythm", "Coming soon!", "Press H for help",
    "波に乗れ", "リズムを感じて", "光線注意"];

function updateSloganText() { // pick a random slogan and redraw the start screen
    sloganText = SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
    drawStartScreen();
}

function drawMenuButton(g, label, font) { // a framed button: a cyan edge, the ground inside, a magenta label
    var bx = LAYOUT_W / 2 + g.dx, by = LAYOUT_H / 2 + g.dy;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(bx, by, g.w, g.h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(bx + 2, by + 2, g.w - 4, g.h - 4);
    ctx.fillStyle = COLORS.magenta;
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.fillText(label, bx + g.w / 2, by + g.h / 2 + parseInt(font, 10) * 0.35, g.w - 16);
    ctx.textAlign = "start";
}

function drawScreenBanners() { // the stripes every menu screen wears, so they read as one set
    useWindow();
    var k = bannerScale();
    ctx.fillStyle = COLORS.cyan;
    drawBanners(34, 30, k);
    ctx.fillStyle = COLORS.magenta;
    drawBanners(40, 20, k);
}

function drawStartScreen() { // draw the start screen, or whichever menu screen is standing in for it
    if (menuScreen == "options") {
        drawOptionsScreen();
        return;
    }
    if (menuScreen == "help") {
        drawHelpScreen();
        return;
    }
    var touch = startLayout() == "touch";

    // clear screen
    useWindow();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);

    // Title
    useLayout();
    drawTitle(COLORS.cyan, 10);

    // start button
    var g = geom("start");
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(LAYOUT_W / 2 + g.dx, LAYOUT_H / 2 + g.dy, g.w, g.h);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.text;
    drawStartButtonText();

    var small = (touch ? 34 : 22) + "px Arial";
    drawMenuButton(geom("difficulty"), mode().label, small);
    drawMenuButton(geom("options"), "OPTIONS 設定", small);
    drawMenuButton(geom("help"), "HELP 説明", small);
    if (touch) {
        ctx.fillStyle = COLORS.dim;
        ctx.font = "28px Arial";
        ctx.fillText("Drag anywhere to steer", 190, 640);
    }

    drawScreenBanners();

    // slogan
    useLayout();
    ctx.font = "40px Arial";
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText(sloganText, sloganX, sloganY);

    drawRecords();
    useWindow();
}

function drawRecords() { // low on the start screen, under the buttons; nothing at all before there is any
    var line = recordsLine();
    if (!line) {
        return;
    }
    var touch = startLayout() == "touch";
    ctx.globalAlpha = 1.0;
    ctx.font = (touch ? "30px" : "24px") + " Arial";
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText(line, touch ? 190 : 240, touch ? 690 : 680);
}

function drawOptionsScreen() { // the settings, on a screen of their own
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2;
    useWindow();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);

    useScreenFrame(); // a menu of rows to read and tap, so it is sized for the screen rather than for the frame
    ctx.textAlign = "center";
    ctx.font = "70px Arial";
    ctx.fillStyle = COLORS.cyan; // the title printed twice
    ctx.fillText("OPTIONS", cx - 4, cy - 234);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText("OPTIONS", cx, cy - 230);
    ctx.font = "28px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("設定", cx, cy - 196);
    ctx.textAlign = "start";

    for (var name in OPTION_BUTTONS) {
        var b = OPTION_BUTTONS[name];
        drawMenuButton(b, b.back ? b.label : SETTINGS[b.setting].read(), (b.back ? "36px" : "30px") + " Arial");
    }

    ctx.textAlign = "center";
    ctx.font = "20px Arial"; // neither touch setting does anything under a mouse, and the menu is where you look
    ctx.fillStyle = COLORS.dim;
    ctx.fillText("Steering and Buttons are for touch play only", cx, cy + 158);
    ctx.fillText("Timing: if hits read LATE, raise it by about that much; if EARLY, lower it", cx, cy + 186);
    ctx.fillText(inputMode == "touch" ? "Tap BACK to return" : "Click BACK, or press Escape, to return", cx, cy + 310);
    ctx.textAlign = "start";

    drawScreenBanners();
}

// The instructions, a page at a time so each can be read on a phone. Reachable from the start screen and from pause,
// and it paints its own background, so it works over the menu and over a frozen level alike.
var helpPage = 0;

const HELP_BUTTONS = {
    help_next: { dx: -310, dy: 186, w: 280, h: 66, page: true, label: "NEXT 次へ" },
    help_back: { dx: 30, dy: 186, w: 280, h: 66, back: true, label: "BACK" },
};

function helpPages() { // every page: a heading is a line of its own, and the line under it says what it does
    var touch = inputMode == "touch";
    var controls = [
        { t: "CONTROLS 操作", title: true },
        { t: touch ? "Drag anywhere to steer" : "Your piece follows the cursor" },
    ];
    ACTION_NAMES.forEach(function (name) {
        var a = ACTIONS[name];
        controls.push({ t: touch ? "TAP " + a.label : a.keys.map(function (k) { return k == " " ? "SPACE" : k.toUpperCase(); })
            .join(" or ") + (a.mouse !== undefined ? " or " + ["LEFT", "MIDDLE", "RIGHT"][a.mouse] + " CLICK" : "")
            + "  -  " + a.label, head: true });
        controls.push({ t: a.help });
    });
    controls.push({ t: touch ? "The pause icon is in the top " + (TOUCH_SIDE == "left" ? "left" : "right") + " corner"
        : "P pauses.  R plays again from the finish screen." });
    return [controls, [
        { t: "RHYTHM リズム", title: true },
        { t: "Lasers flicker as a warning, then fire on the beat" },
        { t: touch ? "and their colour is the button to tap on it"
            : "and their colour is the key to hit it with: " + keyText("cyan") + "   " + keyText("magenta") },
        { t: "HIT ON THE BEAT, IN ITS COLOUR", head: true },
        { t: "PERFECT 100, GOOD 50, times your multiplier" },
        { t: "every " + COMBO_STEP + " in a row raises it, up to x" + MULT_MAX + ". A missed or WRONG beat resets it" },
        { t: "SHIELDS", head: true },
        { t: HP_MAX + " per attempt. A laser takes one and breaks your combo" },
        { t: "Survive every bar to clear a level. There are " + RUN_LEVELS + " of them." },
    ], [
        { t: "OVERDRIVE オーバードライブ", title: true },
        { t: "PERFECTs charge the meter beside your shields, GOODs half as much" },
        { t: touch ? "FULL: TAP OVERDRIVE" : "FULL: PRESS SPACE", head: true },
        { t: "It starts on the bar line: the one you press it on, or the next" },
        { t: "and lasts two bars. The colours still count." },
        { t: "LASER FORM", head: true },
        { t: "Lasers can't hurt you, and your hits score double" },
        { t: "Fly through a laser as it fires to absorb it for a bonus" },
    ]];
}

function drawHelpScreen() { // over the start screen, or over a level that is paused: either way it paints its own ground
    var pages = helpPages();
    helpPage = helpPage % pages.length;
    useWindow();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);

    useScreenFrame();
    ctx.textAlign = "center";
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2;
    var dy = -176;
    pages[helpPage].forEach(function (line) {
        if (line.title) {
            ctx.font = "46px Arial";
            ctx.fillStyle = COLORS.cyan; // the title printed twice
            ctx.fillText(line.t, cx - 3, cy + dy + 3);
            ctx.fillStyle = COLORS.magenta;
            ctx.fillText(line.t, cx, cy + dy);
            dy += 62;
            return;
        }
        ctx.font = (line.head ? "bold 28px" : "26px") + " Arial";
        ctx.fillStyle = line.head ? COLORS.magenta : COLORS.text;
        ctx.fillText(line.t, cx, cy + dy);
        dy += line.head ? 40 : 36;
    });
    ctx.textAlign = "start";

    for (var name in HELP_BUTTONS) {
        drawMenuButton(HELP_BUTTONS[name], HELP_BUTTONS[name].label, "32px Arial");
    }
    ctx.textAlign = "center";
    ctx.font = "20px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText((helpPage + 1) + " / " + pages.length, cx, cy + 282);
    ctx.textAlign = "start";

    drawScreenBanners();
}

function helpPress(name) { // a press on the instructions: turn the page, or leave
    var b = HELP_BUTTONS[name];
    if (!b) {
        return;
    }
    playSound(aud_click);
    if (b.back) {
        closeMenu();
    } else {
        helpPage++;
        drawHelpScreen();
    }
}

var menuFlash = null; // the hover flash while a menu screen is up over a paused level: the start screen's timers
                      // are gone by then, so this one runs for exactly as long as the menu is

function openMenu(name) { // put a menu screen up, over the start screen or over a level that is paused
    hoveredButton = ""; // set directly: setHovered would redraw the screen being left or entered, twice
    menuScreen = name;
    playSound(aud_click);
    drawStartScreen();
    if (gameStart && !menuFlash) {
        menuFlash = setInterval(highlightControl, 100); // the flash the start screen's own timer would be giving it
    }
}

function closeMenu() { // and put back whatever it was covering
    if (menuFlash) {
        clearInterval(menuFlash);
        menuFlash = null;
    }
    hoveredButton = "";
    menuScreen = "";
    playSound(aud_click);
    if (gameStart) {
        stopResume(); // a countdown can't have been running under it, but a tap may have started one since
        drawLevel();
        drawPauseScreen();
    } else {
        drawStartScreen();
    }
}

function optionsPress(name) { // a press on the settings screen: cycle a row, or go back. Anything else is ignored
    var b = OPTION_BUTTONS[name];
    if (!b) {
        return;
    }
    if (b.back) {
        closeMenu();
    } else {
        cycleSetting(b.setting);
    }
}

function menuPress(name) { // a press while a menu screen is up, whichever one it is
    if (menuScreen == "options") {
        optionsPress(name);
    } else if (menuScreen == "help") {
        helpPress(name);
    }
}

// The menu glitches. Every so often a piece of the start screen tears, ghosts or gets crushed for a moment, and then
// the screen is drawn clean again. All three kinds are self-copies of what is already on the canvas -- nothing is
// redrawn from the model, so whatever a piece looked like is what tears.
// Its randomness is fxHash off a counter, not Math.random: Math.random is the stream the spawns come out of, and this
// runs on a timer, so how many draws it takes before a run starts would depend on how long the start screen sat there.
var GLITCH_EVERY = 220; // ms between rolls
// The menu arrives broken and settles: it comes up glitching hard for about two seconds, then sits at about one
// every six seconds.
var GLITCH_ARRIVE = 0.9; // how many rolls break something on the very first one
var GLITCH_CHANCE = 0.035; // and how many once it has settled
var GLITCH_SETTLE = 10; // rolls it takes to get from one to the other, about two seconds
var GLITCH_HOLD = 90; // ms the damage stays up before a clean redraw takes it away
var GLITCH_SHOVE = 26; // px a torn band can slide, in layout units
var GLITCH_BAND = 26; // and how thick a torn or tinted band is
var glitchClear = null; // the timer that will draw it clean
var glitchNo = 0; // which roll this is; everything about it is hashed off this and a slot number
var glitchSeed = Date.now() & 0xffff; // so two loads don't break in exactly the same places

function glitchRand(slot) { // repeatable within a load, and out of the spawns' way
    return fxHash(glitchSeed + glitchNo, slot);
}

function glitchChance() { // hot on arrival, easing to rare over the first couple of seconds
    var settled = Math.min(1, (glitchNo - 1) / GLITCH_SETTLE);
    return GLITCH_ARRIVE + (GLITCH_CHANCE - GLITCH_ARRIVE) * settled;
}

function glitchTargets() { // the pieces it can pick on, in layout coordinates
    var out = [
        { x: 110, y: 135, w: 620, h: 200 }, // the title, and the Japanese line under it
        { x: 90, y: 85, w: 420, h: 50 }, // the slogan
        { x: 0, y: 70, w: LAYOUT_W, h: LAYOUT_H - 140 }, // and sometimes the lot, inside the banners
    ];
    for (var name in START_BUTTONS) {
        var g = geom(name);
        if (g) {
            out.push({ x: LAYOUT_W / 2 + g.dx - 6, y: LAYOUT_H / 2 + g.dy - 6, w: g.w + 12, h: g.h + 12 });
        }
    }
    return out;
}

function glitchShove(x, y, w, h, dx) { // slide a band sideways, and leave the ground where it was
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h); dx = Math.round(dx);
    if (w <= 0 || h <= 0 || dx == 0) {
        return;
    }
    ctx.drawImage(gameArea.canvas, x, y, w, h, x + dx, y, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(dx > 0 ? x : x + w + dx, y, Math.abs(dx), h);
}

function glitchTear(r, s) { // the piece comes apart in bands, each sliding its own way
    var bands = Math.max(2, Math.min(14, Math.round(r.h / Math.max(3, GLITCH_BAND * s))));
    var bh = r.h / bands;
    for (var i = 0; i < bands; i++) {
        if (glitchRand(10 + i * 2) < 0.3) {
            continue; // not every band moves, or it reads as a wobble rather than a break
        }
        glitchShove(r.x, r.y + i * bh, r.w, bh, (glitchRand(11 + i * 2) - 0.5) * 2 * GLITCH_SHOVE * s);
    }
}

function glitchGhost(r, s) { // a second copy pulls out sideways, tinted: the two colours the screen already wears
    var dx = Math.round((glitchRand(40) < 0.5 ? -1 : 1) * (3 + glitchRand(41) * 7) * s);
    var x = Math.round(r.x), y = Math.round(r.y), w = Math.round(r.w), h = Math.round(r.h);
    if (w <= 0 || h <= 0 || dx == 0) {
        return;
    }
    ctx.globalAlpha = 0.45;
    ctx.drawImage(gameArea.canvas, x, y, w, h, x + dx, y, w, h);
    ctx.globalAlpha = 0.22; // tinted in bands rather than as one flat box, so it reads as colour noise
    ctx.fillStyle = dx < 0 ? COLORS.cyan : COLORS.magenta;
    for (var i = 0; i < 4; i++) {
        var bh = Math.min(h, Math.round(GLITCH_BAND * s * (0.3 + glitchRand(42 + i * 2) * 0.7)));
        ctx.fillRect(x + dx, Math.round(y + glitchRand(43 + i * 2) * Math.max(0, h - bh)), w, bh);
    }
    ctx.globalAlpha = 1;
}

function glitchCrush(r, s) { // one band squashed into a shorter one, with the ground under it: a dropped scanline run
    var bh = Math.max(6, Math.min(r.h, GLITCH_BAND * s * (1.5 + glitchRand(50) * 1.5)));
    var by = Math.round(r.y + glitchRand(51) * Math.max(0, r.h - bh));
    var x = Math.round(r.x), w = Math.round(r.w);
    bh = Math.round(bh);
    var nh = Math.max(2, Math.round(bh * (0.35 + glitchRand(52) * 0.4)));
    if (w <= 0 || bh <= 0) {
        return;
    }
    ctx.drawImage(gameArea.canvas, x, by, w, bh, x, by, w, nh);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x, by + nh, w, bh - nh);
}

function menuGlitch(force) { // break a piece of the start screen for a moment
    if (gameStart || menuUp() || fxLook() != "full") {
        return; // not the start screen, or the player asked for less motion: this is the noisiest thing on it
    }
    glitchNo++; // every roll, fired or not, so two in a row are never the same damage
    if (force === undefined && glitchRand(1) > glitchChance()) {
        return;
    }
    var f = layoutFrame();
    if (!(f.scale > 0)) {
        return; // a window with no size to speak of: nothing to copy from
    }
    drawStartScreen(); // clean first, so a clear that ran late can never let two of them pile up
    var targets = glitchTargets();
    var t = targets[Math.floor(glitchRand(2) * targets.length)];
    var r = { x: f.x + f.scale * t.x, y: f.y + f.scale * t.y, w: f.scale * t.w, h: f.scale * t.h };
    ctx.save();
    useWindow(); // a self-copy is in canvas pixels, whatever the layout was drawn at
    var kind = force === undefined ? Math.floor(glitchRand(3) * 3) : force;
    if (kind == 0) {
        glitchTear(r, f.scale);
    } else if (kind == 1) {
        glitchGhost(r, f.scale);
    } else {
        glitchCrush(r, f.scale);
    }
    ctx.restore();
    if (glitchClear) {
        clearTimeout(glitchClear);
    }
    glitchClear = setTimeout(function () { // whatever it broke, the next clean draw puts back
        glitchClear = null;
        if (!gameStart) {
            drawStartScreen();
        }
    }, GLITCH_HOLD);
}

// start screen animation, stopped when the game starts (same-delay timers run in creation order). Started from
// onLoad rather than while this script runs: a tick that landed before the game's script had loaded would reach for
// the canvas and the game's state before they existed
var startScreenIntervals = [];

function startMenuTimers() {
    startScreenIntervals = [
        setInterval(updateSloganText, 3000),
        setInterval(title_colors, 100),
        setInterval(start_button_colors, 50),
        setInterval(highlightControl, 100),
        setInterval(menuGlitch, GLITCH_EVERY), // and one that breaks a piece of it now and then
    ];
}
