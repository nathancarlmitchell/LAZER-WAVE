// Lazer Wave -- the playlist and the sound effects. The tracks, each playing the next; the track clock a rhythm game
// times itself against; the sound effects at their levels, all scaled by OPTIONS' SOUND FX (sfxLevel); and the one
// volume and one rate that drive every track at once. The beat track (the kick, the hat and the count-in) is not a
// sound effect: it is what the player plays to, so no setting takes it away. index.html loads this with a plain
// <script src>, as globals rather than modules, so the game still opens straight off disk. The elements are made here,
// at load, and only start loading when something plays them.

// The playlist. bpm and offset (seconds from the start of the file to the first beat) are what the song clock needs
// to turn a track's time into beats; a track without a bpm still plays, it just has no beat to sync to.
// Empty until Lazer Wave has music of its own; an entry looks like
//     { src: "music/track.mp3", bpm: 120, offset: 0.05 },
const TRACKS = [];

function audioFile(src, volume) { // an audio element for a file, optionally at a volume. preload none: music is
    var a = new Audio(); // large, and nothing should be fetched before the first click wants it
    a.preload = "none";
    a.src = src;
    if (volume !== undefined) {
        a.volume = volume;
    }
    return a;
}

function sfxFile(src, volume) { // a sound effect's element, which remembers its own volume for playSound to scale
    var a = audioFile(src, volume);
    a.sfxVolume = volume === undefined ? 1 : volume;
    return a;
}

const all_songs = TRACKS.map(function (t) { return audioFile(t.src); });
var songIndex = 0; // the track playing, or last played
var sfxLevel = 1; // the SOUND FX setting (OPTIONS): the share of its own volume each sound effect plays at; 0 is none

const aud_menuSound = sfxFile("music/Menu Sounds_2.wav", 0.2);
const aud_death = sfxFile("music/Fx 14.wav", 0.15);
const aud_danger = sfxFile("music/72.wav", 0.05);
const aud_click = sfxFile("music/click.wav", 0.1);
// The sound effects a touch start unlocks together, which fetches every one of them: so only the sounds the game plays
const ALL_SFX = [aud_menuSound, aud_death, aud_danger, aud_click]; // the rest are synthesized (sfx.js)
var musicVolume = 0.2;

function loadAudio() { // on the first click, which is the one the browser lets sound start in. The levels bring
    // their own beat (below), so the album is set up but not started: TRACKS is for when real songs have tempos
    setMusicVolume(musicVolume);
    all_songs.forEach(function (song, i) {
        song.onended = function () { playSong((i + 1) % all_songs.length); };
    });
    beatAudio(); // made in the click, so the browser lets it play
}

function playSong(i) {
    if (!all_songs[i]) {
        return; // no tracks
    }
    songIndex = i;
    playSound(all_songs[i]);
}

function playSound(audio) { // play, ignoring failures such as blocked autoplay or a missing file. A sound effect plays
    // at the SOUND FX setting's share of its own volume, and not at all when that is off
    if (audio.sfxVolume !== undefined) {
        if (sfxLevel <= 0) {
            return;
        }
        audio.volume = audio.sfxVolume * sfxLevel;
    }
    var playing = audio.play();
    if (playing) { // older browsers (Chrome < 50, Firefox < 53) return nothing
        playing.catch(function () {});
    }
}

// The track clock. A rhythm game has to time itself against the music, not against the step count: the step loop is
// steady, but a track can start late, stall buffering, or be played at another rate. The element's currentTime is the
// truth; trackBeat turns it into beats for a track that has a bpm, or returns null for one that doesn't. It is named
// for the track because songBeat is the synth's (music.js): the scripts share one global namespace, and the later
// script's function silently replaces the earlier one's.
function trackTime() { // seconds into the current track
    return all_songs.length ? all_songs[songIndex].currentTime : 0;
}

