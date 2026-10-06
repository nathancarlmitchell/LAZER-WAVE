// Lazer Wave -- the HIGH SCORES screen, with this browser's own bests (LOCAL) and the online leaderboards (GLOBAL), on a
// WordPress site whose Lazer Wave Game plugin passes its scores' address on the game's URL (api=, scores.php beside the
// plugin), where a name is asked for when a play sets a new best that would make its board's top ten. Boards are kept
// per difficulty: a full run's total ("run"), a boss rush's ("rush"), and each level played on its own from the level
// select ("level-15"), each score with its play's MAX COMBO. A play asks the site for a ticket as it starts, and its
// score goes back with it, once (the site checks it against what those levels could give, and how long their songs
// take). Without the address -- the game on its own, from GitHub or off disk -- HIGH SCORES has LOCAL alone, and nothing
// is posted. index.html loads this with a plain <script src>, as globals rather than modules, so the game still opens
// straight off disk.

var SCORE_VERSION = 1; // the scoring the boards are kept under: raised when a change to the scoring would make the old
                       // scores unfair, and the site starts new boards (build.js hands it to scores.php)
var ONLINE_TOP = 10; // a board's length, and the place a score must make to be asked a name for
var ONLINE_NAME_STORE = "lazerwave.name";
var ONLINE_FRESH_MS = 30000; // how long a board fetched is shown before it is fetched again
var onlineApi = onlineApiFromPage(); // the site's scores address, or ""
var onlineTicket = null; // the ticket held, until a score is offered with it: { board, difficulty, ticket, at }
var onlineAsked = 0; // which ticket asked for is the current one: an answer to an older one is let go
var onlineBoards = {}; // boards fetched, or being fetched: "run/normal" -> { at, rows, pending }
var onlineEntry = null; // the name being asked for, while it is: { box, input, note, entry, busy }

function onlineApiFromPage() { // the address the plugin passed, if it is one
    try {
        var api = new URLSearchParams(window.location.search).get("api") || "";
        return /^https?:\/\//i.test(api) ? api : "";
    } catch (e) {
        return "";
    }
}

function onlineReady() { // are there boards to show and post to
    return onlineApi !== "";
}

function onlineUrl(route, params) { // a route under the address, with its query: the address itself carries one
    // (?rest_route=) on a site without pretty permalinks
    var url = onlineApi + route, query = [];
    for (var k in params || {}) {
        query.push(encodeURIComponent(k) + "=" + encodeURIComponent(params[k]));
    }
    return query.length ? url + (url.indexOf("?") >= 0 ? "&" : "?") + query.join("&") : url;
}

function onlineFetch(method, route, params, body) { // a call to the site: its answer, or a failure carrying what the site
    // said was wrong
    return fetch(onlineUrl(route, params), { method: method, credentials: "omit", cache: "no-store",
        headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined })
        .then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (data) {
                if (!r.ok) {
                    throw new Error(data && data.message ? data.message : "The site couldn't take it (" + r.status + ").");
                }
                return data;
            });
        });
}

function onlineBoardOf(kind, n) { // a board's name: "run", "rush", or "level-n"
    return kind == "level" ? "level-" + n : kind;
}

function onlinePlayBoard() { // the board the play under way is for: a level of the level select's, the boss rush, a full
    // run (from the first level, as the best run is); none for practice
    return practice ? "" : selectRun ? "level-" + level : bossRush ? "rush" : runFrom == 1 ? "run" : "";
}

var ONLINE_TICKET_MS = 20 * 3600000; // a ticket kept unspent this long is let go for a new one (the site takes one for
                                     // a day)

function onlinePlayStarts() { // a level begins (playLevel, levels.js): the play's ticket, unless it has one for this
    // board and difficulty -- a run's or a rush's from its first level, kept through its deaths; a level's from the level
    // select kept through the attempts until a clear spends it, so retrying a hard level asks the site for nothing more
    // (the site times a score from its ticket, and an older ticket only gives the play longer)
    var board = onlinePlayBoard(), t = onlineTicket;
    if (!onlineReady() || !board || (t && t.board == board && t.difficulty == difficulty
        && Date.now() - t.at < ONLINE_TICKET_MS)) {
        return;
    }
    var asked = ++onlineAsked, diff = difficulty;
    onlineTicket = null;
    onlineFetch("POST", "tickets", null, { board: board, difficulty: diff, version: SCORE_VERSION }).then(function (r) {
        if (asked == onlineAsked && r && r.ticket) {
            onlineTicket = { board: board, difficulty: diff, ticket: r.ticket, at: Date.now() };
        }
    }).catch(function () {}); // no ticket: this play's score can't go up, and that is all
}

