// Lazer Wave -- the story. The run is five acts of five levels, climbing the spectrum from infrared to ultraviolet:
// each act opens with its lore, typed out over its backdrop while its theme plays, each level with a card that gives
// its name and a line or two about it, and the run ends on an epilogue. The acts and the epilogue are here; the
// levels' names and lore are theirs (LEVELS, waves.js). index.html loads this with a plain <script src>, as globals
// rather than modules, so the game still opens straight off disk. Nothing here runs at load beyond building the tables.
//
// A story screen is up between levels, with the game stopped. showActIntro, showLevelCard and showEpilogue put one up
// and say what comes after it; it draws itself every frame, and ends on a press (storyPress) once its lore is out, or,
// a level's card, by itself a moment after. The time it is up is left off the run's clock, as a pause's is.

var LEVELS_PER_ACT = 5;

// The acts. name, and jp under it; band: the wavelengths, in nm, its levels' colours run between (sky.js), from its
// first level's to its last's, each chosen for colours the eye can tell apart (the red end all looks one red past 645);
// sky: its backdrop (SKY_STYLES, sky.js); lore: its intro, a line at a time. Its song is SONGS in music.js
const ACTS = [null,
    { name: "INFRARED", jp: "赤外線", band: [650, 610], sky: "embers", lore: [
        "Below the red, where no eye can see, there is only heat.",
        "Out of it a signal wakes: two waves, braided into one.",
        "Above it hangs the Array, a lattice of lasers",
        "that fires in time with the Broadcast.",
        "Learn its song, and you will know where the light will fall.",
        "Rise, little wave. Climb the colours. Keep the beat.",
    ] },
    { name: "SODIUM", jp: "ナトリウム", band: [600, 575], sky: "grid", lore: [
        "The heat gives way to amber.",
        "Sodium lamps line a city that never sleeps,",
        "every window a relay, every relay a gun.",
        "Here the Array learned to see in two colours.",
        "Cyan and magenta: answer each in kind.",
    ] },
    { name: "PHOSPHOR", jp: "蛍光体", band: [565, 520], sky: "scope", lore: [
        "Green light, old and patient.",
        "The phosphor remembers every trace you leave on it.",
        "The Array has learned to cross its beams,",
        "down the screen as well as across it.",
        "Read the scope. Move before it moves.",
    ] },
    { name: "BLUESHIFT", jp: "青方偏移", band: [500, 460], sky: "warp", lore: [
        "You are moving faster now.",
        "The world ahead crowds into blue,",
        "its wavelengths shortening, the beat pulling tighter.",
        "The Array fires two at a time, and its colours turn on every beat.",
        "Hold your shape. The Source is close.",
    ] },
    { name: "ULTRAVIOLET", jp: "紫外線", band: [450, 400], sky: "aurora", lore: [
        "Past blue, past indigo: the edge of sight.",
        "Here the light cannot be seen, and everything glows.",
        "The Broadcast is loudest at its Source,",
        "and every beam the Array has left, it spends here.",
        "Become coherent. Become the Lazer Wave.",
    ] },
];

const EPILOGUE = { name: "COHERENCE", jp: "コヒーレンス", lore: [ // after the last level, before the finish
    "Beyond violet there is no colour. Only frequency.",
    "The Array falls silent, its last beam absorbed.",
    "Two waves, perfectly in phase:",
    "one wavelength, one beat, a single line of light.",
    "The Broadcast plays on. Now it plays for you.",
] };

var STORY_TYPE = 45; // characters a second the lore types out at
var STORY_LEAD = 700; // ms before its first line starts: the title's moment
var STORY_BREATH = 300; // ms between one line typed out and the next starting
var STORY_GRACE = 400; // ms a screen takes no press for, so the press that brought it up can't skip it as well
var CARD_HOLD = 2500; // ms a level's card stays once its lore is out, before the level starts by itself
var STORY_FADE = 0.8; // s an act's theme takes to go when its intro ends
var EPILOGUE_BPM = 84; // the epilogue's theme: the first act's, slower
var EPILOGUE_ACT_MS = 5000; // and its backdrop, every act's in turn, this long each

