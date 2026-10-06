// Lazer Wave -- the menu theme. The song the start screen and the menus over it play, from as the startup sequence
// rings out until a run starts: written as the acts' songs are (music.js), in A minor, the key the game opens in, and
// played by the same synths and drums. An intro, once, the pad and the arpeggio coming up out of the dark; then a verse,
// a chorus and a breakdown, round and round. OPTIONS' MUSIC sets how loud it is, down to none at all. It gives way to
// the timing test, whose beat is the point of it, and stops while the page is out of sight, and either way comes back
// at the start of the section it was in; a run ends it, and the menus after start it again from the top. index.html
// loads this with a plain <script src>, as globals rather than modules, so the game still opens straight off disk.
//
// Nothing steps the game on the menus, so it keeps its own time, as an act's intro does (musicIntro, music.js): a timer
// hands the audio clock the beats coming up within THEME_AHEAD.

// The song. Its sections play in order, the intro once and then the rest round and round (THEME_LOOP): each a run of
// bars with a chord a bar (CHORDS, music.js), and lines for its parts written as SONGS' are, played from the section's
// start: the bass and the lead in eighths, the bass's steps from its chord's root and the lead's from the key; the
// arpeggio in sixteenths, as which of its chord's notes. A part a section has no line for rests through it. bright: how
// far its filters are open, 1 as a level's wave bars are (two figures: opening from the first to the second across
// it); drums: "beat" (the kick on every beat, the snare on two and four, a hat on the off-beat, a fill every fourth
// bar), "drive" (that, with sixteenths on the hats), or "build" (nothing until its last bar, where the kick comes back
// under a snare roll), and none without; fill: a fill on its last beat, drums or none
const THEME = { key: 69, bpm: 100, waves: ["sawtooth", "triangle"], sections: [
    { name: "intro", bars: 4, chords: "i VI III VII", bright: [0.45, 1], fill: true, // Am F C G
        arp: "0 . 1 . 2 . 3 . 2 . 1 . 2 . 3 ." },
    { name: "verse", bars: 8, chords: "i VI III VII i VI iv V", drums: "beat", // Am F C G Am F Dm E
        bass: "0 12 0 12 0 12 0 12",
        arp: "0 1 2 3 2 1 2 3",
        lead: "12 - - 10 7 - 3 - 5 - - 3 0 - 3 - 7 - - 5 3 - 7 - 10 - - - 5 - - - "
            + "12 - - 10 7 - 3 - 5 - - 3 0 - 3 - 5 - - 3 5 - 8 - 7 - - - 11 - - -" },
    { name: "chorus", bars: 8, chords: "VI VII i i VI VII V V", drums: "drive", bright: 1.4, // F G Am Am F G E E
        bass: "0 0 12 0 0 12 0 12",
        arp: "0 2 4 2 1 3 5 3",
        lead: "12 - - - 15 - - - 14 - - - 17 - 14 - 12 - - - - - - - 7 - 10 - 12 - 15 - "
            + "17 - - - 15 - 12 - 14 - - - 19 - 17 - 14 - - - 11 - - - 7 - 11 - 14 - 19 -" },
    { name: "break", bars: 4, chords: "i VI III VII", drums: "build", bright: 0.7, // Am F C G
        bass: "0 - - - - - - -",
        arp: "0 . 1 . 2 . 3 . 4 . 3 . 2 . 1 ." },
] };
var THEME_LOOP = 1; // the section it goes round from: the intro plays once
var THEME_KIT = { kick: [150, 45, 0.24], snare: [1500, 0.16], clap: true, hat: 7500 }; // its drums (DRUM_KITS' shape,
                                                                                        // audio.js)
var THEME_LEVEL = 0.85; // how loud it is against a level's song (musicGain, music.js): under the menus, not over them
var THEME_DRUMS = 0.9; // its drums against its synths: in a level they are the beat, here they are the band's
var THEME_ARP = 0.6; // its arpeggio, set back under the lead
var THEME_DUCK = 0.7; // what it dips to under each kick: a gentler pump than a level's (MUSIC_DUCK)
var THEME_AHEAD = 0.3; // s of it handed to the audio clock ahead, so a timer held back a little leaves no gap
var THEME_TICK = 50; // ms between the hand-overs
var THEME_AFTER_STARTUP = 1.6; // s from the startup sequence's start to the theme's first beat: its pad swells in under
                               // the sequence's chord as that rings (STARTUP_HIT, audio.js)