function trackBeat() { // beats into the current track (fractional), or null if its tempo is unknown
    var t = TRACKS[songIndex];
    return t && t.bpm ? (trackTime() - t.offset) * t.bpm / 60 : null;
}

var musicRate = 1; // the rate the songs are at, so putting it back to what it already is touches none of them

function setMusicRate(rate) { // playback rate for all songs
    if (rate == musicRate) {
        return;
    }
    musicRate = rate;
    all_songs.forEach(function (song) { song.playbackRate = rate; });
}

function setMusicVolume(volume) { // volume for all songs, as the MUSIC setting scales it (musicLevel, music.js)
    all_songs.forEach(function (song) { song.volume = volume * musicLevel; });
}

var musicHeld = false; // the pause stopped the song, so resuming should start it again

function pauseMusic() { // the pause: a rhythm game's clock is the song, so it stops when the game does
    musicStop(MUSIC_CUT); // the levels' own songs (music.js): the first beat after the pause starts theirs again
    var song = all_songs[songIndex];
    if (song && !song.paused) {
        song.pause();
        musicHeld = true;
    }
}

function resumeMusic() {
    if (musicHeld) {
        musicHeld = false;
        playSound(all_songs[songIndex]);
    }
}

// The beat track. Until the levels have recorded songs with known tempos, each level plays a synthesized kick and hat
// at its own bpm, and a synth song over them (music.js). It is scheduled on the Web Audio clock a few steps ahead (see
// scheduleBeats in loop.js), so a beat sounds at the moment the game judges it rather than whenever the step that
// crossed it happened to run.
var audioCtx = null;
var audioRunningAt = 0; // performance.now() when the audio last started running, for its delay's estimate to settle
var LATENCY_SETTLE_MS = 400; // how long that takes: Chrome reports no delay at all the moment the audio starts or
                             // resumes, and the true one a tenth of a second or so later -- not always the one it had
                             // before a pause or a hidden tab
var BEAT_VOLUME = 0.6;
var noiseBuffer = null; // a quarter second of white noise, made once, for the hats
// Audio a browser has stopped and won't start again is made afresh, as reloading the page would make it (audioRemake):
// Chrome and Edge hold it "interrupted" while something else has the sound, refuse to wake it, and can leave it so
// after, with the sound effects that play from files still heard and the song and the drums not
var AUDIO_STUCK_MS = 1500; // how long it may stay asleep after the page tried to wake it (a press, or coming back to
                           // the page), or its clock stand still while it says it runs, before it is given up on
var AUDIO_RETRY_MS = 4000; // the least time between two fresh starts, so audio held for good isn't remade on end
var AUDIO_STALL = 0.25; // a clock running at less than this share of the page's time is standing still
var audioAsleepSince = 0; // performance.now() when the page first tried to wake it, while it stays asleep; else 0
var audioRemadeAt = -Infinity; // when it was last made afresh
var audioClockAt = 0, audioClockTime = 0; // its clock as last watched: the page's time then, and its own
var audioPressed = false; // the page has had a press (where the browser can't say: navigator.userActivation)
var audioWatchTimer = null;

// Each act's drum kit, indexed as ACTS is (story.js): kick, the pitch its sine drops from and to and its decay; snare,
// the band its noise is in and its decay; clap, whether a clap doubles the snare; hat, the edge its noise is cut at.
// The kits harden as the acts climb, from a deep, soft kit in the infrared to a tight, bright one in the ultraviolet
const DRUM_KITS = [null,
    { kick: [140, 40, 0.22], snare: [1200, 0.14], clap: false, hat: 8000 },
    { kick: [160, 45, 0.2], snare: [1800, 0.16], clap: false, hat: 7000 },
    { kick: [170, 50, 0.18], snare: [2200, 0.18], clap: true, hat: 6500 },
    { kick: [180, 50, 0.17], snare: [2500, 0.18], clap: true, hat: 6000 },
    { kick: [190, 55, 0.16], snare: [2800, 0.2], clap: true, hat: 5500 },
];