var onlineRunBest = 0; // the most a run (or a rush) on its difficulty had scored when the one under way began

function onlineRunBegins() { // a run or a rush begins (startGame, restartRun; levels.js): the best it has to beat for
    // its total to be offered
    onlineRunBest = (bossRush ? rec().rushScore : rec().runScore) || 0;
}

function onlineOffer(kind) { // a play ended with a score for its board: a run or a rush over ("over") or finished
    // ("finish"), or a level from the level select cleared ("level"). A new best -- a level's best score from the select,
    // as its results' NEW BEST says, or a total over the most a run or a rush had scored when this one began -- that
    // would make the board's top ten asks for a name. Only a ticket for the play's own board and difficulty is offered,
    // and only a new best spends it: a play that isn't one leaves it for the next
    var t = onlineTicket;
    if (!onlineReady() || !t || onlineEntry || t.board != onlinePlayBoard() || t.difficulty != difficulty) {
        return;
    }
    var entry = { ticket: t.ticket, board: t.board, difficulty: t.difficulty, grade: "" };
    if (kind == "level") {
        entry.score = score;
        entry.reached = 1;
        entry.combo = bestCombo;
        entry.grade = levelGrade;
    } else {
        entry.score = runScore + score;
        entry.combo = runPeakCombo; // the run's combo at its longest, carried from level to level (loop.js)
        entry.reached = t.board == "rush" ? (kind == "finish" ? RUSH_LEVELS.length : rushIndex(level) - 1)
            : (kind == "finish" ? RUN_LEVELS : level - 1);
    }
    if (!(entry.score > 0) || !(kind == "level" ? scoreRecord : entry.score > onlineRunBest)) {
        return;
    }
    onlineTicket = null; // spoken for
    onlineFetch("GET", "scores", { board: entry.board, difficulty: entry.difficulty, limit: ONLINE_TOP }).then(function (r) {
        var rows = r && r.scores || [];
        if (rows.length < ONLINE_TOP || entry.score > rows[rows.length - 1].score) {
            entry.place = 1 + rows.filter(function (row) { return row.score >= entry.score; }).length;
            onlineAskName(entry);
        }
    }).catch(function () {});
}

function onlineBoardTitle(board, diff) { // "FULL RUN · NORMAL", "BOSS RUSH · HARD", "LEVEL 15 STATIC BLOOM · EASY"
    var what = board == "run" ? "FULL RUN" : board == "rush" ? "BOSS RUSH" : "LEVEL " + board.slice(6) + " "
        + levelDef(Number(board.slice(6))).name.toUpperCase();
    return what + " · " + diff.toUpperCase();
}

function onlineDetail(board, row) { // what a score's play got to: a run's level, a rush's boss, a level's rank
    if (board.indexOf("level-") == 0) {
        return row.grade || "";
    }
    var most = board == "rush" ? RUSH_LEVELS.length : RUN_LEVELS;
    return row.reached >= most ? "CLEARED" : board == "rush" ? "BOSS " + (row.reached + 1) + " / " + most
        : "LEVEL " + (row.reached + 1);
}