var THEME_CUT = 0.3; // s it takes to go when it gives way: to the timing test, the page hidden, MUSIC off
var THEME_GO = 0.8; // and when a run starts, under the act's story and the act's own theme

var theme = null; // playing: { bus, beatSec, start (the audio time of its first beat), from (the beat that is),
                  // next (beats handed over since), timer }
var themePlace = 0; // the beat it plays from when it next starts: 0, or the start of the section it gave way in
var themeOn = false; // the page is up and the startup sequence started or waiting for its press (themeBegin)

function themeBegin() { // the page is up (onLoad, loop.js): from now the theme plays whenever it is wanted
    themeOn = true;
    themeSync();
}

function themeWanted() { // the start screen or a menu over it, but not the timing test; MUSIC on; the page in sight
    return themeOn && !gameStart && menuScreen != "calibrate" && musicLevel > 0 && !document.hidden;
}

function themeSync() { // start it or stop it, as themeWanted says. Called wherever that may have changed: a menu opening
    // or closing, a run ending, MUSIC, the page hidden or shown, and the audio starting to run, at the first press the
    // browser lets it or after the browser stopped it (beatAudio, audio.js)
    if (!themeWanted()) {
        themeStop(true, THEME_CUT);
        return;
    }
    var c = beatAudio(); // woken if it is asleep, and if it can't be yet, this is called again when it runs
    if (!theme && c && c.state == "running") {
        themeStart(c);
    }
}

function themeStart(c) { // from themePlace, as soon as it can begin: at once, or as the startup sequence rings
    var beatSec = 60 / THEME.bpm, soon = c.currentTime + 0.1;
    theme = { bus: themeBus(c, beatSec), beatSec: beatSec, from: themePlace, next: 0, timer: 0,
        start: startupAt === null ? soon : Math.max(soon, startupAt + THEME_AFTER_STARTUP) };
    theme.timer = setInterval(themeTick, THEME_TICK);
    themeTick();
}

function themeStop(keep, fade) { // it goes, over `fade` seconds; keep: to come back at the start of the section it was
    // in, else from the top
    if (theme) {
        clearInterval(theme.timer);
        var played = Math.floor((theme.bus.out.context.currentTime - theme.start) / theme.beatSec);
        var at = theme.from + Math.max(0, played);
        themePlace = at - themeAt(at).beat;
        fadeBus(theme.bus, fade, themeGain());
        theme = null;
    }
    if (!keep) {
        themePlace = 0;
    }
}

function themeGain() { // its loudness, as the MUSIC setting has it
    return musicGain() * THEME_LEVEL;
}

function themeLevel() { // MUSIC changed (setMusicLevel, music.js): the theme at the new level, gone at OFF, back after
    if (theme) {
        theme.bus.out.gain.setValueAtTime(themeGain(), theme.bus.out.context.currentTime);
    }
    themeSync();
}

function themeTick() { // hand the audio clock the beats coming up
    var c = beatAudio();
    if (!theme || !c || c.state != "running") {
        return;
    }
    var now = c.currentTime;
    theme.next = Math.max(theme.next, Math.ceil((now - theme.start) / theme.beatSec)); // beats whose moment went by
    // while the timer was held back are let go, not played all at once
    while (theme.start + theme.next * theme.beatSec < now + THEME_AHEAD) {
        themeBeat(c, theme.bus, theme.from + theme.next, theme.start + theme.next * theme.beatSec, theme.beatSec);
        theme.next++;
    }
}

function themeBus(c, beatSec) { // where its notes go: a song's (musicBus, music.js) at the theme's level, its drums into
    // it beside the duck (they drive the pump, so they don't ride it), and its arpeggio set back
    var m = musicBus(c, beatSec);
    m.out.gain.value = themeGain();
    m.drums = c.createGain();
    m.drums.gain.value = THEME_DRUMS;
    m.drums.connect(m.out);
    var arp = c.createGain();
    arp.gain.value = THEME_ARP;
    arp.connect(m.arpPan || m.duck);
    m.arpPan = arp;
    return m;
}

