// Lazer Wave -- the title's laser. On the start screen a laser sweeps back and forth behind the title: its line shows
// through the gaps between the letters, its light spills round them in rays with each letter's shadow cut through
// them, and where it passes the letters' outlines burn. A WebGL fragment shader draws it, on a canvas of its own laid
// over the game's and screen-blended, so it only ever adds light and the start screen under it is drawn as it always
// was. index.html loads this with a plain <script src>, as globals rather than modules, so the game still opens
// straight off disk. Nothing here runs at load.
//
// Like the other effects it reads the game and never writes to it: the start screen's state (gameStart, menuUp), the
// effects setting (fxLook: it sweeps only at "full", so reduced motion never sees it), the layout (layoutFrame) and
// the title's own shape (drawTitle, TITLE_LINES). drawStartScreen calls titleLight to set it going; it stops itself
// when the start screen goes. Where there is no WebGL there is simply no laser. titleSweepAt tells the particles behind
// the start screen (titleparticles.js) where it is, for the sparks it strikes and the dust it lights.
//
// The rays are light scattering done on the screen: every pixel gathers the light along its way to the laser's hot
// spot from a picture of the light with the title's silhouette standing in front of it, so where a letter is in the
// way the gathering comes up short, and the letter's shadow streams out from it, away from the light.

var TITLE_SWEEP = 2.6; // seconds the laser takes to cross the title one way; it eases at each end and comes back
var TITLE_FADE = 0.8; // seconds it takes to come up when the start screen does
var TITLE_REACH = 80; // layout px the sweep runs on past the title at each end
var TITLE_PIXELS = 360000; // the most pixels it draws: a bigger window gets it drawn smaller and stretched, as a glow
                           // can be without anyone seeing
var tl = { canvas: null, gl: null, broken: false, frame: null, t0: 0, key: "", w: 1, h: 1, k: 1, box: null,
    mask: null, tex: null, u: {} }; // its canvas and WebGL, the loop, and what the mask was last drawn for

const TITLE_VERT = [
    "attribute vec2 aPos;",
    "varying vec2 vUv;",
    "void main() {",
    "    vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); // 0,0 at the top left, as the mask has it",
    "    gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"].join("\n");

const TITLE_FRAG = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "varying vec2 vUv;",
    "uniform sampler2D uMask; // r: the title's whole silhouette, shadow copies and all; g: its face's outline",
    "uniform vec2 uSize;      // the canvas, in its own pixels",
    "uniform float uK;        // its pixels to a layout pixel",
    "uniform vec2 uHot;       // the laser's hot spot, which its light is gathered towards",
    "uniform vec2 uSpan;      // the title's band, top and bottom: the line runs a little past it, the light fades out",
    "uniform float uGlow;     // how far it has come up, 0 to 1",
    "uniform float uTime;     // seconds, for the burn's flicker, starting again every 100 so it stays precise",
    "uniform vec3 uCore, uLaser, uMagenta;",
    "const int STEPS = 40;",
    "",
    "float gauss(float q) { return exp(-0.5 * min(q * q, 40.0)); } // q in sigmas, kept clear of overflow",
    "",
    "vec2 lay(vec2 p) { return (p - uHot) * uSize / uK; } // layout px from the hot spot",
    "",
    "float band(vec2 p, float reach) { // 1 across the title's band, fading out `reach` layout px above and below it",
    "    float dy = max(uSpan.x - p.y, p.y - uSpan.y) * uSize.y / uK;",
    "    return 1.0 - smoothstep(0.0, reach, dy);",
    "}",
    "",
    "float line(vec2 p) { // the laser itself: a hot line a couple of px wide, running a little past the title",
    "    float dx = lay(p).x;",
    "    return (gauss(dx / 1.8) * 1.3 + gauss(dx / 7.0) * 0.35) * band(p, 40.0);",
    "}",
    "",
    "float haze(vec2 p) { // its light, hanging in the air round it: what the title stands in front of",
    "    vec2 d = lay(p) / vec2(80.0, 110.0);",
    "    return exp(-0.5 * min(dot(d, d), 40.0));",
    "}",
    "",
    "vec3 ramp(float v) { // light's colour by its strength: magenta at a glimmer, the laser's pink, white at the core",
    "    vec3 c = mix(uMagenta, uLaser, smoothstep(0.08, 0.55, v));",
    "    return mix(c, uCore, smoothstep(0.55, 1.3, v)) * min(v, 1.2);",
    "}",
    "",
    "void main() {",
    "    vec4 m = texture2D(uMask, vUv);",
    "    float body = m.r;",
    "    // the rays: along the way to the hot spot, gather the light no letter stands in front of, fainter the further",
    "    vec2 stepv = (uHot - vUv) * (0.9 / float(STEPS));",
    "    vec2 p = vUv;",
    "    float decay = 1.0, gathered = 0.0;",
    "    for (int i = 0; i < STEPS; i++) {",
    "        p += stepv;",
    "        gathered += (haze(p) + line(p) * 0.25) * (1.0 - texture2D(uMask, p).r) * decay;",
    "        decay *= 0.965;",
    "    }",
    "    float rays = gathered * (1.7 / float(STEPS));",
    "    float seen = haze(vUv) * 0.22 + line(vUv); // the laser and its haze themselves, between the letters",
    "    // and nothing on the letters, which stand in front of it all, or far above or below the title",
    "    float light = (rays + seen) * (1.0 - body) * band(vUv, 120.0);",
    "    // the burn: the silhouette's edge, where the light behind wraps round it, and the face's outline where the",
    "    // laser crosses behind it",
    "    vec2 o = 1.5 / uSize;",
    "    float a = texture2D(uMask, vUv + vec2(o.x, 0.0)).r, b = texture2D(uMask, vUv - vec2(o.x, 0.0)).r;",
    "    float c = texture2D(uMask, vUv + vec2(0.0, o.y)).r, d = texture2D(uMask, vUv - vec2(0.0, o.y)).r;",
    "    float rim = clamp(max(max(a, b), max(c, d)) - min(min(a, b), min(c, d)), 0.0, 1.0);",
    "    float flicker = 0.7 + 0.3 * sin(uTime * 31.0 + vUv.y * 170.0) * sin(uTime * 17.0 - vUv.x * 230.0 + vUv.y * 60.0);",
    "    float burn = (rim * haze(vUv) * 1.6 + m.g * gauss(lay(vUv).x / 16.0) * 2.2) * flicker;",
    "    vec3 col = (ramp(light) + mix(uLaser, uCore, clamp(burn * 0.8, 0.0, 1.0)) * burn) * uGlow;",
    "    col = vec3(1.0) - exp(-1.3 * col); // exposed rather than clipped: the brightest roll off to white",
    "    gl_FragColor = vec4(col, max(col.r, max(col.g, col.b))); // premultiplied: light, and nothing where there is none",
    "}"].join("\n");