// The name, asked for over the screen as it stands, in a panel of the page's own: a text box can't be drawn on the
// canvas. It keeps every key and press to itself while it is up, so none of them reaches the game under it; a
// controller's A posts and B passes
var ONLINE_CSS = ".lw-entry{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;"
    + "background:rgba(10,0,20,.72);z-index:10;font-family:Arial,sans-serif;touch-action:auto;-webkit-user-select:text;"
    + "user-select:text}.lw-entry__panel{background:#0a0014;border:2px solid #00ffff;padding:22px 26px;min-width:300px;"
    + "text-align:center;color:#f2e9ff;box-shadow:0 0 24px rgba(0,255,255,.35)}"
    + ".lw-entry__head{font-size:34px;color:#ff00ff;text-shadow:-3px -3px 0 #00ffff;margin-bottom:6px}"
    + ".lw-entry__board{font-size:15px;color:#8a7a9e;letter-spacing:1px}.lw-entry__score{font-size:30px;margin:8px 0 2px}"
    + ".lw-entry__combo{font-size:14px;color:#8a7a9e;letter-spacing:1px;margin-bottom:14px}"
    + ".lw-entry__label{display:block;font-size:14px;color:#8a7a9e;letter-spacing:1px}"
    + ".lw-entry__name{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:8px 10px;font-size:22px;"
    + "background:#140024;color:#f2e9ff;border:2px solid #00ffff;outline:none;text-align:center}"
    + ".lw-entry__name:focus{border-color:#ff00ff}.lw-entry__note{min-height:20px;margin:10px 0 2px;font-size:15px}"
    + ".lw-entry__buttons{display:flex;gap:12px;justify-content:center;margin-top:8px}"
    + ".lw-entry__buttons button{font-size:18px;padding:8px 22px;background:#0a0014;color:#ff00ff;border:2px solid #00ffff;"
    + "cursor:pointer}.lw-entry__buttons button.lw-entry__ok{background:rgba(0,255,255,.2);color:#f2e9ff}";

function onlineEntryUp() { // is a name being asked for
    return !!onlineEntry;
}

function onlineAskName(entry) { // the panel: what the score is for, the place it would take, and the name to post it under
    if (!document.getElementById("lw-entry-css")) {
        var css = document.createElement("style");
        css.id = "lw-entry-css";
        css.textContent = ONLINE_CSS;
        document.head.appendChild(css);
    }
    var box = document.createElement("div");
    box.className = "lw-entry";
    box.innerHTML = "<div class=\"lw-entry__panel\" role=\"dialog\" aria-label=\"New high score\">"
        + "<div class=\"lw-entry__head\">NEW HIGH SCORE</div><div class=\"lw-entry__board\"></div>"
        + "<div class=\"lw-entry__score\"></div><div class=\"lw-entry__combo\"></div>"
        + "<label class=\"lw-entry__label\">YOUR NAME"
        + "<input class=\"lw-entry__name\" maxlength=\"20\" autocomplete=\"nickname\" spellcheck=\"false\"></label>"
        + "<div class=\"lw-entry__note\"></div><div class=\"lw-entry__buttons\">"
        + "<button type=\"button\" class=\"lw-entry__ok\">SUBMIT</button>"
        + "<button type=\"button\" class=\"lw-entry__skip\">SKIP</button></div></div>";
    box.querySelector(".lw-entry__board").textContent = onlineBoardTitle(entry.board, entry.difficulty) + "   ·   #"
        + entry.place;
    box.querySelector(".lw-entry__score").textContent = String(entry.score);
    box.querySelector(".lw-entry__combo").textContent = "MAX COMBO " + entry.combo;
    var input = box.querySelector(".lw-entry__name");
    try {
        input.value = window.localStorage.getItem(ONLINE_NAME_STORE) || "";
    } catch (e) { // a private window: the name is typed afresh
    }
    ["keydown", "keyup", "keypress", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "wheel", "mousemove",
        "touchstart", "touchmove", "touchend", "touchcancel", "pointerdown", "pointerup", "pointermove"].forEach(function (type) {
        box.addEventListener(type, function (e) { e.stopPropagation(); }); // the game under it hears none of them
    });
    box.addEventListener("keydown", function (e) {
        if (e.key == "Enter") {
            e.preventDefault();
            onlineSubmit();
        } else if (e.key == "Escape") {
            e.preventDefault();
            onlineSkip();
        }
    });
    box.querySelector(".lw-entry__ok").addEventListener("click", onlineSubmit);
    box.querySelector(".lw-entry__skip").addEventListener("click", onlineSkip);
    document.body.appendChild(box);
    onlineEntry = { box: box, input: input, note: box.querySelector(".lw-entry__note"), entry: entry, busy: false };
    onlineEntryFit();
    if (inputMode != "touch") { // typed into at once; by touch the field is tapped first, so a phone's keyboard doesn't
        input.focus(); // come up over the panel before it is read (and a name kept from before needs none)
        input.select();
    }
}

