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
        touch: { dx: -450, dy: -60, w: 400, h: 150 }, touchLabel: "TAP TO START", touchSub: "タップして開始",
        padLabel: "PRESS A TO START", padSub: "Aボタンで開始" }, // a controller: the mouse layout, its own words
    // the level select, under START: the other way into a run. START itself opens the difficulty screen
    // (DIFFICULTY_BUTTONS), which starts the run
    levels: { dx: -410, dy: 60, w: 300, h: 44, menu: "levels",
        touch: { dx: -450, dy: 110, w: 400, h: 100 } },
    // practice (practice.js): any of the levels' makings put together and played, unrecorded
    practice: { dx: -410, dy: 124, w: 300, h: 44, menu: "practice",
        touch: { dx: 60, dy: -60, w: 400, h: 90 } },
    options: { dx: -410, dy: 188, w: 300, h: 44, menu: "options",
        touch: { dx: 60, dy: 50, w: 400, h: 90 } },
    help: { dx: -410, dy: 252, w: 300, h: 44, menu: "help",
        touch: { dx: 60, dy: 160, w: 400, h: 90 } },
};

var menuScreen = ""; // which menu screen is up: "" for none, "difficulty" for the difficulty screen START opens,
                     // "options" for the settings, "help" for the instructions, "levels" for the level select,
                     // "practice" for the practice screen (practice.js), "calibrate" for the timing test
                     // (calibrate.js), which opens from the settings. The instructions are the one that can also come
                     // up over a paused level

function menuUp() {
    return menuScreen != "";
}

// the difficulty screen, which START opens: a run begins from the difficulty pressed (difficultyPress), each button
// saying what its difficulty gives; BACK leaves
const DIFFICULTY_BUTTONS = {
    diff_easy: { dx: -320, dy: -150, w: 640, h: 86, pick: "easy" },
    diff_normal: { dx: -320, dy: -54, w: 640, h: 86, pick: "normal" },
    diff_hard: { dx: -320, dy: 42, w: 640, h: 86, pick: "hard" },
    diff_true: { dx: -320, dy: 138, w: 640, h: 86, pick: "true" },
    diff_back: { dx: -170, dy: 270, w: 340, h: 56, back: true, label: "BACK" },
};

// the settings screen's own buttons. One layout for both mouse and touch: it is a menu of its own, with room to be
// read either way, so there is nothing for the start screen's two layouts to disagree about. The effects and the
// overdrive share a row, as do the two volumes and the two settings only touch play uses
const OPTION_BUTTONS = {
    options_effects: { dx: -300, dy: -176, w: 292, h: 70, setting: "options" },
    options_overdrive: { dx: 8, dy: -176, w: 292, h: 70, setting: "overdrive" },
    options_music: { dx: -300, dy: -96, w: 292, h: 70, setting: "music" },
    options_sfx: { dx: 8, dy: -96, w: 292, h: 70, setting: "sfx" },
    options_steering: { dx: -300, dy: -16, w: 292, h: 70, setting: "steering" },
    options_buttons: { dx: 8, dy: -16, w: 292, h: 70, setting: "buttons" },
    options_timing: { dx: -300, dy: 64, w: 400, h: 70, setting: "timing" },
    options_calibrate: { dx: 116, dy: 64, w: 184, h: 70, menu: "calibrate", label: "CALIBRATE" }, // finds it by ear
    options_back: { dx: -170, dy: 214, w: 340, h: 64, back: true, label: "BACK" },
};

function buttonTable() { // whichever screen's buttons are live
    return menuScreen == "options" ? OPTION_BUTTONS : menuScreen == "help" ? HELP_BUTTONS
        : menuScreen == "difficulty" ? DIFFICULTY_BUTTONS : menuScreen == "levels" ? levelButtons()
        : menuScreen == "practice" ? practiceButtons() : menuScreen == "calibrate" ? calButtons() : START_BUTTONS;
}

function buttonDef(name) { // a live button's definition, for the things that only need its flags
    return buttonTable()[name];
}

const FX_MODES = ["auto", "full", "reduced", "off"]; // what the effects button cycles through
const FX_MODE_LABELS = { auto: "Auto", full: "Full", reduced: "Reduced", off: "Off" };
const VOLUME_LEVELS = [1, 0.75, 0.5, 0.25, 0]; // how loud the song (musicLevel, music.js) or the sound effects
                                              // (sfxLevel, audio.js) play, down to off, and round again
