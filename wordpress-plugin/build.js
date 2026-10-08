// Builds the WordPress uploads: node wordpress-plugin/build.js
//
//   1. copies the game into the plugin's game/ folder: index.html, every script index.html loads, and music/. The
//      copied index.html asks for each script with ?ver=<the plugin's version>, so a site's cache can't hand players
//      last version's scripts under this version's page
//   2. zips the plugin to wordpress-plugin/dist/lazer-wave-game.zip  (Plugins > Add New > Upload Plugin)
//   3. zips the theme to  wordpress-plugin/dist/lazer-wave-theme.zip (Appearance > Themes > Add New > Upload Theme)
//
// The repo root stays the one copy of the game; game/ and dist/ are build output and not committed.
const fs = require("fs"), path = require("path"), { spawnSync } = require("child_process");

const here = __dirname;
const root = path.resolve(here, "..");
const plugin = path.join(here, "lazer-wave-game");
const game = path.join(plugin, "game");
const theme = path.resolve(root, "wordpress-theme", "lazer-wave");
const dist = path.join(here, "dist");

// 1. the game: what index.html actually loads, so a new script file is picked up without editing this list
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
if (!scripts.length) {
    throw new Error("no <script src> found in index.html");
}
const version = (fs.readFileSync(path.join(plugin, "lazer-wave-game.php"), "utf8").match(/\*\s*Version:\s*(\S+)/) || [])[1];
if (!version) {
    throw new Error("no Version: in lazer-wave-game.php");
}
fs.rmSync(game, { recursive: true, force: true });
fs.mkdirSync(game, { recursive: true });
for (const f of scripts) {
    fs.copyFileSync(path.join(root, f), path.join(game, f));
}
fs.writeFileSync(path.join(game, "index.html"),
    html.replace(/(<script\s+src=")([^"?]+)"/g, (m, open, src) => open + src + "?ver=" + version + '"'));
fs.cpSync(path.join(root, "music"), path.join(game, "music"), { recursive: true });
console.log("game " + version + ": index.html, " + scripts.length + " scripts, music/ -> " + path.relative(root, game));

// 1b. the leaderboards' limits (scores.php): each level's bars, tempo, act, name and boss, each difficulty's points and
// lives, and the scoring's own numbers, read from the game's scripts, so the site can refuse a score no play of the
// levels claimed could have made, or one back sooner than their songs could have played
function source(file) {
    return fs.readFileSync(path.join(root, file), "utf8");
}
function literal(file, name) { // the array or object literal a game script assigns to `name`, evaluated on its own
    const src = source(file), at = src.search(new RegExp("(?:const|var)\\s+" + name + "\\s*="));
    if (at < 0) {
        throw new Error(name + " not found in " + file);
    }
    const open = src.slice(at).search(/[[{]/) + at;
    let depth = 0, quote = null, end = open;
    for (; end < src.length; end++) { // to its closing bracket, skipping strings and comments
        const ch = src[end];
        if (quote) {
            if (ch == "\\") {
                end++;
            } else if (ch == quote) {
                quote = null;
            }
        } else if (ch == "/" && src[end + 1] == "/") {
            end = src.indexOf("\n", end);
        } else if (ch == "/" && src[end + 1] == "*") {
            end = src.indexOf("*/", end) + 1;
        } else if (ch == "\"" || ch == "'" || ch == "`") {
            quote = ch;
        } else if (ch == "[" || ch == "{") {
            depth++;
        } else if (ch == "]" || ch == "}") {
            depth--;
            if (depth == 0) {
                break;
            }
        }
    }
    return require("vm").runInNewContext("(" + src.slice(open, end + 1) + ")");
}
function number(file, name) { // a number a game script gives `name`
    const m = source(file).match(new RegExp("(?:const|var)\\s+" + name + "\\s*=\\s*([0-9.]+)"));
    if (!m) {
        throw new Error(name + " not found in " + file);
    }
    return Number(m[1]);
}
const levelList = literal("waves.js", "LEVELS"), difficulties = literal("run.js", "DIFFICULTIES");
const perAct = number("story.js", "LEVELS_PER_ACT");
const limits = {
    version: number("online.js", "SCORE_VERSION"),
    count_in_bars: number("waves.js", "COUNT_IN_BARS"), beats_per_bar: number("waves.js", "BEATS_PER_BAR"),
    perfect: literal("loop.js", "POINTS").perfect, combo_step: number("loop.js", "COMBO_STEP"),
    survive: number("loop.js", "SURVIVE_POINTS"), absorb: number("loop.js", "ABSORB_POINTS"),
    absorbs_per_beat: 8, // more lasers absorbed on a beat than any phrase deals
    overdrive: number("loop.js", "OVERDRIVE_SCORE"), boss_bonus: number("boss.js", "BOSS_BONUS"),
    level_mult: true, // a level's points are times its number as well (levelMultiplier, loop.js)
    points: {}, lives: {}, levels: {},
};
difficulties.forEach(d => { limits.points[d.name] = d.points; limits.lives[d.name] = d.lives; });
// a boss level earns in its rounds up to its boss's par, the earliest it can fall in (bossPar, boss.js; earning,
// loop.js): worked out by the game's own code, run on its levels, as `par` and the bars a round after the first deals
// again (`loop`)
const sim = require("vm").createContext({ console: console, Math: Math, JSON: JSON });
["layout.js", "waves.js", "story.js", "music.js", "run.js", "world.js", "boss.js"].forEach(f => {
    require("vm").runInContext(source(f), sim, { filename: f });
});
levelList.forEach((def, n) => {
    if (def) {
        limits.levels[n] = { name: def.name, bars: def.chart.length, bpm: def.bpm, act: Math.ceil(n / perAct), boss: !!def.boss };
        if (def.boss) {
            const level = sim.levelDef(n);
            limits.levels[n].par = sim.bossPar(level, sim.buildTimeline(n), limits.count_in_bars * limits.beats_per_bar,
                def.boss.hp || 1);
            limits.levels[n].loop = level.bars - sim.loopFrom(level);
        }
    }
});
fs.writeFileSync(path.join(game, "scores-limits.json"), JSON.stringify(limits, null, 1));
console.log("scores: limits for " + Object.keys(limits.levels).length + " levels, scoring version " + limits.version);

// 2 and 3. the zips, each with its folder at the top, as WordPress expects
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function zip(folder, out) {
    const parent = path.dirname(folder), name = path.basename(folder);
    const r = process.platform == "win32"
        ? spawnSync(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe"), ["-a", "-c", "-f", out, "-C", parent, name])
        : spawnSync("zip", ["-r", "-q", out, name], { cwd: parent });
    if (r.status !== 0) {
        throw new Error("zipping " + name + " failed: " + (r.stderr || r.error));
    }
    console.log("zip:  " + path.relative(root, out) + " (" + Math.round(fs.statSync(out).size / 1024) + " KB)");
}
zip(plugin, path.join(dist, "lazer-wave-game.zip"));
zip(theme, path.join(dist, "lazer-wave-theme.zip"));
