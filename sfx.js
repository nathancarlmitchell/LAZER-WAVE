// Lazer Wave -- the synthesized sound effects: the startup sequence the game comes on with, and the moments that have a
// sound of their own (a gate passed, overdrive coming on and running out, a laser absorbed in it, the multiplier
// climbing, a boss level's siren and its boss brought down, a new best on the results, the game over and the run's
// finish). Each is built on Web Audio from a small kit (sfxKit) as a function of (c, at, out, arg): scheduled on the
// context c from audio time `at` into the node out, so it can be rendered offline as well as played, and playSfx plays
// one. They are sound effects: each at its own level (SFX_LEVELS) times the SOUND FX setting's share (sfxLevel,
// audio.js), and none with it off. The pitched ones play in the act's key (SONGS, music.js), so they sit with its song;
// the startup's, the game over's and the finish's in A, the key the game opens and closes in. index.html loads this
// with a plain <script src>, as globals rather than modules, so the game still opens straight off disk.

// Each effect's level, against the others and the game's own sounds: set by measuring each one's loudest twentieth of a
// second, the bass under 150 Hz left out as small speakers leave it out, against the sound it replaced or the one it
// sits nearest. The startup as loud as the sequence it replaced; the gate as the old gate's sweep, the absorb as the
// coin it replaced; overdrive coming on near the gate (the stock power-up it replaced was the faintest sound in the
// game), running out and the multiplier quieter, reminders rather than events; the siren a little under the gate; the
// boss's stab a little under the startup, over the song's last chord; the finale as the startup; the new best's bells
// and the game over over the results' and the death's own sounds, which they follow
var SFX_LEVELS = { startup: 0.73, gate: 0.6, driveStart: 0.75, driveEnd: 0.9, absorb: 1.05, multiplier: 0.8,
    bossWarning: 1.1, bossDown: 0.6, reward: 0.75, gameOver: 0.65, finale: 0.65 };
var sfxNoise = null; // a second of white noise, made once (sfxKit)

function playSfx(fn, delay, level, arg) { // play an effect `delay` seconds from now at `level` times SOUND FX's share:
    // nothing with SOUND FX off, nor before the browser lets sound start (it would all come at once when it did)
    var c = beatAudio();
    if (!c || c.state != "running" || sfxLevel <= 0) {
        return;
    }
    var out = c.createGain();
    out.gain.value = level * sfxLevel;
    out.connect(c.destination);
    fn(c, c.currentTime + (delay || 0), out, arg);
}