function titleLight() { // set the laser going, if the start screen is up and the effects are full; it stops itself
    if (tl.frame !== null || !titleLightWanted() || !titleLightSetup()) {
        return;
    }
    tl.t0 = performance.now();
    tl.frame = requestAnimationFrame(titleLightFrame);
}

function titleLightWanted() { // the start screen itself (not a menu over it, not a level), with the effects at full
    return !gameStart && !menuUp() && fxLook() == "full" && !tl.broken;
}

function titleLightFrame(now) {
    tl.frame = null;
    if (!titleLightWanted()) {
        titleLightHide();
        return;
    }
    titleLightSync();
    titleLightDraw(now);
    if (tl.canvas.style.display == "none") { // shown only once it has something new on it
        tl.canvas.style.display = "block";
    }
    tl.frame = requestAnimationFrame(titleLightFrame);
}

function titleLightHide() {
    if (tl.canvas) {
        tl.canvas.style.display = "none";
    }
}

function titleLightSetup() { // its canvas, WebGL and shader, made the first time; false where there is no WebGL
    if (tl.gl || tl.broken) {
        return !!tl.gl;
    }
    var c = document.createElement("canvas");
    var gl = null;
    try {
        gl = c.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    } catch (e) { // no WebGL: no laser
    }
    var prog = gl && titleLightProgram(gl);
    if (!prog) {
        tl.broken = true;
        return false;
    }
    // over the game's canvas, sized and turned as it is (titleLightSync), adding its light to what is under it and
    // letting every click and touch through to it
    c.style.cssText = "position: fixed; left: 0; top: 0; pointer-events: none; mix-blend-mode: screen; z-index: 1;"
        + " display: none;";
    c.setAttribute("aria-hidden", "true");
    gameArea.canvas.parentNode.insertBefore(c, gameArea.canvas.nextSibling);
    c.addEventListener("webglcontextlost", function (e) { // the GPU was taken back: the start screen does without
        e.preventDefault();
        tl.broken = true;
        titleLightHide();
    });
    gl.useProgram(prog);
    var buf = gl.createBuffer(); // one triangle that covers the whole canvas
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    ["uMask", "uSize", "uK", "uHot", "uSpan", "uGlow", "uTime", "uCore", "uLaser", "uMagenta"].forEach(function (n) {
        tl.u[n] = gl.getUniformLocation(prog, n);
    });
    tl.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tl.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); // the mask's channels are data, not colour
    gl.uniform1i(tl.u.uMask, 0);
    gl.uniform3fv(tl.u.uCore, titleRGB(COLORS.laserCore));
    gl.uniform3fv(tl.u.uLaser, titleRGB(COLORS.laser));
    gl.uniform3fv(tl.u.uMagenta, titleRGB(COLORS.magenta));
    tl.canvas = c;
    tl.gl = gl;
    tl.mask = document.createElement("canvas");
    return true;
}

