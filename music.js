// Lazer Wave -- the music. Every act has a song over its beat, written as MIDI notes: a key, the chords its bars go
// through, and the lines its parts play over them -- a bass, a pad, an arpeggio, and a lead that plays the act's
// melody. Web Audio synths play it on the beat track's clock: scheduleBeats (loop.js) hands each beat to musicBeat as
// it hands one to the kick, so every note lands on the grid the game judges. index.html loads this with a plain
// <script src>, as globals rather than modules, so the game still opens straight off disk. Nothing here runs at load
// beyond building the tables.
//
// A song follows its level's form. The wave bars play its chords and its melody; each laser section plays a chorus,
// a lead over chords of its own; overdrive opens every filter; the song dips under each kick and swells back, as a
// sidechained mix pumps. A pause, a death, a retry or a quit cuts it (musicStop), and the first beat after a pause
// starts it again. A cleared level resolves: the drums drop out once its last laser is done, the song plays on to the
// bar line after it, and there its lead's end, a note or two onto the key's own, lands over the key's own chord on a
// last kick and a crash, held and let ring (musicEnd); a boss brought down resolves the same way. An act's intro
// plays its theme with no beat under it (musicIntro). OPTIONS' MUSIC sets how loud all of it is (musicLevel), down to
// none at all, while the beat track plays on: the kick is the beat, and a player can play to it alone.
//
// The lasers play the song too. songTune tells the timeline (waves.js) which notes the tune starts on each beat of a
// bar, and how high each is: a phrase fires its beams on them, as high on the screen as the notes are, and a laser
// section's targets trace the chorus. A laser firing sounds the note it was placed on (zapNote).

// The chords, as their notes' semitones above the key: MIDI note numbers counted from the key's. They are named as a
// minor key's are, lower case minor and upper case major; V is the fifth's chord made major, which pulls home
const CHORDS = {
    i: [0, 3, 7], iv: [5, 8, 12], V: [7, 11, 14], III: [3, 7, 10], VI: [8, 12, 15], VII: [10, 14, 17],
};