function sfxKit(c, out) { // the kit, on context c, into out (any of these taking `to` goes there instead): gains with
    // envelopes, oscillators, noise, filters, panners, an echo bouncing side to side, a room, and a pulse wave
    var k = {};
    k.gain = function (to, v) { // a plain gain
        var g = c.createGain();
        g.gain.value = v === undefined ? 1 : v;
        g.connect(to || out);
        return g;
    };
    k.env = function (to, at, peak, attack, off, release, linear) { // up to peak over attack from `at` (exponentially,
        // or in a straight line), held until `off`, then gone over release
        var g = c.createGain(), letGo = Math.max(off, at + attack);
        g.gain.setValueAtTime(linear ? 0 : 0.0001, at);
        if (linear) {
            g.gain.linearRampToValueAtTime(peak, at + attack);
        } else {
            g.gain.exponentialRampToValueAtTime(peak, at + attack);
        }
        g.gain.setValueAtTime(peak, letGo);
        g.gain.exponentialRampToValueAtTime(0.0001, letGo + release);
        g.connect(to || out);
        return g;
    };
    k.osc = function (type, hz, at, until, cents) { // sounding from `at` to `until`; type a wave's name, or a PeriodicWave
        var o = c.createOscillator();
        if (typeof type == "string") {
            o.type = type;
        } else {
            o.setPeriodicWave(type);
        }
        o.frequency.setValueAtTime(hz, at);
        o.detune.value = cents || 0;
        o.start(at);
        o.stop(until);
        return o;
    };
    k.noise = function (at, until) { // white noise, looped for as long as it is wanted: a second of it, not the drums'
        // quarter (noiseSource, audio.js), whose loop a long sweep through it would let be heard
        if (!sfxNoise || sfxNoise.sampleRate != c.sampleRate) {
            sfxNoise = c.createBuffer(1, c.sampleRate, c.sampleRate);
            var d = sfxNoise.getChannelData(0);
            for (var i = 0; i < d.length; i++) {
                d[i] = Math.random() * 2 - 1; // audio only, as the drums' noise is
            }
        }
        var n = c.createBufferSource();
        n.buffer = sfxNoise;
        n.loop = true;
        n.start(at);
        n.stop(until);
        return n;
    };
    k.filt = function (type, hz, q, at) { // a filter at hz from `at`, for its ramps to run from
        var f = c.createBiquadFilter();
        f.type = type;
        f.frequency.setValueAtTime(hz, at || 0);
        f.Q.value = q === undefined ? 0.7 : q;
        return f;
    };
    k.pan = function (x, to) { // a place across the stereo field; a plain gain where a browser has no panner (its `pan`
        // is then missing, and anything moving it checks)
        if (!c.createStereoPanner) {
            return k.gain(to);
        }
        var p = c.createStereoPanner();
        p.pan.value = x;
        p.connect(to || out);
        return p;
    };
    k.pingpong = function (time, feedback, wet, cutoff, to) { // an echo every `time` seconds, left then right, each
        // repeat duller; what is sent to the node it returns echoes, at `wet`
        var send = c.createGain(), left = c.createDelay(2), right = c.createDelay(2), dull = k.filt("lowpass", cutoff, 0.5);
        var backL = c.createGain(), backR = c.createGain(), w = k.gain(to, wet);
        left.delayTime.value = right.delayTime.value = time;
        backL.gain.value = backR.gain.value = feedback;
        send.connect(dull);
        dull.connect(left);
        left.connect(k.pan(-0.8, w));
        left.connect(backL);
        backL.connect(right);
        right.connect(k.pan(0.8, w));
        right.connect(backR);
        backR.connect(left);
        return send;
    };
    k.room = function (secs, decay, to) { // a big room: noise dying away over `secs`, a reverb for what is sent to it
        var len = Math.floor(secs * c.sampleRate), ir = c.createBuffer(2, len, c.sampleRate);
        for (var ch = 0; ch < 2; ch++) {
            var d = ir.getChannelData(ch);
            for (var i = 0; i < len; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); // audio only, as the drums' noise is
            }
        }
        var r = c.createConvolver();
        r.buffer = ir;
        r.connect(to || out);
        return r;
    };
    k.pulse = function (duty) { // a pulse wave, high for `duty` of each cycle: an arcade's thin square
        var n = 40, re = new Float32Array(n), im = new Float32Array(n);
        for (var j = 1; j < n; j++) {
            re[j] = 2 / (j * Math.PI) * Math.sin(j * Math.PI * duty);
        }
        return c.createPeriodicWave(re, im);
    };
    return k;
}

function sfxLow(key) { // the key's note in the octave up from E1, for a sub under an effect
    return 28 + ((key - 28) % 12 + 12) % 12;
}