const TOUCH_GAINS = [0.75, 1, 1.25, 1.5, 2]; // px the piece moves per px of finger
const TOUCH_SIDES = ["right", "left"]; // the edge the action buttons sit against, for the hand that holds the phone
const TIMING_OFFSETS = [-100, -80, -60, -40, -20, 0, 20, 40, 60, 80, 100]; // ms: how late this player's presses land,
                                                                            // the steps its button goes through
var TIMING_LIMIT = 300; // ms either way it can be. The timing test (calibrate.js) can find one between the steps or past
var TIMING_STEP = 5; // them (a wireless headset's delay, say), kept to whole steps of this
var timingOffset = 0; // taken off every press before it is judged (loop.js), so a steady lateness can be tuned out

function volumeText(v) { // "75%", or "OFF"
    return v > 0 ? Math.round(100 * v) + "%" : "OFF";
}

function nextVolume(v) { // the next level down, and from off back to full; an unlisted value steps to the first
    return VOLUME_LEVELS[(VOLUME_LEVELS.indexOf(v) + 1) % VOLUME_LEVELS.length];
}

function pickVolume(v) { // a stored volume, if it is one of the levels
    return VOLUME_LEVELS.indexOf(parseFloat(v)) >= 0 ? parseFloat(v) : undefined;
}

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
    music: { store: "lazerwave.music",
        read: function () { return "MUSIC: " + volumeText(musicLevel); },
        next: function () {
            setMusicLevel(nextVolume(musicLevel));
            return String(musicLevel);
        },
        pick: pickVolume,
        apply: function (v) { setMusicLevel(v); } },
    sfx: { store: "lazerwave.sfx", // the click its button makes is at the new level, so each press is heard at it
        read: function () { return "SOUND FX: " + volumeText(sfxLevel); },
        next: function () {
            sfxLevel = nextVolume(sfxLevel);
            return String(sfxLevel);
        },
        pick: pickVolume,
        apply: function (v) { sfxLevel = v; } },
    overdrive: { store: "lazerwave.overdrive", // AUTO spends a full meter at once; MANUAL leaves it to SPACE (autoDrive, loop.js)
        read: function () { return "OVERDRIVE: " + (autoDrive ? "AUTO" : "MANUAL"); },
        next: function () {
            autoDrive = !autoDrive;
            return autoDrive ? "auto" : "manual";
        },
        pick: function (v) { return v == "auto" ? true : v == "manual" ? false : undefined; },
        apply: function (v) { autoDrive = v; } },
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
        read: function () { return "TIMING OFFSET: " + msText(timingOffset); },
        next: function () { // the next step up, and round from the last to the first: an offset the timing test set
            // between two steps goes on to the one over it
            var up = TIMING_OFFSETS.filter(function (v) { return v > timingOffset; });
            timingOffset = up.length ? up[0] : TIMING_OFFSETS[0];
            return String(timingOffset);
        },
        pick: function (v) { // a step, or anything the timing test could have set
            var n = parseFloat(v);
            return isFinite(n) && Math.abs(n) <= TIMING_LIMIT && n % TIMING_STEP == 0 ? n : undefined;
        },
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
    storeSetting(name, SETTINGS[name].next());
    playSound(aud_click);
    drawStartScreen();
}

function setSetting(name, value) { // a setting given a value outright (the timing test's), and remembered
    SETTINGS[name].apply(value);
    storeSetting(name, String(value));
}

function storeSetting(name, value) {
    try {
        window.localStorage.setItem(SETTINGS[name].store, value);
    } catch (e) { // nothing to do: the setting still applies for this run
    }
}

function msText(ms) { // "+45 ms", "0 ms", "-20 ms"
    return (ms > 0 ? "+" : "") + ms + " ms";
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
        hoveredButton = name;
        drawStartScreen(); // erase the old highlight, and draw what goes with the new one (the practice screen's tooltip)
    }
}