var ONLINE_ENTRY_ROOM = 0.94; // of the window, either way, the panel may fill: it is made smaller to keep inside it

function onlineEntryFit() { // the panel the way up the game is: on a phone held upright, where the game is drawn turned
    // a quarter (rotated, loop.js), turned with it, over the window as the canvas is; else over the window as it stands.
    // Made smaller where the window is too short or narrow for it (a phone on its side is short), never larger. Again
    // on a resize (windowResize, layout.js), as the phone may be turned while it is up
    if (!onlineEntry) {
        return;
    }
    var s = onlineEntry.box.style;
    s.top = s.left = rotated ? "0" : "";
    s.right = s.bottom = rotated ? "auto" : "";
    s.width = rotated ? window.innerHeight + "px" : "";
    s.height = rotated ? window.innerWidth + "px" : "";
    s.transformOrigin = rotated ? "0 0" : "";
    s.transform = rotated ? "rotate(90deg) translateY(-100%)" : "";
    var panel = onlineEntry.box.firstChild; // its own size, which a transform leaves alone
    var w = rotated ? window.innerHeight : window.innerWidth, h = rotated ? window.innerWidth : window.innerHeight;
    var k = Math.min(1, ONLINE_ENTRY_ROOM * w / panel.offsetWidth, ONLINE_ENTRY_ROOM * h / panel.offsetHeight);
    panel.style.transform = k < 1 ? "scale(" + k.toFixed(3) + ")" : "";
}

function onlineNote(text, color) { // a line on the panel: what is happening, or what went wrong
    if (onlineEntry) {
        onlineEntry.note.textContent = text;
        onlineEntry.note.style.color = color || COLORS.dim;
    }
}

function onlineSubmit() { // SUBMIT: the score posted under the name typed, and its place said before the panel goes
    if (!onlineEntry || onlineEntry.busy) {
        return;
    }
    var name = onlineEntry.input.value.replace(/\s+/g, " ").trim(), e = onlineEntry.entry;
    if (!name) {
        onlineNote("Type a name to post it under.", COLORS.late);
        onlineEntry.input.focus();
        return;
    }
    onlineEntry.busy = true;
    onlineNote("Posting...");
    var mine = onlineEntry;
    onlineFetch("POST", "scores", null, { ticket: e.ticket, name: name, score: e.score, reached: e.reached, combo: e.combo,
        grade: e.grade })
        .then(function (r) {
            try {
                window.localStorage.setItem(ONLINE_NAME_STORE, name);
            } catch (err) { // not kept: asked again next time
            }
            delete onlineBoards[e.board + "/" + e.difficulty]; // the board changed: fetched afresh when next shown
            if (onlineEntry === mine) {
                onlineNote("#" + r.place + " on the board", COLORS.good);
                setTimeout(function () {
                    if (onlineEntry === mine) {
                        onlineClose();
                    }
                }, 1600);
            }
        })
        .catch(function (err) {
            if (onlineEntry === mine) {
                mine.busy = false;
                onlineNote(err.message, COLORS.warn);
                mine.input.focus();
            }
        });
}

function onlineSkip() { // SKIP: not posted
    if (onlineEntry && !onlineEntry.busy) {
        onlineClose();
    }
}

function onlineClose() { // the panel goes, and the screen under it is as it was
    if (onlineEntry) {
        onlineEntry.box.remove();
        onlineEntry = null;
    }
}

