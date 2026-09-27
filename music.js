// Lazer Wave -- the music. Every level has a song over its beat, written as MIDI notes: a key, the chords its bars go
// through, and the lines its parts play over them -- a bass, a pad, an arpeggio and a lead. Web Audio synths play it
// on the beat track's clock: scheduleBeats (loop.js) hands each beat to musicBeat as it hands one to the kick, so every
// note lands on the grid the game judges. index.html loads this with a plain <script src>, as globals rather than
// modules, so the game still opens straight off disk. Nothing here runs at load beyond building the tables.
//
// A song follows its level's form. The wave bars play its chords on the bass, the pad and the arpeggio; each laser
// section brings in the lead, over chords of its own; overdrive opens every filter; the song dips under each kick and
// swells back, as a sidechained mix pumps. A pause, a death, a retry or a quit cuts it (musicStop), and the first beat
// after a pause starts it again. A cleared level's last beat resolves onto the key's own chord, and lets it ring.

// The chords, as their notes' semitones above the key: MIDI note numbers counted from the key's. They are named as a
// minor key's are, lower case minor and upper case major; V is the fifth's chord made major, which pulls home
const CHORDS = {
    i: [0, 3, 7], iv: [5, 8, 12], V: [7, 11, 14], III: [3, 7, 10], VI: [8, 12, 15], VII: [10, 14, 17],
};

// Each level's song, indexed as LEVELS is (waves.js). key: the tonic, as a MIDI note number (69 is the A above middle
// C). chords: the wave bars', one a bar, from the first of each run of them; leadChords: the laser sections', from the
// first bar of each (the wave bars' if a song has none). bass, arp and lead are lines of steps, played round and round
// from the start of each section: the bass and the lead in eighths, the arpeggio in sixteenths, and the lead only in
// the laser sections. On a step, a number is a note -- the lead's counted in semitones from the key, the bass's from
// its chord's root, the arpeggio's as which of its chord's notes, 0 the lowest and 3 that one an octave up -- "-" holds
// the note before, and "." rests. A part a song has no line for doesn't play in it. Each song is busier than the last,
// as the levels get harder.
const SONGS = [null,
    { key: 69, chords: "i VI III VII", leadChords: "i VI III VII", // A minor: Am F C G
        bass: "0 - - 12 0 - 12 -",
        lead: "12 - - - 10 - 7 - 8 - - - 7 - 5 - 7 - - - 3 - 5 - 2 - - - - - . ." },
    { key: 64, chords: "i VII VI VII", leadChords: "VI VII i i", // E minor: Em D C D, and the lead's C D Em
        bass: "0 12 0 12 0 12 0 12",
        arp: "0 . 1 . 2 . 1 .",
        lead: "12 - 10 - 7 - 3 - 2 - 5 - 10 - 14 - 15 - - - 14 - 12 - 7 - - - - - . ." },
    { key: 62, chords: "i VI iv V", leadChords: "i VI VII V", // D minor: Dm Bb Gm A, and the lead's Dm Bb C A
        bass: "0 0 12 0 0 12 0 12",
        arp: "0 1 2 3 4 3 2 1",
        lead: "12 - 10 - 7 - . 7 8 - 7 - 3 - 5 - 10 - 14 - 12 - 10 - 11 - - - 7 - . ." },
    { key: 66, chords: "i VII VI V", leadChords: "VI VII i i", // F# minor: F#m E D C#, and the lead's D E F#m
        bass: "0 0 0 0 0 0 0 12",
        arp: "0 1 2 0 1 2 0 1 2 0 1 2 3 2 1 0",
        lead: "12 - 8 - 3 - 8 - 10 - 14 - 17 - 14 - 15 - - - 12 - - - 7 - 10 - 12 - . ." },
    { key: 60, chords: "i VI VII V", leadChords: "i VI III VII", // C minor: Cm Ab Bb G, and the lead's Cm Ab Eb Bb
        bass: "0 12 0 12 0 12 0 12",
        arp: "0 2 4 2 1 3 5 3",
        lead: "19 - - 17 15 - 12 - 15 - - 14 12 - 8 - 10 - - 12 14 - 15 - 17 - - - 14 - 10 -" },
];