var story = null; // the story screen up, or null: { kind: "act", "card" or "end", n: the level whose colour and
                  // backdrop it shows, head, title, sub, lines, at: performance.now() when it came up, clock:
                  // Date.now() then, for the run's clock, typedAt: when its lore was all out (0 until then), skip,
                  // then: what comes after it, frame }

function levelAct(n) { // the act level n is in
    return Math.max(1, Math.min(ACTS.length - 1, Math.ceil(n / LEVELS_PER_ACT)));
}

function actFirstLevel(a) {
    return (a - 1) * LEVELS_PER_ACT + 1;
}

function levelInAct(n) { // 1 for an act's first level, up to LEVELS_PER_ACT for its last
    return n - actFirstLevel(levelAct(n)) + 1;
}

function roman(a) { // an act's number, as the acts of a play are numbered
    return ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][a] || String(a);
}

function storyUp() {
    return story !== null;
}

function showActIntro(a, then) { // an act begins: its name and its lore, over its backdrop in the colour of the
    // middle of its band, to its theme at its first level's tempo
    var first = actFirstLevel(a);
    showStory({ kind: "act", n: first + Math.floor(LEVELS_PER_ACT / 2), head: "ACT " + roman(a), title: ACTS[a].name,
        sub: ACTS[a].jp, lines: ACTS[a].lore, then: then });
    musicIntro(a, levelDef(first).bpm);
}

function showLevelCard(n, then) { // a level is next: its name, its tempo and the best it has been cleared with here,
    // and its lore, over its own backdrop
    var def = levelDef(n);
    var best = [rec().rank[n], rec().score[n]].filter(function (v) { return v !== undefined; }).join("  ");
    showStory({ kind: "card", n: n, head: "ACT " + roman(levelAct(n)) + "   LEVEL " + n, title: def.name.toUpperCase(),
        sub: def.bpm + " BPM" + (best ? "   \u00b7   BEST " + best : ""), lines: def.lore || [], then: then });
}

function showEpilogue(then) { // the last level is behind the run: the epilogue, over every act's backdrop in turn
    showStory({ kind: "end", n: RUN_LEVELS, head: "EPILOGUE", title: EPILOGUE.name, sub: EPILOGUE.jp,
        lines: EPILOGUE.lore, then: then });
    musicIntro(1, EPILOGUE_BPM);
}

function showStory(s) {
    s.at = performance.now();
    s.clock = Date.now();
    s.typedAt = 0;
    s.skip = false;
    story = s;
    restFrame = null; // it draws itself, on a resize as well
    s.frame = requestAnimationFrame(storyFrame);
}

function storyLineStart(i) { // ms after the screen came up that its line i starts typing
    var t = STORY_LEAD;
    for (var j = 0; j < i; j++) {
        t += story.lines[j].length * 1000 / STORY_TYPE + STORY_BREATH;
    }
    return t;
}

function storyTyped(i, e) { // how many characters of line i are out, `e` ms after the screen came up
    if (story.skip) {
        return story.lines[i].length;
    }
    return Math.max(0, Math.min(story.lines[i].length, Math.floor((e - storyLineStart(i)) * STORY_TYPE / 1000)));
}

function storyFrame(now) {
    if (!story) {
        return;
    }
    var e = now - story.at;
    if (!story.typedAt && (story.skip || e >= storyLineStart(story.lines.length) - STORY_BREATH)) {
        story.typedAt = now; // all of it out
    }
    if (story.kind == "card" && story.typedAt) {
        if (!document.hasFocus()) {
            story.typedAt = now; // it waits for a player who has gone away, rather than starting without them
        } else if (now - story.typedAt >= CARD_HOLD) {
            storyEnd();
            return;
        }
    }
    fxStep(); // the CRT's bar rolls on, as it does in a level
    drawStory(now);
    story.frame = requestAnimationFrame(storyFrame);
}

function storyPress() { // a press on a story screen: the rest of its lore at once, or once that is out, on
    if (!story || performance.now() - story.at < STORY_GRACE) {
        return;
    }
    if (!story.typedAt && !story.skip) {
        story.skip = true;
        return;
    }
    storyEnd();
}