// The HIGH SCORES screen, a menu screen ("scores") off the start screen, in two views toggled at its top. GLOBAL is the
// site's boards: one at a time, picked by its kind (a full run, the boss rush, or a level, with arrows for which) and
// its difficulty, its top ten fetched as it is picked. LOCAL is this browser's own bests (run.js's records), a row a
// difficulty: for a full run or the rush, its best total, its longest combo, how far one has got and its fastest
// finish; for a level, the most it has been cleared with from the level select and its best rank. Without a site to
// fetch from, LOCAL alone, and no toggle
var SCORES_KINDS = [["run", "FULL RUN"], ["rush", "BOSS RUSH"], ["level", "LEVELS"]];
var scoresView = { kind: "run", level: 1, difficulty: "normal", status: "", rows: [], local: false };
var SC_TITLE = -296; // the title's baseline; its Japanese under it
var SC_VIEW_W = 150, SC_VIEW_H = 32, SC_VIEW_TOP = -246; // the GLOBAL / LOCAL toggle, under the title
var SC_TAB_W = 180, SC_TAB_H = 40, SC_TAB_GX = 10, SC_TAB_TOP = -200;
var SC_LV_TOP = -150, SC_LV_ARROW = 46, SC_LV_W = 356, SC_LV_H = 38;
var SC_DIFF_W = 130, SC_DIFF_H = 38, SC_DIFF_GX = 10, SC_DIFF_TOP = -98;
var SC_ROW_TOP = 0, SC_ROW_H = 26; // the table: its first row's baseline, and apart; its heading a row over it
var SC_COL_PLACE = -330, SC_COL_NAME = -280, SC_COL_SCORE = 110, SC_COL_COMBO = 215, SC_COL_DETAIL = 340;
var SC_LOCAL_TOP = -80, SC_LOCAL_H = 52; // LOCAL's table: its heading's baseline, and a difficulty's row, apart
var SC_LC_DIFF = -330, SC_LC_BEST = -20, SC_LC_COMBO = 100, SC_LC_REACHED = 230, SC_LC_FASTEST = 340; // its columns:
// the difficulty's left edge, the rest right edges
var SC_LC_LEVEL = 170; // and on LEVELS, the best score's right edge (the rank's is FASTEST's)

function scoresOpened() { // the screen comes up: the difficulty in force, LOCAL where there is no site, and GLOBAL's
    // board fetched
    scoresView.difficulty = difficulty;
    if (!onlineReady()) {
        scoresView.local = true;
    }
    if (!scoresView.local) {
        scoresFetch();
    }
}

function scoresBoard() { // the board shown
    return onlineBoardOf(scoresView.kind, scoresView.level);
}

var scoresWait = 0; // the fetch held back while the arrows are being pressed through the levels

function scoresFetch() { // the board shown, from the site, unless it was fetched a moment ago or is on its way; asked a
    // moment after it is picked, so pressing through the levels asks for the one stopped on, not each one passed
    var board = scoresBoard(), diff = scoresView.difficulty, key = board + "/" + diff, held = onlineBoards[key];
    clearTimeout(scoresWait);
    if (held && !held.pending && Date.now() - held.at < ONLINE_FRESH_MS) {
        scoresView.rows = held.rows;
        scoresView.status = held.rows.length ? "" : "empty";
        return;
    }
    scoresView.rows = [];
    scoresView.status = "loading";
    if (held && held.pending) {
        return; // its answer shows it
    }
    scoresWait = setTimeout(function () {
        var mark = onlineBoards[key] = { at: 0, rows: [], pending: true };
        onlineFetch("GET", "scores", { board: board, difficulty: diff, limit: ONLINE_TOP }).then(function (r) {
            scoresFetched(key, mark, r && r.scores || [], "");
        }).catch(function () {
            scoresFetched(key, mark, [], "error");
        });
    }, 200);
}

function scoresFetched(key, mark, rows, failed) { // a board's answer: kept unless a score posted since has made it old,
    // and shown if it is still the board picked
    if (onlineBoards[key] !== mark) {
        return;
    }
    if (failed) {
        delete onlineBoards[key]; // asked again when next picked
    } else {
        onlineBoards[key] = { at: Date.now(), rows: rows };
    }
    if (scoresBoard() + "/" + scoresView.difficulty == key) {
        scoresView.rows = rows;
        scoresView.status = failed || (rows.length ? "" : "empty");
        if (menuScreen == "scores" && !scoresView.local) {
            drawStartScreen();
        }
    }
}