// Where the parts play. The pad and the arpeggio take their chords' notes into the octave up from PAD_LOW and ARP_LOW,
// whatever the key, so each keeps to its own register and a chord moves to the next by steps. The bass starts a line
// of chords on the key's note in the octave up from BASS_LOW, and walks to each root after it the nearest way, never
// below BASS_FLOOR. The lead plays at its song's key
var BASS_LOW = 40; // E2
var BASS_FLOOR = 36; // C2
var PAD_LOW = 55; // G3
var ARP_LOW = 60; // middle C

// The parts' sounds. level: a note's peak; cutoff: its low-pass filter's (Hz); attack and release: its fade in and out
// (s). The pad's saws are each spread cents off its notes, and the lead's vibrato is vibrato cents deep at vibratoHz
const VOICES = {
    bass: { level: 0.11, cutoff: 380, release: 0.03 },
    pad: { level: 0.05, cutoff: 1100, attack: 0.3, release: 0.4, spread: 8 },
    arp: { level: 0.09, cutoff: 1500, release: 0.16 },
    lead: { level: 0.09, cutoff: 2600, release: 0.12, vibrato: 12, vibratoHz: 5.5 },
};
var MUSIC_VOLUME = 0.5; // the whole song, under the beat track (BEAT_VOLUME, audio.js): the kick is the beat
var MUSIC_DUCK = 0.55; // what the song dips to on each kick
var MUSIC_CUT = 0.12; // s the song takes to go when a pause, a death, a retry or a quit stops the level
var MUSIC_RING = 3; // and when the level is cleared, so its last chord rings out
var END_RING = 4; // s that chord takes to die away
var LASER_BRIGHT = 1.4; // how far the laser sections open the filters, as a chorus lifts
var OVERDRIVE_BRIGHT = 2.5; // and overdrive
var ECHO_BEATS = 0.75; // the arpeggio's and the lead's echo: a dotted eighth, each repeat quieter and duller
var ECHO_FEEDBACK = 0.35;
var ECHO_LEVEL = 0.3;

var music = null; // the song as it plays: where its notes go, and the beat its pad's chord lasts until; null stopped
var wordCache = {};
var rootCache = {};

function words(line) { // a chord line's or a part's steps, split once
    return wordCache[line] || (wordCache[line] = line.trim().split(/\s+/));
}

function songDef(n) { // the level's song; past the last, the last one again, as levelDef has it
    return SONGS[Math.max(1, Math.min(n, SONGS.length - 1))];
}

function midiHz(note) { // a MIDI note number's pitch: 69 is A, 440 Hz, and each semitone a twelfth of an octave
    return 440 * Math.pow(2, (note - 69) / 12);
}

function register(note, low) { // a MIDI note taken by octaves into the octave up from low
    return low + ((note - low) % 12 + 12) % 12;
}

function voiced(key, chord, low) { // a chord's notes in the octave up from low, lowest first
    return CHORDS[chord].map(function (t) { return register(key + t, low); }).sort(function (a, b) { return a - b; });
}

function bassRoots(key, line) { // the bass's root for each chord of a line: the first the nearest to the key's own
    // note, and each after it the nearest to the one before, so the bass walks from chord to chord rather than leaping
    var id = key + " " + line;
    if (!rootCache[id]) {
        var at = register(key, BASS_LOW);
        rootCache[id] = words(line).map(function (chord) {
            at = register(key + CHORDS[chord][0], at - 6); // the nearest: within a tritone of the last
            if (at < BASS_FLOOR) {
                at += 12;
            }
            return at;
        });
    }
    return rootCache[id];
}

function musicSection(bar) { // the run of bars, all wave or all laser, that a bar is in: its first bar, the bar after
    // its last, and whether it is laser
    var laser = laserBars(wave);
    var on = !!laser[bar];
    var first = bar, end = bar + 1;
    while (first > 0 && !!laser[first - 1] == on) {
        first--;
    }
    while (end < wave.bars && !!laser[end] == on) {
        end++;
    }
    return { laser: on, first: first, end: end };
}