// The startup sequence ("Overcharge"): as the title's laser comes up (titlelight.js), the game's gun charging and firing,
// in A. A whine climbs three octaves to A, its vibrato quickening, a fifth over it and a saw an octave under it through
// a band that follows it, over a hum throbbing faster and faster and arcs of static crackling from side to side; two
// pips as it locks on; then, as the laser reaches the title (STARTUP_HIT), it fires: a saw diving from the top to the
// floor and a square a moment behind it, a crack, a boom, the static draining away, and the key's chord humming on as
// it rings out, for the menu theme to come in under (theme.js). Scheduled on c from `when` at `level` (the SOUND FX
// setting's share) into out, everything it needs handed in, so it can be rendered offline as well as played
function startupSequence(c, when, level, out) {
    var m = c.createGain();
    m.gain.value = SFX_LEVELS.startup * level;
    m.connect(out || c.destination);
    var k = sfxKit(c, m), key = STARTUP_KEY, hit = when + STARTUP_HIT, end = hit + 2;
    [[0, 0.08, "sine"], [7, 0.03, "sine"], [-12, 0.05, "sawtooth"]].forEach(function (v) { // the whine: from three
        // octaves under its top to it, the fifth over it, and the saw under it through its band
        var w = k.osc(v[2], midiHz(key - 12 + v[0]), when, hit - 0.015);
        w.frequency.exponentialRampToValueAtTime(midiHz(key + 24 + v[0]), hit - 0.02);
        var lfo = k.osc("sine", 4, when, hit), depth = c.createGain();
        lfo.frequency.exponentialRampToValueAtTime(26, hit);
        depth.gain.setValueAtTime(5, when);
        depth.gain.linearRampToValueAtTime(45, hit);
        lfo.connect(depth);
        depth.connect(w.detune);
        var g = c.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(v[1], hit - 0.03);
        g.gain.linearRampToValueAtTime(0, hit - 0.015);
        g.connect(m);
        if (v[2] == "sawtooth") {
            var band = k.filt("bandpass", midiHz(key), 4, when);
            band.frequency.exponentialRampToValueAtTime(midiHz(key + 36), hit - 0.02);
            w.connect(band);
            band.connect(g);
        } else {
            w.connect(g);
        }
    });
    var hum = k.osc("sawtooth", midiHz(key - 36), when, hit), humLow = k.filt("lowpass", 180, 1, when); // the hum,
    var throb = c.createGain(), rate = k.osc("sine", 3, when, hit), swing = c.createGain(); // throbbing faster
    throb.gain.value = swing.gain.value = 0.5;
    rate.frequency.exponentialRampToValueAtTime(16, hit);
    rate.connect(swing);
    swing.connect(throb.gain);
    var humGain = c.createGain();
    humGain.gain.setValueAtTime(0, when);
    humGain.gain.linearRampToValueAtTime(0.09, hit - 0.03);
    humGain.gain.linearRampToValueAtTime(0, hit - 0.01);
    hum.connect(humLow);
    humLow.connect(throb);
    throb.connect(humGain);
    humGain.connect(m);
    var t = when + 0.08, seed = 7; // the arcs: crackles, closer together as it charges, flung side to side, from a
    var rnd = function () { // stream of their own, so the sequence sounds the same every time
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    while (t < hit - 0.03) {
        var arc = k.noise(t, t + 0.02), edge = k.filt("highpass", 3000 + 4000 * rnd(), 2, t);
        arc.connect(edge);
        edge.connect(k.env(k.pan(rnd() * 1.6 - 0.8), t, 0.05 + 0.08 * (t - when) / STARTUP_HIT, 0.001, t + 0.004 * rnd(),
            0.01 + 0.01 * rnd()));
        t += 0.02 + 0.12 * rnd() * (1 - (t - when) / STARTUP_HIT);
    }
    [hit - 0.16, hit - 0.09].forEach(function (at) { // locked on: two quick pips at the top
        k.osc("sine", midiHz(key + 36), at, at + 0.05).connect(k.env(null, at, 0.05, 0.002, at + 0.03, 0.01));
    });
    var echo = k.pingpong(0.16, 0.5, 0.55, 2500); // it fires: the zap and its shadow, echoing
    [["sawtooth", 0, -0.3], ["square", 0.015, 0.3]].forEach(function (z) {
        var at = hit + z[1], o = k.osc(z[0], midiHz(key + 24), at, at + 0.6), f = k.filt("lowpass", 9000, 1, at);
        o.frequency.exponentialRampToValueAtTime(50, at + 0.5);
        f.frequency.exponentialRampToValueAtTime(400, at + 0.5);
        o.connect(f);
        var g = k.env(k.pan(z[2]), at, 0.17, 0.003, at + 0.05, 0.5);
        f.connect(g);
        g.connect(echo);
    });
    var crack = k.noise(hit, hit + 0.08), crackEdge = k.filt("highpass", 2500, 0.7, hit); // a crack, a boom
    crack.connect(crackEdge);
    crackEdge.connect(k.env(null, hit, 0.35, 0.001, hit + 0.01, 0.06));
    var boom = k.osc("sine", 85, hit, hit + 1.2);
    boom.frequency.exponentialRampToValueAtTime(28, hit + 0.7);
    boom.connect(k.env(null, hit, 0.65, 0.004, hit + 0.06, 1.0));
    var fizz = k.noise(hit, hit + 0.9), fizzBand = k.filt("bandpass", 6000, 3, hit); // the static draining away
    fizzBand.frequency.exponentialRampToValueAtTime(350, hit + 0.8);
    fizz.connect(fizzBand);
    fizzBand.connect(k.env(null, hit, 0.12, 0.01, hit + 0.1, 0.7));
    var pad = k.filt("lowpass", 1200, 0.7, hit); // and the key's chord humming on
    pad.connect(k.env(null, hit + 0.3, 0.05, 0.35, hit + 0.8, 1.0, true));
    [-24, -17, -12, -9].forEach(function (s) {
        k.osc("triangle", midiHz(key + s), hit + 0.3, end).connect(pad);
    });
}

// A gate passed: the waves meeting in the beam they become. Two tones an octave either side of the key's note, at
// either side of the field, glide in to it and ring on as one, a ping an octave over where they meet; back to the wave,
// the one splits into the two, gliding apart
var GATE_MEET = 0.18; // s they take to meet, or to part

function sfxGate(c, at, out, o) { // o: { key, toLaser }
    var k = sfxKit(c, out), mid = midiHz(o.key), meet = at + GATE_MEET, echo = k.pingpong(0.12, 0.3, 0.4, 3000);
    [[-12, -0.7], [12, 0.7]].forEach(function (w) {
        var far = midiHz(o.key + w[0]), p = k.pan(o.toLaser ? w[1] : 0);
        var tone = k.osc("triangle", o.toLaser ? far : mid, at, at + 0.7);
        tone.frequency.exponentialRampToValueAtTime(o.toLaser ? mid : far, meet);
        if (p.pan) {
            p.pan.setValueAtTime(o.toLaser ? w[1] : 0, at);
            p.pan.linearRampToValueAtTime(o.toLaser ? 0 : w[1], meet);
        }
        var g = k.env(p, at, 0.2, 0.01, meet + (o.toLaser ? 0.1 : 0), o.toLaser ? 0.35 : 0.25);
        tone.connect(g);
        g.connect(echo);
    });
    if (o.toLaser) {
        k.osc("sine", midiHz(o.key + 24), meet, meet + 0.4).connect(k.env(null, meet, 0.08, 0.003, meet, 0.3));
    }
}

// Overdrive comes on, on its beat: the startup's shot, smaller -- a saw diving from two octaves over the key's note to
// the floor, a crack and a boom -- and the power surging up after it, a whine and its fifth climbing two octaves as
// their vibrato quickens
function sfxDriveStart(c, at, out, key) {
    var k = sfxKit(c, out), echo = k.pingpong(0.14, 0.4, 0.45, 2500);
    var zap = k.osc("sawtooth", midiHz(key + 24), at, at + 0.4), zapLow = k.filt("lowpass", 9000, 1, at);
    zap.frequency.exponentialRampToValueAtTime(midiHz(key - 36), at + 0.3);
    zapLow.frequency.exponentialRampToValueAtTime(400, at + 0.3);
    zap.connect(zapLow);
    var zg = k.env(null, at, 0.16, 0.003, at + 0.03, 0.3);
    zapLow.connect(zg);
    zg.connect(echo);
    var crack = k.noise(at, at + 0.05), edge = k.filt("highpass", 3000, 0.7, at);
    crack.connect(edge);
    edge.connect(k.env(null, at, 0.25, 0.001, at, 0.04));
    var boom = k.osc("sine", 90, at, at + 0.5);
    boom.frequency.exponentialRampToValueAtTime(35, at + 0.35);
    boom.connect(k.env(null, at, 0.4, 0.004, at + 0.02, 0.35));
    [[0, 0.07], [7, 0.025]].forEach(function (s) {
        var t = at + 0.08, w = k.osc("sine", midiHz(key + s[0]), t, t + 0.6);
        w.frequency.exponentialRampToValueAtTime(midiHz(key + 24 + s[0]), t + 0.45);
        var lfo = k.osc("sine", 5, t, t + 0.6), depth = c.createGain();
        lfo.frequency.exponentialRampToValueAtTime(20, t + 0.45);
        depth.gain.value = 25;
        lfo.connect(depth);
        depth.connect(w.detune);
        var g = k.env(null, t, s[1], 0.15, t + 0.3, 0.2, true);
        w.connect(g);
        g.connect(echo);
    });
}

// Overdrive runs out: the surge in reverse, a whine falling two octaves to the key's note as its vibrato slows, the
// hum under it sagging away, and the last of the static fizzing out
function sfxDriveEnd(c, at, out, key) {
    var k = sfxKit(c, out);
    var w = k.osc("sine", midiHz(key + 24), at, at + 0.6), lfo = k.osc("sine", 20, at, at + 0.6), depth = c.createGain();
    w.frequency.exponentialRampToValueAtTime(midiHz(key), at + 0.45);
    lfo.frequency.exponentialRampToValueAtTime(4, at + 0.45);
    depth.gain.value = 25;
    lfo.connect(depth);
    depth.connect(w.detune);
    w.connect(k.env(null, at, 0.07, 0.01, at + 0.15, 0.35));
    var hum = k.osc("sawtooth", midiHz(key - 36), at, at + 0.6), humLow = k.filt("lowpass", 220, 1, at);
    hum.frequency.exponentialRampToValueAtTime(midiHz(key - 36) * 0.75, at + 0.5);
    hum.connect(humLow);
    humLow.connect(k.env(null, at, 0.08, 0.01, at + 0.1, 0.4));
    var fizz = k.noise(at, at + 0.5), band = k.filt("bandpass", 5000, 2, at);
    band.frequency.exponentialRampToValueAtTime(500, at + 0.45);
    fizz.connect(band);
    band.connect(k.env(null, at, 0.05, 0.01, at + 0.05, 0.35));
}

// A laser absorbed in overdrive: a zap played backwards, a saw rising from an octave under the key's note to two over
// it and cut off, and a glint where it ends
var ABSORB_SECS = 0.07;

function sfxAbsorb(c, at, out, key) {
    var k = sfxKit(c, out), end = at + ABSORB_SECS;
    var zap = k.osc("sawtooth", midiHz(key - 12), at, end + 0.02), open = k.filt("lowpass", 600, 2, at);
    zap.frequency.exponentialRampToValueAtTime(midiHz(key + 24), end);
    open.frequency.exponentialRampToValueAtTime(7000, end);
    zap.connect(open);
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.14, end - 0.005);
    g.gain.linearRampToValueAtTime(0, end + 0.01);
    g.connect(out);
    open.connect(g);
    k.osc("sine", midiHz(key + 24), end, end + 0.12).connect(k.env(null, end, 0.06, 0.002, end, 0.09));
}