function themeAt(n) { // the section beat n of the theme falls in, and the beat it is in that section
    var s = THEME.sections, first = 0, loop = 0, i;
    for (i = 0; i < s.length; i++) {
        if (i < THEME_LOOP) {
            first += s[i].bars * BEATS_PER_BAR;
        } else {
            loop += s[i].bars * BEATS_PER_BAR;
        }
    }
    var beat = n < first ? n : first + (n - first) % loop; // past the intro, round and round
    for (i = 0; beat >= s[i].bars * BEATS_PER_BAR; i++) {
        beat -= s[i].bars * BEATS_PER_BAR;
    }
    return { sec: s[i], beat: beat };
}

function themeBeat(c, m, n, when, beatSec) { // the theme's beat n falls at `when`: play it, to the next. c and m, the
    // context and the bus, are handed in, so it can be rendered offline as well as played
    var at = themeAt(n), sec = at.sec, beat = at.beat;
    var bar = Math.floor(beat / BEATS_PER_BAR), left = sec.bars * BEATS_PER_BAR - beat; // beats left in the section,
    var chords = words(sec.chords), chord = chords[bar % chords.length], key = THEME.key; // which no note outlasts
    var bright = Array.isArray(sec.bright) ? sec.bright[0] + (sec.bright[1] - sec.bright[0]) * beat / (sec.bars * BEATS_PER_BAR)
        : sec.bright || 1;
    if (n >= m.padUntil) { // a bar line, or the theme starting partway through one: the chord to the bar's end
        var rest = BEATS_PER_BAR - beat % BEATS_PER_BAR;
        playPad(c, m, when, voiced(key, chord, PAD_LOW), rest * beatSec, bright);
        m.padUntil = n + rest;
    }
    var root = bassRoots(key, sec.chords)[bar % chords.length];
    lineNotes(sec.bass, 2, beat, left, function (k, step, len) {
        playBass(c, m, when + k * beatSec / 2, root + step, len * beatSec / 2, bright);
    });
    var tones = voiced(key, chord, ARP_LOW);
    lineNotes(sec.arp, 4, beat, left, function (k, step, len) {
        var note = tones[step % tones.length] + 12 * Math.floor(step / tones.length);
        playArp(c, m, when + k * beatSec / 4, note, len * beatSec / 4, bright, k == 0);
    });
    lineNotes(sec.lead, 2, beat, left, function (k, step, len) {
        playLead(c, m, THEME.waves, when + k * beatSec / 2, key + step, len * beatSec / 2, bright);
    });
    themeDrums(c, m, sec, beat, when, beatSec);
}

function themeDrums(c, m, sec, beat, when, beatSec) { // the section's drums on its beat `beat`, falling at `when`, as a
    // level's are (scheduleBeats, loop.js), on the theme's kit and into its bus
    var via = { c: c, out: m.drums, kit: THEME_KIT }, delay = when - c.currentTime;
    var bar = Math.floor(beat / BEATS_PER_BAR), inBar = beat % BEATS_PER_BAR, lastBar = bar == sec.bars - 1;
    var band = sec.drums == "beat" || sec.drums == "drive", build = sec.drums == "build" && lastBar;
    if (band || build) { // the kick, and the song dipping under it
        synthKick(delay, inBar == 0, via);
        duckAt(m, when, beatSec, THEME_DUCK);
    }
    if (band) {
        if (beat == 0) { // a section coming in: an open hat on its first beat, for a crash
            synthHat(delay, true, false, via);
        }
        if (inBar % 2 == 1) { // the backbeat
            synthSnare(delay, false, via);
        }
        synthHat(delay + beatSec / 2, inBar == BEATS_PER_BAR - 1, false, via); // the off-beat, the bar's last one open
        if (sec.drums == "drive") { // and the chorus drives on in sixteenths
            synthHat(delay + beatSec / 4, false, true, via);
            synthHat(delay + 3 * beatSec / 4, false, true, via);
        }
    }
    if (build) { // the roll back in: eighths through the bar's first half, sixteenths through its second
        var per = inBar < 2 ? 2 : 4;
        for (var q = 0; q < per; q++) {
            synthSnare(delay + q * beatSec / per, q > 0 || inBar < 2, via);
        }
    }
    if (inBar == BEATS_PER_BAR - 1 && (band && bar % 4 == 3 || sec.fill && lastBar)) { // a fill into what comes next:
        for (var f = 1; f < 4; f++) { // three soft strokes through the beat
            synthSnare(delay + f * beatSec / 4, true, via);
        }
    }
}