function musicBeat(n, delay, beatSec, over) { // beat n of the level proper (0 is the first after the count-in) falls
    // `delay` seconds from now: play the song from it to the next. beatSec: a beat's length; over: overdrive runs on it
    var c = beatAudio();
    if (!c || c.state != "running") { // until the browser lets it run, its clock stands still: notes handed it now
        return; // would all sound at once when it starts
    }
    var song = songDef(level);
    var m = music || (music = musicBus(c, beatSec));
    var when = c.currentTime + delay;
    var sec = musicSection(Math.floor(n / BEATS_PER_BAR));
    var from = n - sec.first * BEATS_PER_BAR; // beats into its section, which starts the chords and the lines afresh
    var left = sec.end * BEATS_PER_BAR - n; // and beats left in it, which no note outlasts
    var line = sec.laser && song.leadChords || song.chords;
    var at = Math.floor(from / BEATS_PER_BAR) % words(line).length;
    var chord = words(line)[at];
    var bright = over ? OVERDRIVE_BRIGHT : sec.laser ? LASER_BRIGHT : 1;
    duckAt(m, when, beatSec);
    if (n >= m.padUntil) { // a bar line, or the song starting again partway through a bar: the chord to its end
        var rest = BEATS_PER_BAR - n % BEATS_PER_BAR;
        playPad(c, m, when, voiced(song.key, chord, PAD_LOW), rest * beatSec, bright);
        m.padUntil = n + rest;
    }
    var root = bassRoots(song.key, line)[at];
    lineNotes(song.bass, 2, from, left, function (k, step, len) {
        playBass(c, m, when + k * beatSec / 2, root + step, len * beatSec / 2, bright);
    });
    var tones = voiced(song.key, chord, ARP_LOW);
    lineNotes(song.arp, 4, from, left, function (k, step, len) {
        var note = tones[step % tones.length] + 12 * Math.floor(step / tones.length);
        playArp(c, m, when + k * beatSec / 4, note, len * beatSec / 4, bright);
    });
    if (sec.laser) {
        lineNotes(song.lead, 2, from, left, function (k, step, len) {
            playLead(c, m, when + k * beatSec / 2, song.key + step, len * beatSec / 2, bright);
        });
    }
    if (n == wave.bars * BEATS_PER_BAR - 1) { // the last beat: the next one is the level cleared
        musicEnd(c, m, song, when + beatSec);
    }
}

function lineNotes(line, per, from, left, play) { // the notes a part's line starts in this beat, `from` beats into its
    // section with `left` to go, at `per` steps a beat: play(k, step, len) for each, k the step within the beat, step
    // the note's number, and len its length in steps, held through the "-"s after it to the section's end at most
    if (!line) {
        return;
    }
    var s = words(line);
    for (var k = 0; k < per; k++) {
        var i = from * per + k;
        var w = s[i % s.length];
        if (w == "-" || w == ".") {
            continue;
        }
        var len = 1;
        while (len < left * per - k && s[(i + len) % s.length] == "-") {
            len++;
        }
        play(k, Number(w), len);
    }
}

function musicEnd(c, m, song, when) { // the level cleared: the key's own chord, the bass under it and the lead over,
    // left to ring
    playPad(c, m, when, voiced(song.key, "i", PAD_LOW), 0.1, 1, END_RING);
    playBass(c, m, when, register(song.key, BASS_LOW), 0.1, 1, END_RING);
    if (song.lead) {
        playLead(c, m, when, song.key + 12, 0.1, 1, END_RING);
    }
}

function musicBus(c, beatSec) { // where a song's notes go, made as it starts or starts again: every part into duck,
    // which dips on each kick, and the arpeggio and the lead into the echo too; out is what musicStop fades
    var out = c.createGain();
    out.gain.value = MUSIC_VOLUME;
    out.connect(c.destination);
    var duck = c.createGain();
    duck.connect(out);
    var echo = c.createDelay(1);
    echo.delayTime.value = ECHO_BEATS * beatSec;
    var tone = lowpass(c, 2400, 0.7); // each repeat duller than the last
    var feedback = c.createGain();
    feedback.gain.value = ECHO_FEEDBACK;
    var wet = c.createGain();
    wet.gain.value = ECHO_LEVEL;
    echo.connect(tone);
    tone.connect(feedback);
    feedback.connect(echo);
    tone.connect(wet);
    wet.connect(duck);
    return { out: out, duck: duck, echo: echo, padUntil: -1 };
}

function musicStop(fade) { // the song stops where it stands, going over `fade` seconds; a beat handed to musicBeat
    // after this starts it again
    if (!music) {
        return;
    }
    var m = music;
    music = null;
    var now = m.out.context.currentTime;
    m.out.gain.setValueAtTime(MUSIC_VOLUME, now);
    m.out.gain.linearRampToValueAtTime(0, now + fade);
    setTimeout(function () { // then let it go: notes still due sound into nothing, and the echo's loop is broken
        m.out.disconnect();
        m.echo.disconnect();
    }, 1000 * fade + 200);
}