// The multiplier steps up: three quick blips climbing the key's note, its fifth and its octave, in pulses as an
// arcade's, the whole a step higher for every step of the multiplier, to a point
function sfxMultiplier(c, at, out, o) { // o: { key, mult }
    var k = sfxKit(c, out), wave = k.pulse(0.25), lift = 2 * Math.min(Math.max(0, o.mult - 2), 6);
    [0, 7, 12].forEach(function (s, i) {
        var t = at + i * 0.04;
        k.osc(wave, midiHz(o.key + 12 + lift + s), t, t + 0.06).connect(k.env(null, t, 0.06, 0.002, t + 0.025, 0.02));
    });
}

// A boss level begins: a siren over the count-in, the startup's whine wailing up and down twice between an octave
// under the key's note and an octave over it, over a low throb, echoing
function sfxBossWarning(c, at, out, key) {
    var k = sfxKit(c, out), lo = midiHz(key - 12), hi = midiHz(key + 12), echo = k.pingpong(0.2, 0.35, 0.4, 2500);
    var wail = k.osc("sawtooth", lo, at, at + 1.8), band = k.filt("bandpass", 1200, 1.5, at);
    for (var i = 0; i < 2; i++) {
        wail.frequency.exponentialRampToValueAtTime(hi, at + i * 0.8 + 0.4);
        wail.frequency.exponentialRampToValueAtTime(lo, at + i * 0.8 + 0.8);
    }
    var lfo = k.osc("sine", 6, at, at + 1.8), depth = c.createGain();
    depth.gain.value = 20;
    lfo.connect(depth);
    depth.connect(wail.detune);
    wail.connect(band);
    var g = k.env(null, at, 0.12, 0.05, at + 1.5, 0.15, true);
    band.connect(g);
    g.connect(echo);
    var throb = k.osc("square", midiHz(key - 36), at, at + 1.7), low = k.filt("lowpass", 200, 1, at);
    var chop = c.createGain(), rate = k.osc("square", 5, at, at + 1.7), swing = c.createGain();
    chop.gain.value = swing.gain.value = 0.5;
    rate.connect(swing);
    swing.connect(chop.gain);
    throb.connect(low);
    low.connect(chop);
    chop.connect(k.env(null, at, 0.1, 0.05, at + 1.4, 0.25, true));
}