// Each act's song, indexed as ACTS is (story.js): all five of its levels play it, each at its own tempo, and it builds
// as the act goes on (the arpeggio joins on its ARP_FROM'th level). key: the tonic, as a MIDI note number (69 is the A
// above middle C). chords: the wave bars', one a bar, from the first of each run of them, under melody, the act's tune;
// leadChords and lead: the laser sections', from the first bar of each (the wave bars' chords if a song has none).
// bass, arp, melody and lead are lines of steps, played round and round from the start of each section: the arpeggio
// in sixteenths and the rest in eighths. On a step, a number is a note -- the melody's and the lead's counted in
// semitones from the key, the bass's from its chord's root, the arpeggio's as which of its chord's notes, 0 the lowest
// and 3 that one an octave up -- "-" holds the note before, and "." rests. waves: the lead's two oscillators, which
// give each act a voice of its own. A part a song has no line for doesn't play in it. melody2 and chords2 are a second
// phrase: the wave bars play four bars of the first and four of the second, turn and turn about (songPhrase). end is
// what the lead resolves on, as the level is cleared (musicEnd): a note or two onto the key's own, counted as the
// melody's are but with their octave written in, the last held to the line's end, each written to follow on from
// where its level's melody stops. These are the act's first level's; tunes gives each of its other levels a melody, a
// melody2, a lead and an end of its own over the same chords, building toward the boss, whose bass pumps eighths
// between the act's own notes on the beats (levelSong).
// The lasers are dealt from the lines a level plays (songTune), so a new line is a new level to check (safegap.js)
const SONGS = [null,
    { key: 69, waves: ["triangle", "sawtooth"], chords: "i VI III VII", chords2: "iv VI i V", leadChords: "i VI III VII", // A minor: Am F C G
        melody: "0 - - - 3 - 7 - 8 - - - 7 - 3 - 7 - - - 10 - 12 - 10 - - - 7 - - -",
        melody2: "12 - - - 10 - 7 - 8 - 10 - 12 - - - 7 - 5 - 3 - 5 - 7 - - - 3 - 0 -",
        lead: "12 - - - 10 - 7 - 8 - - - 7 - 5 - 7 - - - 3 - 5 - 2 - - - - - . .",
        bass: "0 - - 12 0 - 12 -",
        arp: "0 . 1 . 2 . 1 .",
        end: "14 - 12 - - - - -", // Signal's: its melody falls F E C, so B, then A
        tunes: { // its other levels' own lines, by their place in the act (levelSong)
            2: { // Carrier
                melody: "7 - - - 12 - 10 7 8 - - - 7 - 5 - 3 - - - 7 - 10 12 10 - - - - - . .",
                melody2: "17 - - - 15 - 12 - 15 - - - 12 - 8 - 7 - - - 12 - 10 7 11 - - - 14 - 11 -",
                lead: "12 - 12 - 14 - 15 - 17 - 15 - 12 - - - 15 - 14 - 12 - 10 - 14 - - - - - . .",
                end: "15 - 12 - - - - -" }, // its melody falls F E D: C, then A
            3: { // Ember Line
                melody: "7 - 5 - 7 - 12 - 12 - 10 - 8 - - - 7 - 5 - 7 - 12 - 14 - 12 - 10 - - -",
                melody2: "17 - 15 - 17 - 20 - 19 - 17 - 15 - - - 12 - 10 - 12 - 15 - 14 - - - 11 - - -",
                lead: "19 - - - 17 - 15 - 17 - - - 15 - 12 - 15 - - - 14 - 12 - 14 - - - 10 - - -",
                end: "12 - - - - - - -" }, // its melody stops on G: up to A
            4: { // Heat Haze
                melody: "0 - 7 - 12 - 15 - 17 - 15 - 12 - - - 3 - 10 - 15 - 19 - 17 - - - 14 - - -",
                melody2: "5 - 12 - 17 - 20 - 19 - 17 - 12 - - - 7 - 12 - 15 - 19 - 14 - - - 11 - 7 -",
                lead: "12 - 15 - 19 - 17 - 15 - - - 12 - 8 - 10 - 15 - 19 - 15 - 14 - - - - - . .",
                end: "11 12 - - - - - -" }, // its melody stops on B: G# and A, a turn
            5: { // Red Giant, the boss
                melody: "12 - 12 - 7 10 - 12 12 - 12 - 8 10 - 12 15 - 15 - 10 12 - 15 14 - - - 10 - 14 -",
                melody2: "17 - 17 - 12 15 - 17 15 - 15 - 12 - 8 - 12 - 12 - 7 10 - 12 11 - 14 - 11 - 7 -",
                lead: "19 - 17 - 15 - 12 - 17 - 15 - 12 - 8 - 15 - 14 - 12 - 10 - 14 - - - 7 - - -",
                end: "7 - 12 - - - - -", // wherever it falls: E, then up to A
                bass: "0 0 0 12 0 0 12 12" }, // the act's notes on the beats, pumping between them
        } },
    { key: 64, waves: ["square", "sawtooth"], chords: "i VII VI VII", chords2: "VI VII i V", leadChords: "VI VII i i", // E minor: Em D C D,
        melody: "7 - 5 - 3 - 0 - 2 - - - 5 - 10 - 8 - 7 - 3 - 7 - 5 - - - 2 - - -", // and the lead's C D Em
        melody2: "10 - 12 - 10 - 7 - 8 - - - 7 - 5 - 3 - 5 - 7 - 3 - 2 - - - 0 - - -",
        lead: "12 - 10 - 7 - 3 - 2 - 5 - 10 - 14 - 15 - - - 14 - 12 - 7 - - - - - . .",
        bass: "0 12 0 12 0 12 0 12",
        arp: "0 1 2 1 0 1 2 1",
        end: "0 - - - - - - -", // Streetlight's: its melody stops on F#, so down to E
        tunes: { // its other levels' own lines, by their place in the act (levelSong)
            2: { // Amber Alert
                melody: "12 - 7 - 12 - - - 14 - 10 - 14 - - - 15 - 12 - 15 - - - 17 - 14 - 10 - - -",
                melody2: "15 - 12 - 8 - 12 - 14 - 10 - 5 - 10 - 12 - 7 - 3 - 7 - 11 - - - 7 - - -",
                lead: "12 - 15 - 20 - 19 - 17 - - - 14 - 10 - 12 - 15 - 19 - 22 - 19 - - - - - . .",
                end: "14 - 12 - - - - -" }, // its melody stops on G (its last bar, a rest, isn't played): F#, then E
            3: { // Sodium Rain
                melody: "19 - 15 - 12 - 15 12 17 - 14 - 10 - 14 10 15 - 12 - 8 - 12 8 14 - - - 10 - - -",
                melody2: "15 - - - 20 - 15 - 17 - 14 - 10 - 14 - 19 - - - 15 - 12 - 11 - 14 - 19 - - -",
                lead: "20 - 19 20 - - 19 - 22 - 20 22 - - 17 - 19 - 17 19 - - 15 - 12 - - - 15 - - -",
                end: "12 - - - - - - -" }, // its melody stops on D: up to E
            4: { // Afterglow
                melody: "12 - - 15 - - 19 - 17 - - 14 - - 10 - 15 - - 12 - - 8 - 10 - 14 - 17 - 22 -",
                melody2: "20 - - 19 - - 15 - 22 - - 17 - - 14 - 19 - 15 - 12 - 15 - 19 - - - 23 - - -",
                lead: "20 - 22 - 24 - 20 - 22 - - - 17 - 14 - 19 - 22 - 24 - 22 - 24 - - - - - . .",
                end: "24 - - - - - - -" }, // its melody climbs D's chord to the high D: up to E
            5: { // Interference, the boss
                melody: "12 12 15 12 19 - 15 12 14 14 17 14 22 - 17 14 15 15 20 15 24 - 20 15 22 - - - 14 - - -",
                melody2: "15 15 20 15 24 - 20 15 14 14 17 14 22 - 17 14 12 - - 15 - - 19 - 23 - 19 - 14 - 11 -",
                lead: "19 - 19 - 15 - 19 - 22 - 22 - 17 - 22 - 24 - - 19 - - 15 - 19 - - - 12 - - -",
                end: "19 - 24 - - - - -", // wherever it falls: B, then up to the high E
                bass: "0 12 0 12 0 12 0 7" }, // the act's notes on the beats, pumping between them
        } },
    { key: 62, waves: ["square", "square"], chords: "i VI iv V", chords2: "VI iv V i", leadChords: "i VI VII V", // D minor: Dm Bb Gm A,
        melody: "7 - 10 - 12 - 10 - 8 - 7 - 5 - 3 - 5 - 8 - 12 - 10 - 11 - - - 7 - - -", // and the lead's Dm Bb C A
        melody2: "15 - 12 - 10 - 12 - 14 - - - 12 - 10 - 8 - 10 - 7 - 5 - 3 - 5 - 7 - - -",
        lead: "12 - 10 - 7 - . 7 8 - 7 - 3 - 5 - 10 - 14 - 12 - 10 - 11 - - - 7 - . .",
        bass: "0 0 12 0 0 12 0 12",
        arp: "0 1 2 3 4 3 2 1",
        end: "14 - 12 - - - - -", // Phosphor's: its melody stops on A, so E, then D
        tunes: { // its other levels' own lines, by their place in the act (levelSong)
            2: { // Radar Sweep
                melody: "0 - 3 - 7 - 12 - 15 - 12 - 8 - - - 5 - 8 - 12 - 17 - 19 - - - 11 - - -",
                melody2: "20 - 15 - 12 - 8 - 12 - - - 17 - 12 - 7 - 11 - 14 - 19 - 15 - - - 12 - - -",
                lead: "12 - - - 15 - 19 - 20 - - - 15 - 12 - 14 - 17 - 22 - 17 - 19 - - - 23 - - -",
                end: "12 - - - - - - -" }, // its melody stops on C#: up to D
            3: { // Oscilloscope
                melody: "12 - 7 12 - - 15 - 12 - 8 12 - - 15 - 17 - 12 17 - - 20 - 19 - 14 19 - - 23 -",
                melody2: "20 - 15 20 - - 24 - 20 - 17 20 - - 24 - 19 - 14 19 - - 23 - 24 - - - 19 - 15 -",
                lead: "24 - 22 - 19 - 15 - 20 - 19 - 15 - 12 - 14 - 17 - 19 - 22 - 19 - - - - - . .",
                end: "22 - 24 - - - - -" }, // its melody stops on the high D: C, then D
            4: { // Green Flash
                melody: "7 - - 12 - - 19 - 20 - 19 - 15 - 12 - 5 - - 12 - - 20 - 19 - 23 - 26 - 23 -",
                melody2: "24 - - 20 - - 15 - 17 - 20 - 24 - 20 - 19 - - 14 - - 11 - 19 - 15 - 12 - 7 -",
                lead: "24 - - - 27 - 24 - 27 - - - 24 - 20 - 22 - - - 26 - 22 - 23 - - - 19 - - -",
                end: "14 - 12 - - - - -" }, // its melody falls to F: E, then D
            5: { // Static Bloom, the boss
                melody: "12 12 12 - 15 - 19 - 20 20 20 - 19 - 15 - 17 17 17 - 20 - 24 - 23 - - - 19 - - -",
                melody2: "24 - 20 - 15 15 20 - 24 - 20 - 17 17 20 - 23 - 19 - 14 14 19 - 24 - - - - - . .",
                lead: "24 - 24 27 - - 24 - 27 - 27 24 - - 20 - 22 - 22 26 - - 22 - 23 - - - 19 - - -",
                end: "19 - 24 - - - - -", // wherever it falls: A, then up to the high D
                bass: "0 0 12 12 0 12 0 12" }, // the act's notes on the beats, pumping between them
        } },
    { key: 66, waves: ["sawtooth", "sawtooth"], chords: "i VII VI V", chords2: "iv VI V i", leadChords: "VI VII i i", // F# minor: F#m E D
        melody: "12 - 7 - 3 - 7 - 10 - 5 - 2 - 5 - 8 - 3 - 0 - 3 - 7 - - - 11 - - -", // C#, and the lead's D E F#m
        melody2: "14 - 12 - 10 - 7 - 8 - 7 - 5 - 3 - 5 - 7 - 8 - 10 - 7 - - - 2 - - -",
        lead: "12 - 8 - 3 - 8 - 10 - 14 - 17 - 14 - 15 - - - 12 - - - 7 - 10 - 12 - . .",
        bass: "0 0 0 0 0 0 0 12",
        arp: "0 1 2 0 1 2 0 1 2 0 1 2 3 2 1 0",
        end: "2 - 0 - - - - -", // Cherenkov's: its melody falls D C# B A, so G#, then F#
        tunes: { // its other levels' own lines, by their place in the act (levelSong)
            2: { // Deep Water
                melody: "7 - 12 - 15 - 12 - 10 - 14 - 17 - - - 15 - 12 - 8 - - - 11 - - - 7 - - -",
                melody2: "5 - 8 - 12 - 17 - 15 - - - 12 - 8 - 7 - - - 11 - 14 - 12 - - - - - . .",
                lead: "20 - - - 15 - 12 - 14 - 17 - 22 - - - 24 - - - 19 - 15 - 12 - - - - - . .",
                end: "7 - 12 - - - - -" }, // its melody falls to D: C#, then up to F#
            3: { // Blueshift
                melody: "12 - - - 15 - - - 14 - - - 17 - 14 - 15 - 12 - 15 - 20 - 19 19 - 14 - 11 14 -",
                melody2: "17 - - - 20 - - - 20 - - - 24 - 20 - 23 - 19 - 14 - 11 - 12 12 - 15 - 19 - -",
                lead: "20 - 15 - 12 - 15 - 17 - 14 - 17 - 22 - 24 - 19 - 15 - 19 - 24 - - - - - . .",
                end: "12 - - - - - - -" }, // its melody stops on G#: down to F#
            4: { // Cold Fire
                melody: "12 . 15 . 19 . 15 . 14 . 17 . 22 . 17 . 15 . 20 . 24 - - - 23 - - - 19 - - -",
                melody2: "17 . 20 . 24 . 20 . 20 . 24 . 20 . 15 . 11 . 14 . 19 - - - 12 - - - - - . .",
                lead: "20 - - 15 - - 12 - 14 - - 17 - - 22 - 24 - - 19 - - 15 - 19 - 15 - 12 - - -",
                end: "23 - 24 - - - - -" }, // its melody falls from E# to C#: E#, then up to F#
            5: { // Overdrive, the boss
                melody: "12 19 15 19 12 19 15 19 14 22 17 22 14 22 17 22 15 24 20 24 15 24 20 24 19 - - - 23 - - -",
                melody2: "17 24 20 24 17 24 20 24 15 24 20 24 15 24 20 24 14 19 11 19 14 19 11 19 12 - - - - - . .",
                lead: "12 - - - 8 - - - 14 - - - 10 - - - 15 - - - 12 - 7 - 12 - 15 - 19 - 24 -",
                end: "12 - 24 - - - - -", // wherever it falls: F#, then the octave over it
                bass: "0 12 0 12 0 12 0 12" }, // the act's notes on the beats, pumping between them
        } },
    { key: 60, waves: ["sawtooth", "square"], chords: "i VI VII V", chords2: "VI VII iv V", leadChords: "i VI III VII", // C minor: Cm Ab Bb G,
        melody: "12 - - 15 - - 19 - 20 - - 19 - - 15 - 17 - - 14 - - 10 - 11 - 14 - 19 - 23 -", // lead's Cm Ab Eb Bb
        melody2: "24 - - 22 - - 19 - 20 - - 17 - - 15 - 14 - - 15 - - 17 - 14 - 12 - 10 - 7 -",
        lead: "19 - - 17 15 - 12 - 15 - - 14 12 - 8 - 10 - - 12 14 - 15 - 17 - - - 14 - 10 -",
        bass: "0 12 0 12 0 12 0 12",
        arp: "0 2 4 2 1 3 5 3",
        end: "24 - - - - - - -", // Indigo's: its melody climbs G's chord to B, so up to C
        tunes: { // its other levels' own lines, by their place in the act (levelSong)
            2: { // Black Light
                melody: "19 - - 15 - - 12 - 15 - - 20 - - 15 - 17 - - 22 - - 17 - 19 - 23 - 19 - 14 -",
                melody2: "15 - - 20 - - 24 - 22 - - 17 - - 14 - 17 - - 20 - - 24 - 23 - - - 19 - - -",
                lead: "24 - - - 19 - 15 - 20 - - - 15 - 12 - 15 - - - 19 - 22 - 22 - - - 17 - - -",
                end: "12 - - - - - - -" }, // its melody stops on D: down to C
            3: { // Fluorescence
                melody: "12 14 15 - 19 - 15 - 20 - 15 - 12 - - - 14 15 17 - 22 - 17 - 19 - - - 14 - - -",
                melody2: "15 17 20 - 24 - 20 - 22 24 26 - 22 - 17 - 20 - 17 - 12 - - - 14 - - - 19 - - -",
                lead: "27 - 26 - 24 - 19 - 20 - - - 24 - 20 - 22 - 19 - 15 - 19 - 22 - - - 26 - - -",
                end: "15 - 12 - - - - -" }, // its melody stops on D: Eb, then C
            4: { // Edge of Sight
                melody: "24 - - - 26 27 - - 27 - - - 24 - 20 - 22 - - - 26 - 22 - 23 - 19 - 23 - 26 -",
                melody2: "24 - - - 20 - 24 - 26 - - - 22 - 26 - 24 - - - 20 - 17 - 19 - 23 - 26 - 23 -",
                lead: "19 - - - 24 - 27 - 27 - - - 24 - 20 - 22 - - - 19 - 15 - 17 - 22 - 26 - - -",
                end: "26 - 24 - - - - -" }, // its melody stops on the high C: D, then C
            5: { // Lazer Wave, the boss
                melody: "12 24 15 24 - 24 19 24 12 24 15 24 - 24 20 24 14 26 17 26 - 26 22 26 19 26 23 26 - 26 19 26",
                melody2: "20 27 24 27 - 27 20 27 22 29 26 29 - 29 22 29 20 29 24 29 - 29 17 29 23 - 19 - 14 - 11 -",
                lead: "19 - 19 24 - - 22 - 20 - 20 24 - - 27 - 22 - 22 19 - - 15 - 17 - 22 - 26 - - -",
                end: "19 - 24 - - - - -", // wherever it falls: G, then up to the high C
                bass: "0 12 0 12 0 12 0 7" }, // the act's notes on the beats, pumping between them
        } },
];
var ARP_FROM = 2; // an act's arpeggio joins on its second level, so each act builds as it goes
var BASS_FILL = "0 0 7 7 12 12 7 7"; // the bass's turnaround, in place of its line on every fourth bar of a section, from
                                     // the act's ARP_FROM'th level