function drumKit() { // the kit of the level playing, or Act I's on the screens that have no level up
    return (typeof wave != "undefined" && wave && DRUM_KITS[levelAct(level)]) || DRUM_KITS[1];
}

function beatAudio() { // the audio context, made on first use and woken if it is asleep: "suspended", until the page
    // has had a press or after the browser stopped it, or "interrupted", the browser holding it while the page is put
    // away or something else has the sound. A browser can refuse to wake it: it wakes by itself when the interruption
    // ends, or at the next press (wakeAudio), or it is made afresh (audioRemake)
    if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
            return null;
        }
        var made;
        try {
            made = new Ctx();
        } catch (e) {
            return null;
        }
        audioCtx = made;
        audioRunningAt = performance.now();
        made.onstatechange = function () { // started, or woken however it was: its delay's estimate starts over, and
            // the menu theme, if it is wanted, starts again (theme.js), after whatever waited on the waking itself (the
            // startup sequence, which the theme comes in under)
            if (made.state == "running") {
                audioRunningAt = performance.now();
                audioAsleepSince = 0;
                setTimeout(themeSync, 0);
            }
        };
        if (audioWatchTimer === null) {
            audioWatchTimer = setInterval(audioWatch, 1000);
        }
    }
    if (audioCtx.state == "suspended" || audioCtx.state == "interrupted") {
        audioCtx.resume().catch(function () {});
    }
    return audioCtx;
}

function wakeAudio() { // a press of a kind a browser lets sound start from (STARTUP_PRESSES): the audio woken in it if
    // it is asleep, as some browsers only let it start again in a press, or made afresh in it if it has stayed asleep
    // since the page last tried
    audioPressed = true;
    if (!audioCtx || audioCtx.state == "running") {
        return;
    }
    if (audioStuck()) {
        audioRemake();
    } else {
        audioTried();
        beatAudio();
    }
}

function audioTried() { // the page has tried to wake the audio: the time it has to wake starts, if it hasn't. Not before
    // the page has had a press, until which no browser lets it run
    var pressed = navigator.userActivation ? navigator.userActivation.hasBeenActive : audioPressed;
    if (pressed && !audioAsleepSince && audioCtx && audioCtx.state != "running") {
        audioAsleepSince = performance.now();
    }
}

function audioStuck() { // has the audio stayed asleep AUDIO_STUCK_MS since the page tried to wake it, and not been made
    // afresh lately
    var now = performance.now();
    return audioAsleepSince > 0 && now - audioAsleepSince >= AUDIO_STUCK_MS && now - audioRemadeAt >= AUDIO_RETRY_MS;
}

function audioWatch() { // every second, while the page is in sight: audio that stayed asleep after the page tried to wake
    // it is made afresh, and so is audio that says it runs while its clock stands still
    if (!audioCtx || document.hidden) {
        audioClockAt = 0;
        return;
    }
    var now = performance.now();
    if (audioCtx.state != "running") {
        audioClockAt = 0;
        if (audioStuck()) {
            audioRemake();
        }
        return;
    }
    var real = now - audioClockAt, moved = 1000 * (audioCtx.currentTime - audioClockTime);
    if (audioClockAt && real >= AUDIO_STUCK_MS && moved < AUDIO_STALL * real && now - audioRemadeAt >= AUDIO_RETRY_MS) {
        audioRemake();
        return;
    }
    if (!audioClockAt || real >= AUDIO_STUCK_MS) {
        audioClockAt = now;
        audioClockTime = audioCtx.currentTime;
    }
}