// A boss brought down: a stab, the key's minor chord with its ninth on saws three a note through a filter snapping open
// and closing slowly, over a kick and the key's root low down; a snare in a big room cut short; the boss's debris
// bursting; and a pluck echoing away, high
function sfxBossDown(c, at, out, key) {
    var k = sfxKit(c, out), end = at + 2;
    var stab = k.filt("lowpass", 7000, 0.9, at);
    stab.frequency.exponentialRampToValueAtTime(900, at + 1.6);
    stab.connect(k.env(null, at, 0.045, 0.005, at + 0.12, 1.5));
    [-24, -12, -9, -5, 2, 7].forEach(function (s) {
        [-14, 0, 14].forEach(function (cents) { k.osc("sawtooth", midiHz(key + s), at, end, cents).connect(stab); });
    });
    var kick = k.osc("sine", 150, at, at + 0.4);
    kick.frequency.exponentialRampToValueAtTime(45, at + 0.14);
    kick.connect(k.env(null, at, 0.6, 0.004, at, 0.35));
    k.osc("sine", midiHz(sfxLow(key)), at, end).connect(k.env(null, at, 0.14, 0.01, at + 0.2, 1));
    var gate = k.gain(null, 0); // the room, cut short: 80s gated reverb
    gate.gain.setValueAtTime(0.9, at);
    gate.gain.setValueAtTime(0.9, at + 0.28);
    gate.gain.linearRampToValueAtTime(0, at + 0.31);
    var room = k.room(1.4, 2.5, gate);
    var snare = k.noise(at, at + 0.25), band = k.filt("bandpass", 1800, 0.8, at);
    snare.connect(band);
    var sg = k.env(null, at, 0.3, 0.003, at, 0.12);
    band.connect(sg);
    sg.connect(room);
    var tone = k.osc("triangle", 190, at, at + 0.15);
    tone.frequency.exponentialRampToValueAtTime(120, at + 0.08);
    var tg = k.env(null, at, 0.25, 0.003, at, 0.1);
    tone.connect(tg);
    tg.connect(room);
    var debris = k.noise(at, at + 1), dull = k.filt("lowpass", 2500, 0.7, at);
    dull.frequency.exponentialRampToValueAtTime(200, at + 0.8);
    debris.connect(dull);
    dull.connect(k.env(null, at, 0.15, 0.005, at + 0.05, 0.7));
    var echo = k.pingpong(0.25, 0.45, 0.6, 4000);
    var pluck = k.osc("square", midiHz(key + 19), at + 0.42, at + 0.6), pluckLow = k.filt("lowpass", 3000, 2, at + 0.42);
    pluck.connect(pluckLow);
    pluckLow.connect(k.env(echo, at + 0.42, 0.06, 0.003, at + 0.42, 0.15));
}