var LIFT = 2; // semitones the song lifts by over a level's last LIFT_BARS bars, from the act's LIFT_FROM'th level: the
var LIFT_BARS = 4; // key change a last chorus takes
var LIFT_FROM = 3;
var PAD_FROM_BAR = 2; // a level builds: its pad joins on this bar, and its arpeggio (on the levels that have one) on
var ARP_FROM_BAR = 4; // this one
var ARP_HIGH_FROM = 5; // the act's level from which the arpeggio plays an octave up: its boss fight
var ARP_ACCENT = 1.25, ARP_OFF = 0.85; // the arpeggio's loudness on a beat, and off it
var PAN_ARP = -0.35, PAN_LEAD = 0.25, PAN_PAD = 0.5; // where the parts sit, left to right: the pad split either side
var PAD_SWEEP_HZ = 0.3, PAD_SWEEP = 0.35; // the pad's filter drifts, this fast and by this much of its cutoff
var LEAD_SHINE = 0.35; // in a chorus (a laser section, or overdrive) the lead is doubled an octave up, this loud against it
var BASS_FILL_BRIGHT = 1.5; // the bass's filter opens this much further through its turnaround
var reversedCache = {}, figureCache = {};

function arpFigure(song, at) { // the arpeggio's figure on the act's level `at`: as written on its second level, leaping
    // on its third (every other note an octave up), galloping on its fourth (every step twice, in pairs of sixteenths),
    // and as written again on its fifth, where it plays an octave up (arpHigh)
    var k = song.arp + "@" + at;
    if (!figureCache[k]) {
        var steps = words(song.arp);
        var notes = 0; // the leap lands on every other note, rests and holds not counted
        figureCache[k] = at == 3 ? steps.map(function (w) { return w == "." || w == "-" ? w : ++notes % 2 == 0 ? String(Number(w) + 3) : w; }).join(" ")
            : at == 4 ? steps.map(function (w) { return w + " " + (w == "." || w == "-" ? "." : w); }).join(" ") : song.arp;
    }
    return figureCache[k];
}

