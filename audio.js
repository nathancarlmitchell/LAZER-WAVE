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
const aud_powerUp = sfxFile("music/powerUp.wav", 0.1);
const aud_pickupCoin = sfxFile("music/pickupCoin.wav", 0.1);
const aud_click = sfxFile("music/click.wav", 0.1);
const aud_startup = sfxFile("music/Fx 11.wav");
// The sound effects a touch start unlocks together, which fetches every one of them: so only the sounds the game plays
const ALL_SFX = [aud_menuSound, aud_death, aud_danger, aud_powerUp, aud_pickupCoin, aud_click];
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
var BEAT_VOLUME = 0.6;
var noiseBuffer = null; // a quarter second of white noise, made once, for the hats

function beatAudio() { // the audio context, made on first use and woken if the browser put it to sleep
    if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) {
            return null;
        }
        try {
            audioCtx = new Ctx();
        } catch (e) {
            return null;
        }
    }
    if (audioCtx.state == "suspended") {
        audioCtx.resume().catch(function () {});
    }
    return audioCtx;
}

function audioLatencyMs() { // how long after it is scheduled a sound actually leaves the speakers
    return audioCtx ? 1000 * ((audioCtx.baseLatency || 0) + (audioCtx.outputLatency || 0)) : 0;
}

function envelope(c, when, peak, decay) { // a gain node that hits peak at `when` and dies away over `decay` seconds
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak * BEAT_VOLUME, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    g.connect(c.destination);
    return g;
}

function synthKick(delay, accent) { // a pitch-dropping sine: the beat
    var c = beatAudio();
    if (!c) {
        return;
    }
    var when = c.currentTime + delay;
    var o = c.createOscillator();
    o.frequency.setValueAtTime(accent ? 170 : 140, when);
    o.frequency.exponentialRampToValueAtTime(40, when + 0.14);
    o.connect(envelope(c, when, accent ? 0.9 : 0.65, 0.2));
    o.start(when);
    o.stop(when + 0.22);
}

function synthHat(delay) { // a tick of high-passed noise: the off-beat
    var c = beatAudio();
    if (!c) {
        return;
    }
    if (!noiseBuffer) {
        noiseBuffer = c.createBuffer(1, Math.floor(c.sampleRate / 4), c.sampleRate);
        var d = noiseBuffer.getChannelData(0);
        for (var i = 0; i < d.length; i++) {
            d[i] = Math.random() * 2 - 1; // audio only: the hats' noise, and nothing else comes from it
        }
    }
    var when = c.currentTime + delay;
    var n = c.createBufferSource();
    n.buffer = noiseBuffer;
    var hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    n.connect(hp);
    hp.connect(envelope(c, when, 0.18, 0.05));
    n.start(when);
    n.stop(when + 0.06);
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

function synthGate(delay) { // a gate passed: a sine sweeping up two octaves
    var c = beatAudio();
    if (!c || sfxLevel <= 0) {
        return;
    }
    var when = c.currentTime + delay;
    var o = c.createOscillator();
    o.frequency.setValueAtTime(220, when);
    o.frequency.exponentialRampToValueAtTime(880, when + 0.25);
    o.connect(envelope(c, when, 0.35 * sfxLevel, 0.35));
    o.start(when);
    o.stop(when + 0.4);
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