function duckAt(m, when, beatSec) { // a kick at `when`: the song dips under it and swells back over the beat
    var d = m.duck.gain;
    d.setValueAtTime(1, when);
    d.linearRampToValueAtTime(MUSIC_DUCK, when + 0.01);
    d.linearRampToValueAtTime(1, when + 0.6 * beatSec);
}

function osc(c, type, note, cents, from, to) { // an oscillator on a MIDI note, `cents` off it, sounding from `from`
    // to `to`
    var o = c.createOscillator();
    o.type = type;
    o.frequency.value = midiHz(note);
    o.detune.value = cents;
    o.start(from);
    o.stop(to);
    return o;
}

function lowpass(c, cutoff, q) {
    var f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    f.Q.value = q;
    return f;
}

function noteGain(c, when, peak, attack, off, release) { // a note's loudness: up to peak over attack from `when`,
    // held until `off`, then gone over release
    var g = c.createGain();
    var letGo = Math.max(off, when + attack);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.setValueAtTime(peak, letGo);
    g.gain.exponentialRampToValueAtTime(0.0001, letGo + release);
    return g;
}

function playBass(c, m, when, note, len, bright, ring) { // two saws a few cents apart, through a resonant low-pass
    // that snaps shut on every note: the snap is what drives it. ring: a release of its own, for the last chord
    var v = VOICES.bass;
    var release = ring || v.release;
    var off = when + Math.max(0.01, len - v.release);
    var f = lowpass(c, v.cutoff * bright, 6);
    f.frequency.setValueAtTime(v.cutoff * bright * 4, when);
    f.frequency.exponentialRampToValueAtTime(v.cutoff * bright, when + 0.15);
    [-6, 6].forEach(function (cents) {
        osc(c, "sawtooth", note, cents, when, off + release + 0.02).connect(f);
    });
    var g = noteGain(c, when, v.level, 0.004, off, release);
    f.connect(g);
    g.connect(m.duck);
}

function playPad(c, m, when, notes, len, bright, ring) { // the chord on saws, two a note drifting against each
    // other: it swells in, and fades under the next
    var v = VOICES.pad;
    var release = ring || v.release;
    var off = when + len;
    var f = lowpass(c, v.cutoff * bright, 0.7);
    notes.forEach(function (note) {
        osc(c, "sawtooth", note, -v.spread, when, off + release + 0.02).connect(f);
        osc(c, "sawtooth", note, v.spread, when, off + release + 0.02).connect(f);
    });
    var g = noteGain(c, when, v.level, Math.min(v.attack, len / 2), off, release);
    f.connect(g);
    g.connect(m.duck);
}

function playArp(c, m, when, note, len, bright) { // a square, plucked: its filter opens at the start and closes
    var v = VOICES.arp;
    var release = Math.max(v.release, len);
    var f = lowpass(c, v.cutoff * bright, 3);
    f.frequency.setValueAtTime(v.cutoff * bright * 3, when);
    f.frequency.exponentialRampToValueAtTime(v.cutoff * bright, when + 0.08);
    osc(c, "square", note, 0, when, when + release + 0.02).connect(f);
    var g = noteGain(c, when, v.level, 0.003, when, release);
    f.connect(g);
    g.connect(m.duck);
    g.connect(m.echo);
}

function playLead(c, m, when, note, len, bright, ring) { // a saw and a square a few cents apart, with a vibrato that
    // comes in as the note holds
    var v = VOICES.lead;
    var release = ring || v.release;
    var off = when + Math.max(0.02, len - 0.02);
    var end = off + release + 0.02;
    var f = lowpass(c, v.cutoff * bright, 2);
    var lfo = c.createOscillator();
    lfo.frequency.value = v.vibratoHz;
    var depth = c.createGain();
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(v.vibrato, when + 0.4);
    lfo.connect(depth);
    lfo.start(when);
    lfo.stop(end);
    [["sawtooth", -5], ["square", 5]].forEach(function (w) {
        var o = osc(c, w[0], note, w[1], when, end);
        depth.connect(o.detune);
        o.connect(f);
    });
    var g = noteGain(c, when, v.level, 0.01, off, release);
    f.connect(g);
    g.connect(m.duck);
    g.connect(m.echo);
}