function songPhrase(song, sec, bar) { // the melody and the chords a wave bar plays: the second phrase, if the song has
    // one, on every other four bars of the section, A B A B, the first up an octave on its second time; a laser
    // section's lead is its own
    var second = !sec.laser && song.melody2 && Math.floor((bar - sec.first) / 4) % 2 == 1;
    var group = Math.floor((bar - sec.first) / 4);
    return { melody: second ? song.melody2 : song.melody, chords: second ? song.chords2 || song.chords : song.chords,
        octave: !sec.laser && group % 4 == 2 ? 12 : 0 }; // the first phrase's second time round, an octave up
}

function songLift(def, bar, n) { // semitones the song is lifted by in bar `bar` of level n (def, its definition): LIFT
    // over its last LIFT_BARS bars, from the act's LIFT_FROM'th level, and never in an intro (no def)
    return def && bar >= def.bars - LIFT_BARS && levelInAct(n) >= LIFT_FROM ? LIFT : 0;
}

function arpLine(song, bar, at) { // the arpeggio's line for bar `bar` of a section on the act's level `at`: its figure
    // there, and backwards every other bar
    var line = arpFigure(song, at);
    if (bar % 2 == 0) {
        return line;
    }
    return reversedCache[line] || (reversedCache[line] = words(line).slice().reverse().join(" "));
}

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
var musicLevel = 1; // the MUSIC setting (OPTIONS): the share of MUSIC_VOLUME the song plays at; 0 is no song at all
var PREVIEW_SEC = 2.5; // how long a change of it plays a moment of Act I's theme at the new level, to be heard
var MUSIC_DUCK = 0.55; // what the song dips to on each kick
var MUSIC_CUT = 0.12; // s the song takes to go when a pause, a death, a retry or a quit stops the level
var MUSIC_RING = 3; // and when the level is cleared, so its last chord rings out
var END_RING = 4; // s that chord takes to die away
var LASER_BRIGHT = 1.4; // how far the laser sections open the filters, as a chorus lifts
var BOSS_BRIGHT = 1.15; // and a boss level, all through, on top of that
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