function storyEnd() { // the screen goes, its time off the run's clock, and what comes after it comes on
    var s = story;
    cancelAnimationFrame(s.frame);
    story = null;
    musicIntroStop(STORY_FADE);
    startTime += Date.now() - s.clock;
    s.then();
}

function drawStory(now) { // the backdrop, then the words: the heading, the title printed in the level's colour, the
    // line under it, the lore as far as it has typed, and what a press does now
    var s = story, e = now - s.at;
    var n = s.n, dim = 1;
    if (s.kind == "end") { // every act in turn, its colour gliding through its band, fading through the dark between
        var into = e % EPILOGUE_ACT_MS;
        var a = Math.floor(e / EPILOGUE_ACT_MS) % (ACTS.length - 1) + 1;
        n = actFirstLevel(a) + (LEVELS_PER_ACT - 1) * into / EPILOGUE_ACT_MS;
        dim = Math.min(1, into / 600, (EPILOGUE_ACT_MS - into) / 600);
    }
    var bpm = s.kind == "end" ? EPILOGUE_BPM : levelDef(s.n).bpm;
    drawSky(n, e / 1000, e / 1000 * bpm / 60, dim); // the ground as well
    var col = levelColor(n);
    var big = s.kind == "card" ? 80 : 100;
    var lineY = function (i) { return 30 + i * 46; }; // the lore's baselines, from the block's middle
    var promptY = lineY(s.lines.length) + 34;
    var top = -250, bottom = promptY + 16;
    ctx.save();
    ctx.font = "30px Arial";
    var wide = 0;
    s.lines.forEach(function (l) { wide = Math.max(wide, ctx.measureText(l).width); });
    ctx.font = big + "px Arial";
    wide = Math.max(wide, ctx.measureText(s.title).width + PRINT_TRAIL);
    var k = fitBand(wide + 40, bottom - top);
    var W = gameArea.canvas.width, H = gameArea.canvas.height;
    ctx.setTransform(k, 0, 0, k, W / 2, H / 2 - k * (top + bottom) / 2);
    ctx.textAlign = "center";
    ctx.globalAlpha = Math.max(0, Math.min(1, e / 400)); // the words come up out of the backdrop (a frame's time can
    // be a moment before the screen came up, and a canvas ignores an alpha under 0 rather than taking it as 0)
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = skyRGBA(col, 1, 0.35);
    ctx.fillText(s.head, 0, -200);
    ctx.font = big + "px Arial"; // the title, printed as the game's titles are, its trail in the level's colour
    ctx.fillStyle = skyRGBA(col, 1, 0.15);
    for (var q = PRINT_TRAIL; q > 0; q--) {
        ctx.fillText(s.title, -q, -95 - q);
    }
    ctx.fillStyle = COLORS.text;
    ctx.fillText(s.title, 0, -95);
    ctx.font = "28px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(s.sub, 0, -40);
    ctx.font = "30px Arial"; // the lore, each line typing out from where it will start once it is all there
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.text;
    s.lines.forEach(function (l, i) {
        var shown = storyTyped(i, e);
        if (shown > 0) {
            ctx.fillText(l.slice(0, shown), -ctx.measureText(l).width / 2, lineY(i));
        }
    });
    ctx.textAlign = "center";
    if (s.typedAt) {
        var since = now - s.typedAt;
        ctx.font = "22px Arial";
        ctx.fillStyle = COLORS.dim;
        ctx.globalAlpha = Math.min(1, since / 300) * (s.kind == "card" ? 1 : 0.8 + 0.2 * Math.cos(since / 350));
        ctx.fillText(storyPrompt(s.kind), 0, promptY);
        if (s.kind == "card") { // how long before the level starts by itself
            ctx.fillStyle = skyRGBA(col, 0.8, 0.3);
            ctx.fillRect(-200, promptY + 12, 400 * Math.min(1, since / CARD_HOLD), 3);
        }
    }
    ctx.restore();
    fxDrawScreen(fxLook());
}

function storyPrompt(kind) { // what a press does, in the words of the input in use
    var go = kind == "card" ? "START NOW" : "CONTINUE";
    return inputMode == "touch" ? "TAP TO " + go : inputMode == "pad" ? "PRESS A TO " + go
        : "CLICK OR PRESS ENTER TO " + go;
}