// The run finished: the boss's stab in A after a swell drawn in backwards, noise opening up and the chord swelling, both
// cut off on the hit, FINALE_HIT in
var FINALE_HIT = 0.85;

function sfxFinale(c, at, out) {
    var k = sfxKit(c, out), key = STARTUP_KEY, hit = at + FINALE_HIT;
    var rush = k.noise(at, hit), open = k.filt("lowpass", 300, 0.7, at), rg = c.createGain();
    open.frequency.exponentialRampToValueAtTime(10000, hit);
    rg.gain.setValueAtTime(0.0001, at);
    rg.gain.exponentialRampToValueAtTime(0.1, hit - 0.01);
    rg.gain.linearRampToValueAtTime(0, hit);
    rush.connect(open);
    open.connect(rg);
    rg.connect(out);
    var swell = k.filt("lowpass", 400, 0.7, at), sg = c.createGain();
    swell.frequency.exponentialRampToValueAtTime(4000, hit);
    sg.gain.setValueAtTime(0.0001, at);
    sg.gain.exponentialRampToValueAtTime(0.03, hit - 0.01);
    sg.gain.linearRampToValueAtTime(0, hit);
    swell.connect(sg);
    sg.connect(out);
    [-24, -12, -9, -5, 2, 7].forEach(function (s) { k.osc("sawtooth", midiHz(key + s), at, hit + 0.01).connect(swell); });
    sfxBossDown(c, hit, out, key);
}