function actSong(n) { // the song of level n's act
    return SONGS[Math.max(1, Math.min(levelAct(n), SONGS.length - 1))];
}

var levelSongs = {}; // each level's song, made once

function levelSong(n) { // the song level n plays: its act's, with the level's own lines in place of the first level's
    // (tunes, by its place in the act), the chords, the key and the voices the act's
    if (!levelSongs[n]) {
        var song = actSong(n), own = song.tunes && song.tunes[levelInAct(n)];
        levelSongs[n] = own ? Object.assign({}, song, own) : song;
    }
    return levelSongs[n];
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

function musicSection(def, bar) { // the run of bars, all wave or all laser, that a bar of a level is in: its first bar,
    // the bar after its last, and whether it is laser
    var laser = laserBars(def);
    var on = !!laser[bar];
    var first = bar, end = bar + 1;
    while (first > 0 && !!laser[first - 1] == on) {
        first--;
    }
    while (end < def.bars && !!laser[end] == on) {
        end++;
    }
    return { laser: on, first: first, end: end };
}

function musicBeat(n, delay, beatSec, over, quiet) { // beat n of the level proper (0 is the first after the count-in)
    // falls `delay` seconds from now: play the song from it to the next. beatSec: a beat's length; over: overdrive runs
    // on it; quiet: the drums are out, the level's last laser done, so there is no kick to dip under
    var c = beatAudio();
    if (!c || c.state != "running" || musicLevel <= 0) { // until the browser lets it run, its clock stands still:
        return; // notes handed it now would all sound at once when it starts. And with MUSIC off there is no song
    }
    var song = levelSong(level);
    var m = music || (music = musicBus(c, beatSec));
    var when = c.currentTime + delay;
    var bar = levelBar(Math.floor(n / BEATS_PER_BAR)), at = bar * BEATS_PER_BAR + n % BEATS_PER_BAR; // the bar as the
    // level's definition has it, and the beat in it: a boss level's loop plays its bars again (levelBar, loop.js)
    var sec = musicSection(wave, bar), next = musicBarAfter(n);
    if (!quiet) {
        duckAt(m, when, beatSec);
    }
    if (at < m.lastAt) { // the loop went round: the chord starts over with it
        m.padUntil = at;
    }
    m.lastAt = at;
    songBeat(c, m, song, sec, at, when, beatSec, { bright: (over ? OVERDRIVE_BRIGHT : sec.laser ? LASER_BRIGHT : 1)
        * (wave && wave.boss ? BOSS_BRIGHT : 1),
        arp: levelInAct(level) >= ARP_FROM, arpLevel: levelInAct(level), arpHigh: levelInAct(level) >= ARP_HIGH_FROM, lift: songLift(wave, bar, level),
        breakdown: !sec.laser && next !== null && musicSection(wave, next).laser }); // the bar before a laser
        // section is a breakdown: the bass and the drums alone under the melody, so the chorus lands
}

function musicBarAfter(n) { // the bar, as the level's definition has it, that follows the bar beat n is in, or null
    // when the song ends with that bar, resolving on the bar line after the level's last laser (resolveBeat, loop.js):
    // past its last bar, a boss level's loop goes round (levelBar)
    var bar = Math.floor(n / BEATS_PER_BAR) + 1, end = resolveBeat();
    return (COUNT_IN_BARS + bar) * BEATS_PER_BAR < (end === null ? totalBeats : end) ? levelBar(bar) : null;
}

function songBeat(c, m, song, sec, n, when, beatSec, o) { // o: bright, arp, arpLevel, arpHigh, lift, breakdown // a song's notes from beat n to the next, the beat
    // falling at `when` in section sec: the chord, the bass, the arpeggio if arp, and the melody, or the lead in a
    // laser section
    var from = n - sec.first * BEATS_PER_BAR; // beats into its section, which starts the chords and the lines afresh
    var left = sec.end * BEATS_PER_BAR - n; // and beats left in it, which no note outlasts
    var bar = Math.floor(n / BEATS_PER_BAR), inSec = Math.floor(from / BEATS_PER_BAR); // the bar, and bars into the section
    var key = song.key + (o.lift || 0), phrase = songPhrase(song, sec, bar); // the key as lifted, and the phrase playing
    var bright = o.bright, padOn = bar >= PAD_FROM_BAR && !o.breakdown, arpOn = o.arp && bar >= ARP_FROM_BAR && !o.breakdown;
    var line = sec.laser && song.leadChords || phrase.chords;
    var at = Math.floor(from / BEATS_PER_BAR) % words(line).length;
    var chord = words(line)[at];
    if (n >= m.padUntil) { // a bar line, or the song starting again partway through a bar: the chord to its end
        var rest = BEATS_PER_BAR - n % BEATS_PER_BAR;
        if (padOn) {
            playPad(c, m, when, voiced(key, chord, PAD_LOW), rest * beatSec, bright);
        }
        m.padUntil = n + rest;
    }
    var root = bassRoots(key, line)[at];
    lineNotes(o.arp && inSec % 4 == 3 ? BASS_FILL : song.bass, 2, from, left, function (k, step, len) { // a turnaround every fourth bar
        playBass(c, m, when + k * beatSec / 2, root + step, len * beatSec / 2, bright * (o.arp && inSec % 4 == 3 ? BASS_FILL_BRIGHT : 1));
    });
    if (arpOn) {
        var tones = voiced(key, chord, ARP_LOW + (o.arpHigh ? 12 : 0));
        lineNotes(arpLine(song, inSec, o.arpLevel || ARP_FROM), 4, from, left, function (k, step, len) {
            var note = tones[step % tones.length] + 12 * Math.floor(step / tones.length);
            playArp(c, m, when + k * beatSec / 4, note, len * beatSec / 4, bright, k == 0);
        });
    }
    lineNotes(sec.laser ? song.lead : phrase.melody, 2, from, left, function (k, step, len) {
        playLead(c, m, song.waves, when + k * beatSec / 2, key + step + (sec.laser ? 0 : phrase.octave), len * beatSec / 2, bright);
    });
}

function songTune(def, n, bar) { // what the tune does over bar `bar` of level n (def, its definition), for the lasers
    // to follow: the melody in a wave bar, the lead in a laser one. onset[i]: the MIDI note it starts on the bar's beat
    // i, or null; hold[i]: how many beats it holds that note for, or null; sound[i]: the note sounding on beat i,
    // started or held, or null in a rest; lo and hi: the line's lowest note and its highest, so a note's height on the
    // screen can be worked out from them (waves.js); bass[i], bassLo and bassHi: the same for the bass under it;
    // chord: the bar's chord's notes, in the tune's octave
    var song = levelSong(n);
    var sec = musicSection(def, bar);
    var key = song.key + songLift(def, bar, n), phrase = songPhrase(song, sec, bar); // as the song plays it
    var tuneKey = key + (sec.laser ? 0 : phrase.octave); // the tune's notes, up an octave on the first phrase's second time
    var s = words(sec.laser ? song.lead : phrase.melody);
    var tune = { onset: [], hold: [], sound: [], lo: Infinity, hi: -Infinity };
    s.forEach(function (w) {
        if (w != "-" && w != ".") {
            tune.lo = Math.min(tune.lo, tuneKey + Number(w));
            tune.hi = Math.max(tune.hi, tuneKey + Number(w));
        }
    });
    var first = (bar - sec.first) * BEATS_PER_BAR * 2; // the bar's first step, and the section's
    var steps = (sec.end - sec.first) * BEATS_PER_BAR * 2; // the section's, which no note holds past
    for (var i = 0; i < BEATS_PER_BAR; i++) {
        var step = first + i * 2;
        var w = s[step % s.length];
        var on = w != "-" && w != ".";
        tune.onset.push(on ? tuneKey + Number(w) : null);
        var len = 1; // the note's length in steps: through the "-"s after it, to the section's end at most
        while (on && step + len < steps && s[(step + len) % s.length] == "-") {
            len++;
        }
        tune.hold.push(on ? len / 2 : null); // in beats, two steps to one
        var sounding = null;
        for (var back = step; back >= 0 && back > step - s.length; back--) { // back through its holds, to the note
            var v = s[back % s.length]; // they hold, but not past the section's start: nothing is held into it
            if (v != "-") {
                sounding = v == "." ? null : tuneKey + Number(v);
                break;
            }
        }
        tune.sound.push(sounding);
    }
    // and the bass under it: the MIDI note the bass sounds on each beat, or null in a rest, and the bass line's range
    // over the section's chords, so a cage can stand where the bass is (bassAt, waves.js)
    var chordLine = sec.laser && song.leadChords || phrase.chords;
    var roots = bassRoots(key, chordLine);
    var bass = song.bass ? words(song.bass) : [];
    tune.bass = [];
    tune.bassLo = Infinity;
    tune.bassHi = -Infinity;
    roots.forEach(function (root) {
        bass.forEach(function (w) {
            if (w != "-" && w != ".") {
                tune.bassLo = Math.min(tune.bassLo, root + Number(w));
                tune.bassHi = Math.max(tune.bassHi, root + Number(w));
            }
        });
    });
    var root = roots[(bar - sec.first) % roots.length];
    var chordNames = words(chordLine), chord = CHORDS[chordNames[(bar - sec.first) % chordNames.length]];
    tune.chord = chord.map(function (t) { // the bar's chord, its notes taken into the tune's own octave, from lo up
        var n = key + t;
        return tune.lo + ((n - tune.lo) % 12 + 12) % 12;
    });
    for (var j = 0; j < BEATS_PER_BAR; j++) {
        var at = first + j * 2, note = null; // the bass's step on beat j, and back through its holds to the note
        for (var b = at; bass.length && b >= 0 && b > at - bass.length; b--) {
            var v = bass[b % bass.length];
            if (v != "-") {
                note = v == "." ? null : root + Number(v);
                break;
            }
        }
        tune.bass.push(note);
    }
    return tune;
}

function zapNote(b) { // the note a laser firing on beat b sounds (b counted from the count-in's first beat): the
    // tune's, sounding on that beat, which is the note the laser was placed on, or else the tune's lowest
    var bar = levelBar(Math.floor((b - levelZeroBeat()) / BEATS_PER_BAR)); // as the level's definition has it
    var tune = songTune(wave, level, bar);
    var note = tune.sound[(b - levelZeroBeat()) % BEATS_PER_BAR];
    return note === null ? tune.lo : note;
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

function musicEnd(c, m, song, when, lift, beatSec) { // the level resolved, from `when`, on the last kick: the key's own
    // chord and the bass on its note, under the lead's end (a note or two onto the key's), all held to the end's last
    // step and left to ring
    var key = song.key + (lift || 0), steps = words(song.end || "12");
    var hold = steps.length * beatSec / 2; // eighths, as the lead's lines are
    duckAt(m, when, beatSec);
    playPad(c, m, when, voiced(key, "i", PAD_LOW), hold, 1, END_RING);
    playBass(c, m, when, register(key, BASS_LOW), hold, 1, END_RING);
    steps.forEach(function (w, i) {
        if (w == "-" || w == ".") {
            return;
        }
        var len = 1; // through its holds
        while (i + len < steps.length && steps[i + len] == "-") {
            len++;
        }
        var last = !steps.slice(i + 1).some(function (v) { return v != "-" && v != "."; }); // the note it lands on
        playLead(c, m, song.waves, when + i * beatSec / 2, key + Number(w), len * beatSec / 2, 1, last ? END_RING : 0);
    });
}

// An act's intro plays its theme under the lore: the chords, the bass and the melody, round and round with no beat
// under them, until the intro ends. Nothing steps the game then, so it keeps its own time: a timer hands the audio
// clock the beats coming up within INTRO_AHEAD, as scheduleBeats does in a level
var INTRO_AHEAD = 0.2; // s
var intro = null; // the theme playing: { song, beatSec, start (the audio time of its first beat), next (the beat to
                  // hand over next), timer, ctx (the audio it plays on, whose clock start is on) }
const INTRO_SECTION = { laser: false, first: 0, end: Infinity }; // the whole intro is one wave section

function musicFinish(delay, b) { // the song resolves on beat b (counted from the count-in's first), `delay` seconds
    // from now (finalHit, loop.js): the bar line after the level's last laser, or the pause's first beat after its boss
    // falls. Its end, in the key the bar before it played in, lifted or not
    var c = beatAudio();
    if (!c || !music || c.state != "running") {
        return;
    }
    var bar = levelBar(Math.floor((b - 1 - levelZeroBeat()) / BEATS_PER_BAR));
    musicEnd(c, music, levelSong(level), c.currentTime + Math.max(0, delay), songLift(wave, bar, level), msPerBeat() / 1000);
}

function musicIntro(act, bpm) { // play an act's theme at bpm until musicIntroStop
    musicIntroStop(MUSIC_CUT);
    var c = beatAudio();
    if (!c || musicLevel <= 0) {
        return;
    }
    intro = { song: SONGS[act], beatSec: 60 / bpm, start: c.currentTime + 0.1, next: 0, timer: 0, ctx: c };
    intro.timer = setInterval(introTick, 50);
    introTick();
}

function introTick() { // hand the audio clock the theme's beats coming up
    var c = beatAudio();
    if (!intro || !c || c.state != "running") {
        return;
    }
    var now = c.currentTime;
    if (c !== intro.ctx) { // the audio was made afresh (audioRemake, audio.js): its clock starts over, and the theme
        intro.ctx = c; // goes on from where it was on it
        intro.start = now + 0.1 - intro.next * intro.beatSec;
    }
    var late = Math.ceil((now - intro.start) / intro.beatSec); // beats whose moment went by while the clock stood
    intro.next = Math.max(intro.next, late); // still or the timer was held back: skipped, not played all at once
    var m = music || (music = musicBus(c, intro.beatSec));
    while (intro.start + intro.next * intro.beatSec < now + INTRO_AHEAD) {
        songBeat(c, m, intro.song, INTRO_SECTION, intro.next, intro.start + intro.next * intro.beatSec, intro.beatSec,
            { bright: 1, arp: false, lift: 0 });
        intro.next++;
    }
}

function musicIntroStop(fade) { // the theme stops, going over `fade` seconds
    if (intro) {
        clearInterval(intro.timer);
        intro = null;
        musicStop(fade);
    }
}

function musicBus(c, beatSec) { // where a song's notes go, made as it starts or starts again: every part into duck,
    // which dips on each kick, and the arpeggio and the lead into the echo too; out is what musicStop fades
    var out = c.createGain();
    out.gain.value = musicGain();
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
    var pan = function (where) { // a part's place across the stereo field, into duck; or duck itself where a browser
        if (!c.createStereoPanner) { // has no panner
            return duck;
        }
        var p = c.createStereoPanner();
        p.pan.value = where;
        p.connect(duck);
        return p;
    };
    return { out: out, duck: duck, echo: echo, padUntil: -1, lastAt: -1, arpPan: pan(PAN_ARP), leadPan: pan(PAN_LEAD), padL: pan(-PAN_PAD),
        padR: pan(PAN_PAD) };
}

function musicStop(fade) { // the song stops where it stands, going over `fade` seconds; a beat handed to musicBeat
    // after this starts it again
    if (!music) {
        return;
    }
    var m = music;
    music = null;
    fadeBus(m, fade, musicGain());
}

function fadeBus(m, fade, from) { // a song's bus (musicBus) going, over `fade` seconds from the level `from`, and then
    // let go: notes still due sound into nothing, and the echo's loop is broken
    var now = m.out.context.currentTime;
    m.out.gain.setValueAtTime(from, now);
    m.out.gain.linearRampToValueAtTime(0, now + fade);
    setTimeout(function () {
        m.out.disconnect();
        m.echo.disconnect();
    }, 1000 * fade + 200);
}

function musicGain() { // the song's volume as the MUSIC setting has it
    return MUSIC_VOLUME * musicLevel;
}

function setMusicLevel(v) { // the MUSIC setting changed: what plays from now on, and anything playing now, at v
    musicLevel = v;
    if (music) {
        music.out.gain.setValueAtTime(musicGain(), music.out.context.currentTime);
    }
    setMusicVolume(musicVolume); // and the recorded tracks' (audio.js), were there any
    themeLevel(); // and the menu theme's (theme.js), which goes with MUSIC off and comes back with it on
}

var preview = null; // the moment of theme a change of the setting is playing, and the timer that ends it

function musicPreview() { // play a moment of Act I's theme at the level just set, so it can be heard; with MUSIC off,
    // the silence says so
    musicPreviewStop();
    musicIntro(1, levelDef(1).bpm);
    if (intro) {
        var mine = intro;
        preview = { intro: mine, timer: setTimeout(function () {
            preview = null;
            if (intro === mine) { // and not an act's intro that has taken over since
                musicIntroStop(0.4);
            }
        }, PREVIEW_SEC * 1000) };
    }
}

function musicPreviewStop() { // the settings went, or the timing test came up: the preview stops now
    if (preview) {
        clearTimeout(preview.timer);
        if (intro === preview.intro) {
            musicIntroStop(MUSIC_CUT);
        }
        preview = null;
    }
}

function duckAt(m, when, beatSec, depth) { // a kick at `when`: the song dips under it (to depth, MUSIC_DUCK by default)
    // and swells back over the beat
    var d = m.duck.gain;
    d.setValueAtTime(1, when);
    d.linearRampToValueAtTime(depth || MUSIC_DUCK, when + 0.01);
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
    [[-v.spread, m.padL], [v.spread, m.padR]].forEach(function (side) { // each note's two saws to either side
        var f = lowpass(c, v.cutoff * bright, 0.7);
        var lfo = c.createOscillator(), depth = c.createGain(); // the filter drifting, either side out of step
        lfo.frequency.value = PAD_SWEEP_HZ * (side[0] < 0 ? 1 : 1.13);
        depth.gain.value = v.cutoff * bright * PAD_SWEEP;
        lfo.connect(depth);
        depth.connect(f.frequency);
        lfo.start(when);
        lfo.stop(off + release + 0.02);
        notes.forEach(function (note) {
            osc(c, "sawtooth", note, side[0], when, off + release + 0.02).connect(f);
        });
        var g = noteGain(c, when, v.level, Math.min(v.attack, len / 2), off, release);
        f.connect(g);
        g.connect(side[1] || m.duck);
    });
}

function playArp(c, m, when, note, len, bright, accent) { // a square, plucked: its filter opens at the start and
    // closes; louder on the beat than off it
    var v = VOICES.arp;
    var release = Math.max(v.release, len);
    var f = lowpass(c, v.cutoff * bright, 3);
    f.frequency.setValueAtTime(v.cutoff * bright * 3, when);
    f.frequency.exponentialRampToValueAtTime(v.cutoff * bright, when + 0.08);
    osc(c, "square", note, 0, when, when + release + 0.02).connect(f);
    var g = noteGain(c, when, v.level * (accent ? ARP_ACCENT : ARP_OFF), 0.003, when, release);
    f.connect(g);
    g.connect(m.arpPan || m.duck);
    g.connect(m.echo);
}

function playLead(c, m, waves, when, note, len, bright, ring) { // two oscillators a few cents apart, of the waves
    // the act's song gives them, with a vibrato that comes in as the note holds
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
    [[waves[0], -5], [waves[1], 5]].forEach(function (w) {
        var o = osc(c, w[0], note, w[1], when, end);
        depth.connect(o.detune);
        o.connect(f);
    });
    if (bright > 1) { // a chorus: the note doubled an octave up, quieter, so it shines
        var shine = c.createGain();
        shine.gain.value = LEAD_SHINE;
        osc(c, waves[0], note + 12, 0, when, end).connect(shine);
        shine.connect(f);
    }
    var g = noteGain(c, when, v.level, 0.01, off, release);
    f.connect(g);
    g.connect(m.leadPan || m.duck);
    g.connect(m.echo);
}
