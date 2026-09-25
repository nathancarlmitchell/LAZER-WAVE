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