function audioRemake() { // the audio given up on: closed, and made afresh, as reloading the page would make it. What
    // played on the old goes with it, to start again on the new: a level's song with its next beat (music.js), the menu
    // theme where its section began once the new one runs (theme.js), an act's theme where it was (introTick)
    var old = audioCtx, state = old.state;
    audioRemadeAt = performance.now();
    audioAsleepSince = 0;
    audioClockAt = 0;
    musicStop(0);
    themeStop(true, 0);
    startupGain = null; // the startup sequence, if it was still ringing, and its moment, which the theme comes in by
    startupAt = null;
    audioCtx = null;
    old.onstatechange = null;
    old.close().catch(function () {});
    // said in the console, as nothing else in the game is: a browser holding the sound is what to look for if it stays
    console.info("Lazer Wave: the audio was " + state + " and wouldn't start again, so it was made afresh");
    beatAudio(); // the new one: in the press that asked for it, where there was one
    audioTried(); // given its own time to wake
}

function audioLatencyMs() { // how long after it is scheduled a sound actually leaves the speakers
    return audioCtx ? 1000 * ((audioCtx.baseLatency || 0) + (audioCtx.outputLatency || 0)) : 0;
}

function audioLatencySettled() { // can that be trusted now: the audio running, and for long enough to have settled
    return !!audioCtx && audioCtx.state == "running" && performance.now() - audioRunningAt >= LATENCY_SETTLE_MS;
}

function envelope(c, when, peak, decay, out) { // a gain node that hits peak at `when` and dies away over `decay` seconds,
    // into out (the context's own output, by default)
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak * BEAT_VOLUME, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    g.connect(out || c.destination);
    return g;
}

// The drums take `via`, given: { c, out, kit }, a context, a node and a kit (DRUM_KITS' shape) of their own to play in,
// into and on, as the menu theme's do (theme.js); without it, the game's audio, its output and the level's kit
function drumContext(via) {
    return via && via.c || beatAudio();
}

function synthKick(delay, accent, via) { // a pitch-dropping sine: the beat
    var c = drumContext(via);
    if (!c) {
        return;
    }
    var when = c.currentTime + delay, kit = via && via.kit || drumKit(), out = via && via.out;
    var o = c.createOscillator();
    o.frequency.setValueAtTime(kit.kick[0] * (accent ? 1.2 : 1), when);
    o.frequency.exponentialRampToValueAtTime(kit.kick[1], when + 0.14);
    o.connect(envelope(c, when, accent ? 0.9 : 0.65, kit.kick[2], out));
    o.start(when);
    o.stop(when + kit.kick[2] + 0.02);
}

function noiseSource(c) { // a quarter second of white noise to play, for the hats and the snare
    if (!noiseBuffer) {
        noiseBuffer = c.createBuffer(1, Math.floor(c.sampleRate / 4), c.sampleRate);
        var d = noiseBuffer.getChannelData(0);
        for (var i = 0; i < d.length; i++) {
            d[i] = Math.random() * 2 - 1; // audio only: the drums' noise, and nothing else comes from it
        }
    }
    var n = c.createBufferSource();
    n.buffer = noiseBuffer;
    return n;
}

function synthHat(delay, open, soft, via) { // a tick of high-passed noise: the off-beat; open, it hisses on a little,
    // as a hat struck open does, on the last off-beat of a bar; soft, a sixteenth between, quieter
    var c = drumContext(via);
    if (!c) {
        return;
    }
    var when = c.currentTime + delay, kit = via && via.kit || drumKit();
    var n = noiseSource(c);
    var hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = kit.hat - (open ? 2000 : 0);
    n.connect(hp);
    hp.connect(envelope(c, when, open ? 0.16 : soft ? 0.09 : 0.18, open ? 0.25 : 0.05, via && via.out));
    n.start(when);
    n.stop(when + (open ? 0.3 : 0.06));
}

