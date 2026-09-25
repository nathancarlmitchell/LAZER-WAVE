// Lazer Wave -- the playlist and the sound effects. The tracks, each playing the next; the song clock a rhythm game
// times itself against; the sound effects at their levels; and the one volume and one rate that drive every track at
// once. index.html loads this with a plain <script src>, as globals rather than modules, so the game still opens
// straight off disk. The elements are made here, at load, and only start loading when something plays them.

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

const all_songs = TRACKS.map(function (t) { return audioFile(t.src); });
var songIndex = 0; // the track playing, or last played

const aud_bomb = audioFile("music/BOMB_SIREN-BOMB_SIREN-247265934.wav", 0.3);
const aud_menuSound = audioFile("music/Menu Sounds_2.wav", 0.2);
const aud_death = audioFile("music/Fx 14.wav", 0.15);
const aud_danger = audioFile("music/72.wav", 0.05);
const aud_powerUp = audioFile("music/powerUp.wav", 0.1);
const aud_pickupCoin = audioFile("music/pickupCoin.wav", 0.1);
const aud_click = audioFile("music/click.wav", 0.1);
const aud_startup = audioFile("music/Fx 11.wav");
const ALL_SFX = [aud_bomb, aud_menuSound, aud_death, aud_danger, aud_powerUp, aud_pickupCoin, aud_click]; // unlocked
                                                                                    // together on a touch start
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

function playSound(audio) { // play, ignoring failures such as blocked autoplay or a missing file
    var playing = audio.play();
    if (playing) { // older browsers (Chrome < 50, Firefox < 53) return nothing
        playing.catch(function () {});
    }
}

// The song clock. A rhythm game has to time itself against the music, not against the step count: the step loop is
// steady, but a track can start late, stall buffering, or be played at another rate. The element's currentTime is the
// truth; songBeat turns it into beats for a track that has a bpm, or returns null for one that doesn't.
function songTime() { // seconds into the current track
    return all_songs.length ? all_songs[songIndex].currentTime : 0;
}

function songBeat() { // beats into the current track (fractional), or null if its tempo is unknown
    var t = TRACKS[songIndex];
    return t && t.bpm ? (songTime() - t.offset) * t.bpm / 60 : null;
}

var musicRate = 1; // the rate the songs are at, so putting it back to what it already is touches none of them

function setMusicRate(rate) { // playback rate for all songs
    if (rate == musicRate) {
        return;
    }
    musicRate = rate;
    all_songs.forEach(function (song) { song.playbackRate = rate; });
}

function setMusicVolume(volume) { // volume for all songs
    all_songs.forEach(function (song) { song.volume = volume; });
}

var musicHeld = false; // the pause stopped the song, so resuming should start it again

function pauseMusic() { // the pause: a rhythm game's clock is the song, so it stops when the game does
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

// The beat track. Until the levels have songs with known tempos, each level plays a synthesized kick and hat at its own
// bpm. It is scheduled on the Web Audio clock a few steps ahead (see scheduleBeats in loop.js), so a beat sounds at the
// moment the game judges it rather than whenever the step that crossed it happened to run.
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
            d[i] = Math.random() * 2 - 1; // audio only: never touches what the game spawns
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

function synthZap(delay) { // a beam firing: a sawtooth diving down
    var c = beatAudio();
    if (!c) {
        return;
    }
    var when = c.currentTime + delay;
    var o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(1400, when);
    o.frequency.exponentialRampToValueAtTime(120, when + 0.16);
    o.connect(envelope(c, when, 0.07, 0.18));
    o.start(when);
    o.stop(when + 0.2);
}