function drawStartButtonText() { // the START button's label, in the current fill style
    var b = START_BUTTONS.start, g = geom("start");
    var touch = startLayout() == "touch";
    var cx = LAYOUT_W / 2 + g.dx + g.w / 2, cy = LAYOUT_H / 2 + g.dy;
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = (touch ? 44 : 26) + "px Arial";
    var pad = inputMode == "pad";
    ctx.fillText(touch ? b.touchLabel : pad ? b.padLabel : b.label, cx, cy + g.h * (touch ? 0.45 : 0.48));
    ctx.font = (touch ? 28 : 18) + "px Arial";
    ctx.fillText(touch ? b.touchSub : pad ? b.padSub : b.sub, cx, cy + g.h * (touch ? 0.8 : 0.85));
    ctx.restore();
}

// The title's two lines, each at its magenta face's baseline in layout coordinates, and how deep the stack of shadow
// copies under them runs: shared with the laser that sweeps behind it (titlelight.js), which has to know its shape
const TITLE_LINES = [{ text: GAME_TITLE, x: 130, y: 210 }, { text: GAME_TITLE_JP, x: 230, y: 310 }];
const TITLE_FONT = "80px Arial";
const TITLE_DEPTH = 10;

function drawTitle(shadowColor, passes, c) { // the title: stacked shadow copies, then magenta on top; on the game's
    // canvas unless given another context
    c = c || ctx;
    c.font = TITLE_FONT;
    c.fillStyle = shadowColor;
    for (let k = passes; k > 0; k--) { // Bold effect: copies trailing up and left, a pixel apart
        TITLE_LINES.forEach(function (l) { c.fillText(l.text, l.x - k, l.y - k); });
    }
    c.fillStyle = COLORS.magenta;
    TITLE_LINES.forEach(function (l) { c.fillText(l.text, l.x, l.y); });
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

var flashNo = 0; // ticks of the hover flash. Its colours are hashed off this rather than drawn from Math.random, as
                 // every effect's are (fxHash): the same flash on every run, and nothing drawn draws on chance

function flashColor() { // a colour for this tick of the flash, hashed, as the effects' colours are
    flashNo++;
    var c = "#";
    for (var i = 0; i < 3; i++) {
        c += ("0" + Math.floor(fxHash(flashNo, i) * 256).toString(16)).slice(-2);
    }
    return c;
}

function highlightControl() { // Flashing edge on the hovered button, on whichever menu screen is up
    var g = buttonDef(hoveredButton) ? geom(hoveredButton) : null;
    if (!g || (g.inactive && g.inactive())) {
        return; // nothing under the cursor, nothing shown in this layout, or a button greyed out (practice.js)
    }
    var out = menuScreen == "levels" || menuScreen == "practice" ? 5 : 0; // the level select's tiles, and practice's,
    // wear their own colours at the edge: the flash
    var t = out ? 3 : 2; // goes round them instead, in the gap between, thicker
    var bx = LAYOUT_W / 2 + g.dx - out, by = LAYOUT_H / 2 + g.dy - out, w = g.w + 2 * out, h = g.h + 2 * out;
    useScreenFrame(); // a menu row is fitted to its screen's band; the start screen's buttons are in the whole frame
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = flashColor();
    ctx.fillRect(bx, by, w, t);
    ctx.fillRect(bx, by + h - t, w, t);
    ctx.fillRect(bx, by, t, h);
    ctx.fillRect(bx + w - t, by, t, h);
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

function drawMenuButton(g, label, font, note) { // a framed button: a cyan edge, the ground inside, a magenta label,
    // and under the label, given one, a note in a line or two, dim and smaller, the label moved up to leave it room
    var bx = LAYOUT_W / 2 + g.dx, by = LAYOUT_H / 2 + g.dy, size = parseInt(font, 10);
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(bx, by, g.w, g.h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(bx + 2, by + 2, g.w - 4, g.h - 4);
    ctx.fillStyle = COLORS.magenta;
    ctx.font = font;
    ctx.textAlign = "center";
    if (!note) {
        ctx.fillText(label, bx + g.w / 2, by + g.h / 2 + size * 0.35, g.w - 16);
    } else {
        var noteSize = Math.round(size * 0.55), pitch = noteSize + 4;
        var top = by + (g.h - (size + 4 + note.length * pitch)) / 2; // the label and the note, stacked, centred
        ctx.fillText(label, bx + g.w / 2, top + size * 0.85, g.w - 16);
        ctx.font = noteSize + "px Arial";
        ctx.fillStyle = COLORS.dim;
        note.forEach(function (line, i) {
            ctx.fillText(line, bx + g.w / 2, top + size + 4 + i * pitch + noteSize * 0.85, g.w - 16);
        });
    }
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
    if (menuScreen == "difficulty") {
        drawDifficultyScreen();
        return;
    }
    if (menuScreen == "options") {
        drawOptionsScreen();
        return;
    }
    if (menuScreen == "help") {
        drawHelpScreen();
        return;
    }
    if (menuScreen == "levels") {
        drawLevelsScreen();
        return;
    }
    if (menuScreen == "practice") {
        drawPracticeScreen();
        return;
    }
    if (menuScreen == "calibrate") {
        drawCalibrateScreen();
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
    drawTitle(COLORS.cyan, TITLE_DEPTH);

    // start button
    var g = geom("start");
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(LAYOUT_W / 2 + g.dx, LAYOUT_H / 2 + g.dy, g.w, g.h);
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.text;
    drawStartButtonText();

    var small = (touch ? 34 : 22) + "px Arial";
    drawMenuButton(geom("levels"), "LEVELS レベル", small);
    drawMenuButton(geom("practice"), "PRACTICE 練習", small);
    drawMenuButton(geom("options"), "OPTIONS 設定", small);
    drawMenuButton(geom("help"), "HELP 説明", small);

    drawScreenBanners();

    useLayout();
    drawStartText();
    useWindow();
    titleLight(); // the laser behind the title (titlelight.js), if it isn't already sweeping: it stops by itself
    titleParticles(); // and the particles behind it all (titleparticles.js), which have to know what they pass behind
}

function drawStartText(c) { // the start screen's lines round its title and buttons, in layout coordinates: the slogan
    // over the title, and the sound note. On the game's canvas unless given another context, as the title is
    c = c || ctx;
    c.globalAlpha = 1.0;
    c.font = "40px Arial";
    c.fillStyle = COLORS.magenta;
    c.fillText(sloganText, sloganX, sloganY);
    drawSoundNote(c);
}

function drawSoundNote(c) { // with a controller, until the page has had a click or a key: browsers let sound start only
    // from those, and a controller's buttons don't count, so the beat would be silent
    if (inputMode != "pad" || !navigator.userActivation || navigator.userActivation.hasBeenActive) {
        return;
    }
    c.font = "22px Arial";
    c.fillStyle = COLORS.dim;
    c.fillText("For sound, click or press a key once: the browser won't start it from a controller", 240, 718);
}

function drawDifficultyScreen() { // the difficulty screen, which START opens: a button a difficulty, each saying what it
    // gives, the one chosen last washed in cyan; pressing one starts the run on it
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2;
    useWindow();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);

    useScreenFrame();
    ctx.textAlign = "center";
    ctx.font = "70px Arial";
    ctx.fillStyle = COLORS.cyan; // the title printed twice, as the other menus' are
    ctx.fillText("DIFFICULTY", cx - 4, cy - 234);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText("DIFFICULTY", cx, cy - 230);
    ctx.font = "28px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("難易度", cx, cy - 196);
    ctx.textAlign = "start";

    for (var name in DIFFICULTY_BUTTONS) {
        var b = DIFFICULTY_BUTTONS[name], d = b.pick ? difficultyNamed(b.pick) : null;
        drawMenuButton(b, d ? d.label : b.label, (b.back ? "36px" : "32px") + " Arial", d ? d.blurb : null);
        if (d && d.name == difficulty) { // the one chosen last: a wash of cyan inside its frame (a ground to the
            ctx.globalAlpha = 0.12; // particles, titleparticles.js)
            ctx.fillStyle = COLORS.cyan;
            ctx.fillRect(cx + b.dx + 2, cy + b.dy + 2, b.w - 4, b.h - 4);
            ctx.globalAlpha = 1.0;
        }
    }

    ctx.textAlign = "center";
    ctx.font = "20px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText("Pick one to start the run on it: records and unlocks are kept for each", cx, cy + 252);
    ctx.fillText(inputMode == "touch" ? "Tap BACK to return" : inputMode == "pad" ? "Press B to return"
        : "Click BACK, or press Escape, to return", cx, cy + 356);
    ctx.textAlign = "start";

    drawScreenBanners();
    titleParticles(); // the dust behind it, as behind the start screen (titleparticles.js)
}

function difficultyNamed(name) { // a difficulty's table entry, by its name
    for (var i = 0; i < DIFFICULTIES.length; i++) {
        if (DIFFICULTIES[i].name == name) {
            return DIFFICULTIES[i];
        }
    }
    return null;
}

function difficultyPress(name, p) { // a press on the difficulty screen: a difficulty starts the run on it (p: where the
    // pointer was, for the mouse's piece); BACK leaves
    var b = DIFFICULTY_BUTTONS[name];
    if (!b) {
        return;
    }
    if (b.back) {
        closeMenu();
    } else {
        setSetting("difficulty", b.pick);
        startRunFrom(p);
    }
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
        drawMenuButton(b, b.setting ? SETTINGS[b.setting].read() : b.label, (b.back ? "36px" : "30px") + " Arial");
    }

    ctx.textAlign = "center";
    ctx.font = "20px Arial"; // neither touch setting does anything under a mouse, and the menu is where you look
    ctx.fillStyle = COLORS.dim;
    ctx.fillText("Steering and Buttons are for touch play only", cx, cy + 158);
    ctx.fillText("Timing: CALIBRATE finds yours by ear, as you tap along to a beat", cx, cy + 186);
    ctx.fillText(inputMode == "touch" ? "Tap BACK to return" : inputMode == "pad" ? "Press B to return"
        : "Click BACK, or press Escape, to return", cx, cy + 310);
    ctx.textAlign = "start";

    drawScreenBanners();
    titleParticles(); // the dust behind it, as behind the start screen (titleparticles.js)
}

// The instructions, a page at a time so each can be read on a phone. Reachable from the start screen and from pause,
// and it paints its own background, so it works over the menu and over a frozen level alike.
var helpPage = 0;

const HELP_BUTTONS = {
    help_next: { dx: -310, dy: 186, w: 280, h: 66, page: true, label: "NEXT 次へ" },
    help_back: { dx: 30, dy: 186, w: 280, h: 66, back: true, label: "BACK" },
};

function helpPages() { // every page: a heading is a line of its own, and the line under it says what it does
    var touch = inputMode == "touch", pad = inputMode == "pad";
    var controls = [
        { t: "CONTROLS 操作", title: true },
        { t: touch ? "Drag anywhere to steer" : pad ? "The left stick or the D-pad steers"
            : "Your piece follows the cursor" },
    ];
    ACTION_NAMES.forEach(function (name) {
        var a = ACTIONS[name];
        var keys = touch ? "TAP " + a.label
            : pad ? a.padKeys.slice(0, -1).join(", ") + " or " + a.padKeys[a.padKeys.length - 1]
            : a.keys.map(function (k) { return k == " " ? "SPACE" : k.toUpperCase(); }).join(" or ")
                + (a.mouse !== undefined ? " or " + ["LEFT", "MIDDLE", "RIGHT"][a.mouse] + " CLICK" : "");
        controls.push({ t: touch ? keys : keys + "  -  " + a.label, head: true });
        controls.push({ t: a.help });
    });
    controls.push({ t: touch ? "The pause icon is in the top " + (TOUCH_SIDE == "left" ? "left" : "right") + " corner"
        : pad ? "START pauses. On a screen, A picks and B goes back."
        : "P or ESC pauses.  R plays again from the finish screen." });
    return [controls, [
        { t: "RHYTHM リズム", title: true },
        { t: "Lasers flicker as a warning, then fire on the beat" },
        { t: touch ? "and their colour is the button to tap on it"
            : "and their colour is the " + (pad ? "button" : "key") + " to hit it with: " + keyText("cyan") + "   "
                + keyText("magenta") },
        { t: "HIT ON THE BEAT, IN ITS COLOUR", head: true },
        { t: "PERFECT 100, GREAT 75, GOOD 50, BAD 25, times your multiplier and the difficulty's" },
        { t: "every " + COMBO_STEP + " in a row raises it, with no ceiling, and a run keeps it from level to level. A missed, BAD or WRONG beat resets it" },
        { t: "SHIELDS", head: true },
        { t: shieldsMax() + " to start on " + modeName() + ", kept from level to level. A laser takes one and breaks your combo" },
        { t: "PERFORMANCE", head: true },
        { t: "the meter under them starts at 75%: hits fill it, PERFECTs most, misses drain it; empty, the track is failed" },
        { t: "Survive every bar to clear a level: " + RUN_LEVELS + " of them, in " + (ACTS.length - 1) + " acts" },
    ], [
        { t: "OVERDRIVE オーバードライブ", title: true },
        { t: "PERFECTs charge the meter by your shields; GREATs three quarters, GOODs half, BADs a quarter" },
        { t: touch ? "FULL: TAP OVERDRIVE" : "FULL: PRESS " + actionKey("gate"), head: true },
        { t: "It starts on the next beat: the one you press it on, or the one after" },
        { t: "and lasts eight beats, plus a beat of grace. The colours still count." },
        { t: "LASER FORM", head: true },
        { t: "Lasers can't hurt you, and your hits score double" },
        { t: "Fly through a laser as it fires to absorb it for a bonus" },
    ], [
        { t: "WAVE / LASER 変形", title: true },
        { t: touch ? "A GATE sweeps in: tap GATE, or either colour, as it reaches you, on the beat"
            : "A GATE sweeps in: press " + actionKey("gate") + " or either colour's key as it reaches you, on the beat" },
        { t: "to switch between wave and laser. Miss one and it costs a shield" },
        { t: "LASER FORM", head: true },
        { t: "You lock to the left and fire across the screen: steer up and down" },
        { t: "Line up with each target and hit it in its colour, on its beat" },
        { t: "A laser can fire across your path: hold until it's out, then go" },
        { t: "Overdrive makes you untouchable, and widens your beam" },
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
    titleParticles(); // the dust behind it, as behind the start screen (titleparticles.js)
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

// The level select: every level, an act a row, each tile in its level's colour of the spectrum. A level opens when the
// one before it has been beaten on the difficulty chosen (levelUnlocked, run.js); an open one shows its name, and its
// best rank and best score there, the next one to beat says NEXT, and a locked one is a padlock. Picking one starts a
// run from it (startRunAt, levels.js), its act's story first if it opens one, as START's does. Its buttons are the open
// levels, the difficulty (changed here too, since the unlocks and the bests shown are the difficulty's own) and BACK,
// built as it opens, so the controller and the mouse only ever land on a level that can be played
var TILE_W = 150, TILE_H = 76, TILE_GAP = 14, ROW_GAP = 12; // a level's tile, and the room between tiles and rows
var TILE_X0 = -303, TILE_Y0 = -196; // the first tile's top left, from the layout's middle
var ACT_X = -503; // where the acts' names start
var LOCKED_EDGE = "#3a2f4d";
var levelTable = null; // the select's buttons, while it is up

function levelTile(n) { // level n's tile: its column its place in its act, its row its act
    return { dx: TILE_X0 + (levelInAct(n) - 1) * (TILE_W + TILE_GAP),
        dy: TILE_Y0 + (levelAct(n) - 1) * (TILE_H + ROW_GAP), w: TILE_W, h: TILE_H };
}

function levelButtons() { // the open levels' tiles, "level_n", each knowing its level, and BACK
    if (!levelTable) {
        levelTable = {};
        for (var n = 1; n <= RUN_LEVELS; n++) {
            if (levelUnlocked(n)) {
                var t = levelTile(n);
                t.level = n;
                levelTable["level_" + n] = t;
            }
        }
        levelTable.levels_difficulty = { dx: -320, dy: 272, w: 300, h: 56, setting: "difficulty" };
        levelTable.levels_back = { dx: 20, dy: 272, w: 300, h: 56, back: true, label: "BACK" };
    }
    return levelTable;
}

function levelNextUp() { // the first level open and not yet beaten, where a player carrying on would go; 0 if none
    for (var n = 1; n <= RUN_LEVELS; n++) {
        if (levelUnlocked(n) && !levelBeaten(n)) {
            return n;
        }
    }
    return 0;
}

function rankColor(grade) { // a grade's colour, as the results give it: an S or S+ in the title's magenta
    if (grade.charAt(0) == "S") {
        return COLORS.magenta;
    }
    var all = RANKS.concat([RANK_FAIL]);
    for (var i = 0; i < all.length; i++) {
        if (all[i].grade == grade) {
            return all[i].color;
        }
    }
    return COLORS.text;
}

function drawLevelsScreen() {
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2;
    useWindow();
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);

    useScreenFrame();
    ctx.textAlign = "center";
    ctx.font = "56px Arial";
    ctx.fillStyle = COLORS.cyan; // the title printed twice, as the other menus' are
    ctx.fillText("LEVEL SELECT", cx - 4, cy - 250);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText("LEVEL SELECT", cx, cy - 246);
    ctx.font = "24px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("レベル選択", cx, cy - 212);
    for (var a = 1; a < ACTS.length; a++) {
        drawActName(a);
    }
    var next = levelNextUp();
    for (var n = 1; n <= RUN_LEVELS; n++) {
        drawLevelTile(n, n == next);
    }
    var tb = levelButtons();
    drawMenuButton(tb.levels_difficulty, SETTINGS.difficulty.read(), "32px Arial"); // the bests shown are its own
    drawMenuButton(tb.levels_back, tb.levels_back.label, "32px Arial");
    ctx.textAlign = "start";

    drawScreenBanners();
    titleParticles(); // the dust behind it, as behind the start screen (titleparticles.js)
}

function drawActName(a) { // an act's row starts with its number and its name, in the colour of its intro; dim while
    // the act is locked
    var first = actFirstLevel(a);
    var x0 = LAYOUT_W / 2 + ACT_X, y0 = LAYOUT_H / 2 + TILE_Y0 + (a - 1) * (TILE_H + ROW_GAP);
    ctx.textAlign = "left";
    ctx.fillStyle = levelUnlocked(first) ? skyRGBA(levelColor(first + Math.floor(LEVELS_PER_ACT / 2)), 1, 0.25)
        : COLORS.dim;
    ctx.font = "bold 32px Arial";
    ctx.fillText("ACT " + roman(a), x0, y0 + 36);
    ctx.font = "17px Arial";
    ctx.fillText(ACTS[a].name, x0, y0 + 62);
}

function drawLevelTile(n, next) { // a level's tile: its number and, open, its name, and its best rank and best score
    // here, or NEXT if it is the next to beat; locked, a padlock
    var g = levelTile(n), x0 = LAYOUT_W / 2 + g.dx, y0 = LAYOUT_H / 2 + g.dy;
    var open = levelUnlocked(n), col = levelColor(n);
    ctx.fillStyle = open ? skyRGBA(col, 1) : LOCKED_EDGE;
    ctx.fillRect(x0, y0, g.w, g.h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0 + 2, y0 + 2, g.w - 4, g.h - 4);
    ctx.textAlign = "left";
    ctx.font = "bold 28px Arial";
    if (!open) {
        ctx.fillStyle = COLORS.dim;
        ctx.globalAlpha = 0.55;
        ctx.fillText(String(n), x0 + 12, y0 + 30);
        drawPadlock(x0 + g.w - 30, y0 + g.h / 2 + 6);
        ctx.globalAlpha = 1;
        return;
    }
    ctx.fillStyle = skyRGBA(col, 0.14);
    ctx.fillRect(x0 + 2, y0 + 2, g.w - 4, g.h - 4);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(String(n), x0 + 12, y0 + 30);
    ctx.font = "14px Arial";
    ctx.fillStyle = skyRGBA(col, 1, 0.5);
    ctx.fillText(levelDef(n).name, x0 + 12, y0 + 50, g.w - 24);
    var points = rec().score[n];
    if (points !== undefined) { // the best score, under the name: BEST dim, the points bright
        ctx.fillStyle = COLORS.dim;
        ctx.fillText("BEST", x0 + 12, y0 + 68);
        ctx.fillStyle = COLORS.text;
        ctx.fillText(String(points), x0 + 12 + ctx.measureText("BEST ").width, y0 + 68, g.w - 70);
    }
    ctx.textAlign = "right";
    var best = rec().rank[n];
    if (best) {
        ctx.font = "bold 26px Arial";
        if (best.charAt(0) == "S") { // printed as the title is: a cyan copy up and left, under the magenta
            ctx.fillStyle = COLORS.cyan;
            ctx.fillText(best, x0 + g.w - 12, y0 + 28);
        }
        ctx.fillStyle = rankColor(best);
        ctx.fillText(best, x0 + g.w - 10, y0 + 30);
    } else if (next) {
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = COLORS.cyan;
        ctx.fillText("NEXT", x0 + g.w - 10, y0 + 26);
    }
    ctx.textAlign = "start";
}

function drawPadlock(cx, cy) { // a padlock, its body's middle at cx, cy
    ctx.strokeStyle = COLORS.dim;
    ctx.lineWidth = 3;
    ctx.beginPath(); // the shackle
    ctx.arc(cx, cy - 7, 6, Math.PI, 0);
    ctx.lineTo(cx + 6, cy - 3);
    ctx.moveTo(cx - 6, cy - 7);
    ctx.lineTo(cx - 6, cy - 3);
    ctx.stroke();
    ctx.fillStyle = COLORS.dim;
    ctx.fillRect(cx - 10, cy - 4, 20, 15); // the body, and its keyhole
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(cx - 1.5, cy + 1, 3, 6);
}

function levelsPress(name, p) { // a press on the level select: an open level starts a run from it; BACK leaves. A
    // locked one isn't a button, so a press on it does nothing
    var b = levelButtons()[name];
    if (!b) {
        return;
    }
    if (b.back) {
        closeMenu();
    } else if (b.setting) { // the difficulty: its unlocks and the tiles' bests are its own, so the buttons are built again
        levelTable = null; // and the screen drawn again (cycleSetting draws it)
        cycleSetting(b.setting);
    } else {
        startRunAt(b.level, p);
    }
}

var menuFlash = null; // the hover flash while a menu screen is up over a paused level: the start screen's timers
                      // are gone by then, so this one runs for exactly as long as the menu is

function openMenu(name) { // put a menu screen up, over the start screen or over a level that is paused
    hoveredButton = ""; // set directly: setHovered would redraw the screen being left or entered, twice
    menuScreen = name;
    levelTable = null; // the level select's buttons are built again from the records, as they stand now
    playSound(aud_click);
    if (name == "calibrate") {
        musicPreviewStop(); // the music the MUSIC setting was playing gives way to the test's beat
        calStart(); // the beat starts: in this press, which is what lets the browser sound it
    }
    if (name == "practice") {
        practiceOpened(); // its preview from the top (practice.js)
    }
    themeSync(); // the menu theme plays on, but for the timing test (theme.js)
    drawStartScreen();
    if (gameStart && !menuFlash) {
        menuFlash = setInterval(highlightControl, 100); // the flash the start screen's own timer would be giving it
    }
}

function closeMenu() { // and put back whatever it was covering. The timing test goes back to the settings it opened
    // from, with its button lit for a controller
    if (menuScreen == "calibrate") {
        calStop();
        openMenu("options");
        if (inputMode == "pad") {
            setHovered("options_calibrate");
        }
        return;
    }
    musicPreviewStop(); // leaving the settings: the MUSIC setting's moment of music goes with them
    if (menuFlash) {
        clearInterval(menuFlash);
        menuFlash = null;
    }
    hoveredButton = "";
    menuScreen = "";
    playSound(aud_click);
    themeSync();
    if (gameStart) {
        stopResume(); // a countdown can't have been running under it, but a tap may have started one since
        drawPauseScreen(); // the level, and the panel over it
    } else {
        drawStartScreen();
    }
}

function optionsPress(name) { // a press on the settings screen: cycle a row, open the timing test, or go back.
    // Anything else is ignored
    var b = OPTION_BUTTONS[name];
    if (!b) {
        return;
    }
    if (b.back) {
        closeMenu();
    } else if (b.menu) {
        openMenu(b.menu);
    } else {
        cycleSetting(b.setting);
        if (b.setting == "music" && gameStart) { // the new level, heard: over a paused level, a moment of music;
            musicPreview(); // over the start screen, the menu theme, playing on at it (theme.js)
        }
    }
}

function menuPress(name, p) { // a press while a menu screen is up, whichever one it is; p, where it was, if it was a
    // pointer's
    if (menuScreen == "difficulty") {
        difficultyPress(name, p);
    } else if (menuScreen == "options") {
        optionsPress(name);
    } else if (menuScreen == "help") {
        helpPress(name);
    } else if (menuScreen == "levels") {
        levelsPress(name, p);
    } else if (menuScreen == "practice") {
        practicePress(name, p);
    } else if (menuScreen == "calibrate") {
        calPress(name);
    }
}

// The menu glitches. Every so often a piece of the start screen tears, ghosts or gets crushed for a moment, and then
// the screen is drawn clean again. All three kinds are self-copies of what is already on the canvas -- nothing is
// redrawn from the model, so whatever a piece looked like is what tears.
// Its randomness is fxHash off a counter, not Math.random, as every effect's is: repeatable within a load (glitchSeed
// varies it between loads), and nothing drawn draws on chance; the levels come from seeded streams of their own.
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

function glitchRand(slot) { // repeatable within a load
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