function synthSnare(delay, soft, via) { // the backbeat, on a bar's second and fourth beats: a burst of band-passed
    // noise with a short tone dropping under it; soft, a stroke of the fill that runs into every fourth bar's end
    var c = drumContext(via);
    if (!c) {
        return;
    }
    var when = c.currentTime + delay, kit = via && via.kit || drumKit(), out = via && via.out;
    var n = noiseSource(c);
    var bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = kit.snare[0];
    bp.Q.value = 0.7;
    n.connect(bp);
    bp.connect(envelope(c, when, soft ? 0.22 : 0.45, soft ? 0.08 : kit.snare[1], out));
    n.start(when);
    n.stop(when + 0.25);
    if (kit.clap && !soft) { // the clap over it: a second burst, a little later and higher, as hands are
        var n2 = noiseSource(c);
        var bp2 = c.createBiquadFilter();
        bp2.type = "bandpass";
        bp2.frequency.value = kit.snare[0] * 1.4;
        bp2.Q.value = 1.2;
        n2.connect(bp2);
        bp2.connect(envelope(c, when + 0.022, 0.3, 0.12, out));
        n2.start(when + 0.022);
        n2.stop(when + 0.2);
    }
    var o = c.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(soft ? 200 : 180, when);
    o.frequency.exponentialRampToValueAtTime(120, when + 0.08);
    o.connect(envelope(c, when, soft ? 0.15 : 0.3, 0.1, out));
    o.start(when);
    o.stop(when + 0.12);
}

var CRASH_SEC = 1.6; // how long the crash takes to die away
var crashBuffer = null; // noise long enough for it to ring out, made once

function synthCrash(delay, via) { // a cymbal struck once, with the last kick as a level's song resolves (finalHit,
    // loop.js): noise high-passed lower than a hat's, a wider plate's shimmer, washing out
    var c = drumContext(via);
    if (!c) {
        return;
    }
    var when = c.currentTime + delay, kit = via && via.kit || drumKit();
    if (!crashBuffer) {
        crashBuffer = c.createBuffer(1, Math.floor(c.sampleRate * CRASH_SEC), c.sampleRate);
        var d = crashBuffer.getChannelData(0);
        for (var i = 0; i < d.length; i++) {
            d[i] = Math.random() * 2 - 1; // audio only, as the hats' noise is
        }
    }
    var n = c.createBufferSource();
    n.buffer = crashBuffer;
    var hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = kit.hat / 2;
    n.connect(hp);
    hp.connect(envelope(c, when, 0.3, CRASH_SEC, via && via.out));
    n.start(when);
    n.stop(when + CRASH_SEC);
}

function synthTick(delay, high) { // the count-in's click
    var c = beatAudio();
    if (!c) {
        return;
    }
    var when = c.currentTime + delay;
    var o = c.createOscillator();
    o.type = "square";
    o.frequency.value = high ? 1760 : 1320;
    o.connect(envelope(c, when, 0.12, 0.06));
    o.start(when);
    o.stop(when + 0.08);
}

function synthZap(delay, note) { // a beam firing: a sawtooth diving down, from an octave over the note it plays in the
    // song (a MIDI note number: zapNote, music.js), or from 1400 Hz if it plays none. A sound effect, as are the shot
    // and the gate's sweep: at the SOUND FX setting's level, and nothing when it is off
    var c = beatAudio();
    if (!c || sfxLevel <= 0) {
        return;
    }
    var when = c.currentTime + delay;
    var from = note === undefined ? 1400 : midiHz(note + 12);
    var o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(from, when);
    o.frequency.exponentialRampToValueAtTime(from / 12, when + 0.16);
    o.connect(envelope(c, when, 0.07 * sfxLevel, 0.18));
    o.start(when);
    o.stop(when + 0.2);
}

function synthShot(delay) { // the piece's own beam striking a target: the other way to a zap, a square leaping up
    var c = beatAudio();
    if (!c || sfxLevel <= 0) {
        return;
    }
    var when = c.currentTime + delay;
    var o = c.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(420, when);
    o.frequency.exponentialRampToValueAtTime(1680, when + 0.07);
    o.connect(envelope(c, when, 0.06 * sfxLevel, 0.12));
    o.start(when);
    o.stop(when + 0.14);
}