function scoresButtons() { // the screen's buttons: where there is a site, GLOBAL and LOCAL, "sc_view_global" and
    // "sc_view_local"; a tab a kind, "sc_kind_run"; on LEVELS the arrows either side of the level, "sc_lv_back" and
    // "sc_lv_on"; on GLOBAL a tab a difficulty, "sc_diff_normal" (LOCAL shows them all at once); and BACK
    var t = {};
    if (onlineReady()) {
        t.sc_view_global = { dx: -SC_VIEW_W - 3, dy: SC_VIEW_TOP, w: SC_VIEW_W, h: SC_VIEW_H, view: "global",
            label: "GLOBAL" };
        t.sc_view_local = { dx: 3, dy: SC_VIEW_TOP, w: SC_VIEW_W, h: SC_VIEW_H, view: "local", label: "LOCAL" };
    }
    SCORES_KINDS.forEach(function (k, i) {
        t["sc_kind_" + k[0]] = { dx: -(3 * SC_TAB_W + 2 * SC_TAB_GX) / 2 + i * (SC_TAB_W + SC_TAB_GX), dy: SC_TAB_TOP,
            w: SC_TAB_W, h: SC_TAB_H, kind: k[0], label: k[1] };
    });
    if (scoresView.kind == "level") {
        t.sc_lv_back = { dx: -SC_LV_W / 2 - 6 - SC_LV_ARROW, dy: SC_LV_TOP, w: SC_LV_ARROW, h: SC_LV_H, step: -1 };
        t.sc_lv_on = { dx: SC_LV_W / 2 + 6, dy: SC_LV_TOP, w: SC_LV_ARROW, h: SC_LV_H, step: 1 };
    }
    if (!scoresView.local) {
        DIFFICULTIES.forEach(function (d, i) {
            t["sc_diff_" + d.name] = { dx: -(4 * SC_DIFF_W + 3 * SC_DIFF_GX) / 2 + i * (SC_DIFF_W + SC_DIFF_GX),
                dy: SC_DIFF_TOP, w: SC_DIFF_W, h: SC_DIFF_H, pick: d.name, label: d.label.split(" ")[0] };
        });
    }
    t.sc_back = { dx: -150, dy: 262, w: 300, h: 48, back: true, label: "BACK" };
    return t;
}

function drawScoresTab(b, on, label, size) { // a tab: lit as a picked tile is while it is the one shown
    var x0 = LAYOUT_W / 2 + b.dx, y0 = LAYOUT_H / 2 + b.dy;
    ctx.globalAlpha = on ? 1 : 0.45;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillRect(x0, y0, b.w, b.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
    if (on) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = COLORS.cyan;
        ctx.fillRect(x0 + 2, y0 + 2, b.w - 4, b.h - 4);
        ctx.globalAlpha = 1;
    }
    ctx.font = (on ? "bold " : "") + size + "px Arial";
    ctx.fillStyle = on ? COLORS.text : COLORS.dim;
    ctx.textAlign = "center";
    ctx.fillText(label, x0 + b.w / 2, y0 + b.h / 2 + size * 0.35, b.w - 12);
    ctx.textAlign = "start";
}

function drawScoresScreen() { // the screen: the toggle and the tabs, then GLOBAL's board or LOCAL's bests, and BACK
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2, t = scoresButtons();
    useWindow();
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, x, y);
    useScreenFrame();
    ctx.textAlign = "center";
    ctx.font = "64px Arial";
    ctx.fillStyle = COLORS.cyan; // the title printed twice, as the other menus' are
    ctx.fillText("HIGH SCORES", cx - 4, cy + SC_TITLE - 4);
    ctx.fillStyle = COLORS.magenta;
    ctx.fillText("HIGH SCORES", cx, cy + SC_TITLE);
    ctx.font = "24px Arial";
    ctx.fillStyle = COLORS.text;
    ctx.fillText("ハイスコア", cx, cy + SC_TITLE + 32);
    for (var name in t) {
        var b = t[name];
        if (b.view) {
            drawScoresTab(b, scoresView.local == (b.view == "local"), b.label, 16);
        } else if (b.kind) {
            drawScoresTab(b, scoresView.kind == b.kind, b.label, 20);
        } else if (b.pick) {
            drawScoresTab(b, scoresView.difficulty == b.pick, b.label, 18);
        } else if (b.step) {
            drawPracticeArrow({ dx: b.dx, dy: b.dy, w: b.w, h: b.h, barStep: b.step }); // practice.js's
        } else if (b.back) {
            drawMenuButton(b, b.label, "28px Arial");
        }
    }
    if (scoresView.kind == "level") { // which level, between its arrows, in its colour of the spectrum
        ctx.textAlign = "center";
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = skyRGBA(levelColor(scoresView.level), 1, 0.35);
        ctx.fillText("LEVEL " + scoresView.level + "   " + levelDef(scoresView.level).name.toUpperCase(), cx,
            cy + SC_LV_TOP + SC_LV_H / 2 + 7, SC_LV_W);
    }
    if (scoresView.local) {
        drawLocalScores();
    } else {
        drawGlobalScores();
    }
    ctx.textAlign = "start";
    drawScreenBanners();
    titleParticles(); // the dust behind it, as behind the start screen (titleparticles.js)
}