function titleLightProgram(gl) { // the shader, compiled and linked, or null if this GPU won't have it
    var shader = function (type, src) {
        var s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    var vs = shader(gl.VERTEX_SHADER, TITLE_VERT), fs = shader(gl.FRAGMENT_SHADER, TITLE_FRAG);
    if (!vs || !fs) {
        return null;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null;
}

function titleRGB(hex) { // "#ff2a6d" as the shader's 0..1 colour
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

function titleLightSync() { // follow the game's canvas: its size, and its turn on a phone held upright. The mask is
    // drawn again only when the size or the layout changes
    var game = gameArea.canvas, c = tl.canvas;
    if (c.style.transform != game.style.transform) {
        c.style.transform = game.style.transform;
    }
    if (c.style.transformOrigin != game.style.transformOrigin) {
        c.style.transformOrigin = game.style.transformOrigin;
    }
    var W = game.width, H = game.height, f = layoutFrame();
    var r = Math.min(1, Math.sqrt(TITLE_PIXELS / Math.max(1, W * H)));
    var key = [W, H, f.scale, f.x, f.y].join();
    if (key == tl.key) {
        return;
    }
    tl.key = key;
    tl.w = c.width = Math.max(1, Math.round(W * r));
    tl.h = c.height = Math.max(1, Math.round(H * r));
    tl.k = f.scale * r;
    c.style.width = W + "px"; // stretched back to the game's size
    c.style.height = H + "px";
    tl.box = titleMask(tl.w, tl.h, f, r);
    var gl = tl.gl;
    gl.viewport(0, 0, tl.w, tl.h);
    gl.bindTexture(gl.TEXTURE_2D, tl.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tl.mask);
}

function titleMask(w, h, f, r) { // draw the title's shape for the shader, where the start screen draws the title, and
    // return the box round it in layout coordinates. Its channels: red the whole silhouette, green the face's
    // outline. drawTitle does the red, its shadow copies in red and its magenta face red too (and blue, unused)
    var m = tl.mask;
    m.width = w;
    m.height = h;
    var c = m.getContext("2d");
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    c.setTransform(f.scale * r, 0, 0, f.scale * r, f.x * r, f.y * r);
    drawTitle("#ff0000", TITLE_DEPTH, c);
    c.globalCompositeOperation = "lighter"; // the outline added in green, over whatever is there
    c.strokeStyle = "#00ff00";
    c.lineWidth = 3;
    var box = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    TITLE_LINES.forEach(function (l) {
        c.strokeText(l.text, l.x, l.y);
        var mt = c.measureText(l.text);
        box.left = Math.min(box.left, l.x - TITLE_DEPTH);
        box.right = Math.max(box.right, l.x + mt.width);
        box.top = Math.min(box.top, l.y - mt.actualBoundingBoxAscent - TITLE_DEPTH);
        box.bottom = Math.max(box.bottom, l.y + mt.actualBoundingBoxDescent);
    });
    return box;
}

function titleSweep(now) { // where the sweep has got to at now: the line's x, in layout px, the title's band it runs
    // down, how far it has come up (0 to 1), and the seconds it has been going
    var b = tl.box, t = (now - tl.t0) / 1000;
    var leg = (t / TITLE_SWEEP) % 2; // 0..1 going, 1..2 coming back
    var ease = 0.5 - 0.5 * Math.cos(Math.PI * (leg < 1 ? leg : 2 - leg));
    return { x: b.left - TITLE_REACH + (b.right - b.left + 2 * TITLE_REACH) * ease, top: b.top, bottom: b.bottom,
        glow: Math.min(1, t / TITLE_FADE), t: t };
}

function titleSweepAt(now) { // the laser as it is at now, for what it lights up, or null while it isn't sweeping
    return tl.frame !== null && tl.box ? titleSweep(now) : null;
}

function titleLightDraw(now) { // one frame: where the sweep has got to, and the shader over the whole canvas
    var gl = tl.gl, f = layoutFrame(), game = gameArea.canvas, b = tl.box;
    var s = titleSweep(now);
    var toX = function (lx) { return (f.x + f.scale * lx) / game.width; };
    var toY = function (ly) { return (f.y + f.scale * ly) / game.height; };
    gl.uniform2f(tl.u.uSize, tl.w, tl.h);
    gl.uniform1f(tl.u.uK, tl.k);
    gl.uniform2f(tl.u.uHot, toX(s.x), toY((b.top + b.bottom) / 2));
    gl.uniform2f(tl.u.uSpan, toY(b.top - 40), toY(b.bottom + 40));
    gl.uniform1f(tl.u.uGlow, s.glow);
    gl.uniform1f(tl.u.uTime, s.t % 100);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
}