function synthCharged(delay, note) { // the overdrive meter filling: three quick triangle notes climbing the key's chord,
    // tonic, fifth and octave, from the MIDI note `note` (the act's key, music.js; A if none), the last left to ring,
    // so the player hears that SPACE is loaded without looking at the meter
    var c = beatAudio();
    if (!c || sfxLevel <= 0) {
        return;
    }
    var key = note === undefined ? 69 : note;
    [0, 7, 12].forEach(function (step, i) {
        var last = i == 2;
        var when = c.currentTime + delay + i * 0.07;
        var o = c.createOscillator();
        o.type = "triangle";
        o.frequency.value = midiHz(key + 12 + step);
        o.connect(envelope(c, when, (last ? 0.16 : 0.1) * sfxLevel, last ? 0.45 : 0.14));
        o.start(when);
        o.stop(when + (last ? 0.5 : 0.16));
    });
}

// The startup sequence: the sound the game comes on with, as the title's laser comes up (titlelight.js): the game's gun
// charging and firing, the shot landing as the laser reaches the title (startupSequence, sfx.js). A browser won't let
// sound start before the page has had a click, a key or a tap: it plays at the load where one lets it, and otherwise
// at the first of those (startupArm), with the laser starting over so the two run together. A sound effect: at SOUND
// FX's level, and nothing when it is off
var STARTUP_KEY = 69; // A: Act I's key (SONGS, music.js), the key the game opens in
var STARTUP_HIT = 0.85; // s from the start to the hit: the title's laser is fully up by then (TITLE_FADE, titlelight.js)
var STARTUP_LENGTH = 2.9; // s the whole sequence lasts, the chord's hum included
var STARTUP_CUT = 0.15; // s it takes to go when a run starts under it
const STARTUP_PRESSES = ["mousedown", "keydown", "touchend"]; // the presses a browser lets sound start from
var startupPlayed = false; // it plays once a page load
var startupArmed = false; // the presses are listened for
var startupGain = null; // what it plays through, while it plays: to cut it
var startupAt = null; // the audio time it started at, once it has: the menu theme comes in as it rings (theme.js)

function startupSound() { // play the startup sequence, once: now if the browser lets sound start, or else at the
    // first press. Called at load (onLoad, loop.js), and then by the presses until it has played
    if (startupPlayed || sfxLevel <= 0) {
        return;
    }
    var c = beatAudio();
    if (!c) {
        return;
    }
    if (c.state == "running") {
        startupPlay(c);
        return;
    }
    startupArm();
    c.resume().then(function () { startupPlay(c); }).catch(function () {}); // resolves once the browser lets it
    // run: at a press, if not now
}

function startupArm() { // listen for the first press of a kind a browser lets sound start from: a key, a mouse
    // button, or a tap lifting; a controller's buttons aren't one (drawSoundNote, menu.js)
    if (startupArmed) {
        return;
    }
    startupArmed = true;
    STARTUP_PRESSES.forEach(function (type) { window.addEventListener(type, startupSound, true); });
}

function startupPlay(c) { // the sequence, from now, and the title's laser from its start with it
    if (startupPlayed) {
        return;
    }
    startupPlayed = true;
    STARTUP_PRESSES.forEach(function (type) { window.removeEventListener(type, startupSound, true); });
    startupGain = c.createGain();
    startupGain.connect(c.destination);
    startupAt = c.currentTime + 0.02;
    startupSequence(c, startupAt, sfxLevel, startupGain);
    titleLightRestart();
}

function startupStop() { // a run started under it: it goes, over STARTUP_CUT, under the level's own sounds
    if (!startupGain || !audioCtx) {
        return;
    }
    var g = startupGain.gain, now = audioCtx.currentTime;
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + STARTUP_CUT);
    startupGain = null;
}