function drawGlobalScores() { // GLOBAL: the board's top ten, or what there is instead of one
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2, board = scoresBoard();
    var head = cy + SC_ROW_TOP - SC_ROW_H - 4; // the table's heading
    ctx.font = "15px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.textAlign = "start";
    ctx.fillText("#", cx + SC_COL_PLACE, head);
    ctx.fillText("NAME", cx + SC_COL_NAME, head);
    ctx.textAlign = "right";
    ctx.fillText("SCORE", cx + SC_COL_SCORE, head);
    ctx.fillText("MAX COMBO", cx + SC_COL_COMBO, head);
    ctx.fillText(board.indexOf("level-") == 0 ? "RANK" : "REACHED", cx + SC_COL_DETAIL, head);
    ctx.textAlign = "center";
    if (scoresView.status) {
        ctx.font = "22px Arial";
        ctx.fillStyle = scoresView.status == "error" ? COLORS.warn : COLORS.dim;
        ctx.fillText(scoresView.status == "loading" ? "Loading..." : scoresView.status == "empty"
            ? "No scores yet. Be the first." : "Couldn't reach the site's scores. Try again later.", cx, cy + 100);
    }
    scoresView.rows.forEach(function (row, i) {
        var at = cy + SC_ROW_TOP + i * SC_ROW_H;
        ctx.font = (i < 3 ? "bold " : "") + "20px Arial";
        ctx.fillStyle = i == 0 ? COLORS.cyan : COLORS.text;
        ctx.textAlign = "start";
        ctx.fillText(String(row.place), cx + SC_COL_PLACE, at);
        ctx.fillText(row.name, cx + SC_COL_NAME, at, SC_COL_SCORE - SC_COL_NAME - 130);
        ctx.textAlign = "right";
        ctx.fillText(String(row.score), cx + SC_COL_SCORE, at);
        ctx.fillText(row.combo == null ? "-" : String(row.combo), cx + SC_COL_COMBO, at); // none from before 1.12.0
        ctx.fillStyle = COLORS.dim;
        ctx.fillText(onlineDetail(board, row), cx + SC_COL_DETAIL, at);
    });
}

function localRunBests(name, rush) { // a full run's or the rush's bests on a difficulty, this browser's, as the cells of
    // its row: its best total, its longest combo, how far one has got (CLEARED once one has finished) and its fastest
    // finish, with what that cost under it
    var r = recFor(name), out = { best: "-", combo: "-", reached: "-", fastest: "-", cost: "" };
    if (!r) {
        return out;
    }
    var best = rush ? r.rushScore : r.runScore, combo = rush ? r.rushCombo : r.runCombo, ms = rush ? r.rush : r.run;
    var bosses = Object.keys(r.rushRank).length, cost = rush ? r.rushDeaths : r.runDeaths;
    if (best) {
        out.best = String(best);
    }
    if (combo) {
        out.combo = String(combo);
    }
    if (ms) {
        out.reached = "CLEARED";
        out.fastest = millisToMinutesAndSeconds(ms);
        out.cost = cost ? mistakes(cost) : "FLAWLESS";
    } else if (rush ? best || combo || bosses : r.runFurthest) { // the rush goes boss by boss, in order, so one played
        // has got to the boss after the last with a rank in it
        out.reached = rush ? "BOSS " + Math.min(RUSH_LEVELS.length, bosses + 1) + " / " + RUSH_LEVELS.length
            : "LEVEL " + r.runFurthest;
    }
    return out;
}