// A new best on the results: three bells climbing the key's chord, quick; for a FLAWLESS, the octave over them as its
// stamp lands (FLAWLESS_STAMP, levels.js), ringing on in a haze; all echoing side to side
var REWARD_STEP = 0.07; // s from one bell to the next
var REWARD_DELAY = 0.35; // s after the results come up that a new best's bells ring, after the results' own sound;
                         // a best grade's ring as the grade lands instead, so as not to tell it first (RANK_IN, levels.js)

function sfxReward(c, at, out, o) { // o: { key, flawless }
    var k = sfxKit(c, out), echo = k.pingpong(0.3, 0.35, 0.45, 3000), base = o.key + 12;
    var bell = function (m, t, peak, pan, ring) { // a bell: a sine struck by another at 3.5 times its pitch, the strike
        var f = midiHz(m), car = k.osc("sine", f, t, t + ring + 0.1), mod = k.osc("sine", f * 3.5, t, t + ring + 0.1);
        var index = c.createGain(); // dying fast
        index.gain.setValueAtTime(f * 2.2, t);
        index.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.5);
        mod.connect(index);
        index.connect(car.frequency);
        var g = k.env(k.pan(pan), t, peak, 0.003, t, ring);
        car.connect(g);
        g.connect(echo);
    };
    [0, 3, 7].forEach(function (s, i) { bell(base + s, at + i * REWARD_STEP, 0.09, -0.4 + 0.4 * i, 1.1); });
    if (o.flawless) {
        var land = at + FLAWLESS_STAMP;
        bell(base + 12, land, 0.12, 0, 1.6);
        bell(base + 19, land + 0.012, 0.06, 0.2, 1.4);
        var haze = k.filt("lowpass", 6000, 0.5, land);
        haze.connect(k.env(null, land, 0.02, 0.3, land + 0.4, 1, true));
        [24, 27, 31].forEach(function (s, i) { k.osc("sine", midiHz(base + s), land, land + 1.8, (i - 1) * 6).connect(haze); });
    }
}