function localLevelBests(name, n) { // level n's bests on a difficulty, this browser's: the most it has been cleared with
    // from the level select, and its best rank; unbeaten, how far an attempt has got; LOCKED while the level before it
    // is unbeaten there (levelUnlocked, run.js)
    var r = recFor(name), out = { best: "-", rank: "-", grade: false };
    var beaten = function (k) { return !!r && r.rank[k] !== undefined; };
    if (n > 1 && !beaten(n) && !beaten(n - 1)) {
        out.rank = "LOCKED";
        return out;
    }
    if (!r) {
        return out;
    }
    if (r.score[n] !== undefined) {
        out.best = String(r.score[n]);
    }
    if (beaten(n)) {
        out.rank = r.rank[n];
        out.grade = true;
    } else if (r.reach[n]) {
        out.rank = "REACHED " + Math.round(100 * r.reach[n]) + "%";
    }
    return out;
}

function drawLocalScores() { // LOCAL: a row a difficulty, the one in force lit, with this browser's bests on it
    var cx = LAYOUT_W / 2, cy = LAYOUT_H / 2, level = scoresView.kind == "level", head = cy + SC_LOCAL_TOP;
    var cols = level ? [["BEST SCORE", SC_LC_LEVEL], ["RANK", SC_LC_FASTEST]]
        : [["BEST", SC_LC_BEST], ["MAX COMBO", SC_LC_COMBO], ["REACHED", SC_LC_REACHED], ["FASTEST", SC_LC_FASTEST]];
    ctx.font = "15px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.textAlign = "start";
    ctx.fillText("DIFFICULTY", cx + SC_LC_DIFF, head);
    ctx.textAlign = "right";
    cols.forEach(function (c) { ctx.fillText(c[0], cx + c[1], head); });
    DIFFICULTIES.forEach(function (d, i) {
        var at = head + 40 + i * SC_LOCAL_H, mine = d.name == difficulty;
        var cell = function (text, col, bold) { // a value, or a dim dash for none
            ctx.font = (bold ? "bold " : "") + "20px Arial";
            ctx.fillStyle = text == "-" ? COLORS.dim : COLORS.text;
            ctx.fillText(text, cx + col, at);
        };
        ctx.textAlign = "start";
        ctx.font = (mine ? "bold " : "") + "20px Arial";
        ctx.fillStyle = mine ? COLORS.cyan : COLORS.text;
        ctx.fillText(d.label, cx + SC_LC_DIFF, at, 180);
        ctx.textAlign = "right";
        if (level) {
            var lv = localLevelBests(d.name, scoresView.level);
            cell(lv.best, SC_LC_LEVEL, true);
            ctx.font = (lv.grade ? "bold 24px" : "16px") + " Arial";
            ctx.fillStyle = lv.grade ? rankColor(lv.rank) : COLORS.dim;
            ctx.fillText(lv.rank, cx + SC_LC_FASTEST, at);
        } else {
            var run = localRunBests(d.name, scoresView.kind == "rush");
            cell(run.best, SC_LC_BEST, true);
            cell(run.combo, SC_LC_COMBO);
            cell(run.reached, SC_LC_REACHED);
            cell(run.fastest, SC_LC_FASTEST);
            if (run.cost) { // what the fastest finish cost, under it
                ctx.font = "13px Arial";
                ctx.fillStyle = COLORS.dim;
                ctx.fillText(run.cost, cx + SC_LC_FASTEST, at + 18);
            }
        }
    });
    ctx.textAlign = "center";
    ctx.font = "16px Arial";
    ctx.fillStyle = COLORS.dim;
    ctx.fillText(level ? "Best scores are from the level select; ranks from any clear. Kept in this browser"
        : onlineReady() ? "Kept in this browser, apart from the site's boards" : "Kept in this browser", cx,
        head + 40 + 4 * SC_LOCAL_H + 8);
}

function scoresPress(name) { // a press on the screen: the toggle switches view, a tab shows its board or bests, an
    // arrow the next level's, BACK leaves
    var b = scoresButtons()[name];
    if (!b) {
        return;
    }
    if (b.back) {
        closeMenu();
        return;
    }
    if (b.view) {
        scoresView.local = b.view == "local";
    } else if (b.kind) {
        scoresView.kind = b.kind;
    } else if (b.pick) {
        scoresView.difficulty = b.pick;
    } else if (b.step) {
        scoresView.level = (scoresView.level - 1 + b.step + RUN_LEVELS) % RUN_LEVELS + 1;
    }
    playSound(aud_click);
    if (!scoresView.local) {
        scoresFetch();
    }
    drawStartScreen();
}