// The game over: the arcade's boot run backwards. Its chord in pulses fades with a wobble, its coin's climb falls, the
// static crackles, and the tube goes off: a snap, the picture collapsing in a falling whine, the mains hum sagging away,
// and a last thunk
function sfxGameOver(c, at, out) {
    var k = sfxKit(c, out), key = STARTUP_KEY, thin = k.pulse(0.25), thinner = k.pulse(0.125), off = at + 0.85;
    var vib = k.osc("sine", 6, at, at + 0.5), depth = c.createGain();
    depth.gain.value = 18;
    vib.connect(depth);
    [0, 3, 7, 12].forEach(function (s, i) {
        var o = k.osc(i % 2 ? thinner : thin, midiHz(key + s), at, at + 0.45);
        depth.connect(o.detune);
        o.connect(k.env(k.pan(i % 2 ? 0.25 : -0.25), at, 0.045, 0.003, at + 0.05, 0.35));
    });
    k.osc("triangle", midiHz(key - 24), at, at + 0.45).connect(k.env(null, at, 0.2, 0.003, at + 0.05, 0.35));
    [19, 15, 12, 7, 3, 0].forEach(function (s, i) {
        var t = at + 0.3 + i * 0.075;
        k.osc(thin, midiHz(key + s), t, t + 0.08).connect(k.env(k.pan(0.3 - i * 0.12), t, 0.07, 0.002, t + 0.05, 0.02));
    });
    [0, 0.04, 0.09, 0.15, 0.2].forEach(function (s, i) { // the static
        var t = at + 0.72 + s, n = k.noise(t, t + 0.05), band = k.filt("bandpass", 2500 + 900 * (i % 3), 0.6, t);
        n.connect(band);
        band.connect(k.env(null, t, 0.07 - 0.01 * i, 0.002, t + 0.015, 0.02));
    });
    var snap = k.noise(off, off + 0.02), edge = k.filt("highpass", 2000, 0.7, off);
    snap.connect(edge);
    edge.connect(k.env(null, off, 0.3, 0.0005, off + 0.003, 0.012));
    var whine = k.osc("sine", 2400, off, off + 0.5);
    whine.frequency.exponentialRampToValueAtTime(80, off + 0.35);
    whine.connect(k.env(null, off, 0.12, 0.002, off + 0.05, 0.3));
    var grit = k.osc("square", 1200, off, off + 0.5), gritLow = k.filt("lowpass", 3000, 1, off);
    grit.frequency.exponentialRampToValueAtTime(40, off + 0.35);
    gritLow.frequency.exponentialRampToValueAtTime(200, off + 0.35);
    grit.connect(gritLow);
    gritLow.connect(k.env(null, off, 0.05, 0.002, off + 0.05, 0.3));
    var hum = k.osc("sawtooth", 60, off, off + 1.4), humLow = k.filt("lowpass", 300, 2, off);
    hum.frequency.exponentialRampToValueAtTime(42, off + 1.2);
    hum.connect(humLow);
    humLow.connect(k.env(null, off, 0.14, 0.01, off + 0.1, 1.1));
    var thunk = k.osc("sine", 90, off + 0.42, off + 0.7);
    thunk.frequency.exponentialRampToValueAtTime(40, off + 0.57);
    thunk.connect(k.env(null, off + 0.42, 0.35, 0.002, off + 0.42, 0.18));
}
