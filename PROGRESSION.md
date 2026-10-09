# Lazer Wave: difficulty progression

An outline of the 25 levels as they are charted in `waves.js` (`LEVELS`, each level's `chart`). The tables are worked
out from the charts by `node .claude/progression.js`: run it after changing a chart, and it rewrites each table between
its markers. The notes between the tables are written by hand, so give them a look after a change.

<!-- begin stamp -->
_Tables worked out from the charts at plugin 1.22.0 by `node .claude/progression.js`._
<!-- end stamp -->

The *lasers a bar* are what each wave bar fires, average and busiest (rests and drifting lasers left out, a mine's burst
counted, the most drifting lasers coming in in a bar after them). The *tightest* is the least of the screen a piece
could reach at any moment of the level's wave form, at a hand speed of 1000 px/s, measured as `.claude/safegap.js`'s
`validateAll` measures it (the same within a point where drifting lasers are on screen): the lower, the tighter. The
tables give NORMAL's figures; Room on each difficulty has the tightest on all four.

## Checks

The script runs the checks on every level's chart as well: somewhere to reach at every moment on every difficulty,
and `safegap.js`'s `cellConflicts` and `driftDeals`.

<!-- begin checks -->
- All 25 levels, on every difficulty: somewhere to reach at every moment, no laser through a cage's cell or a pincer's gap, and no drifting laser where it can't get across or would drift through one.
<!-- end checks -->

## Every level

- A count-in bar, then bar 0, a rest. Every beat after the count-in is hit, on the beat, in its colour.
- Each act's fifth level is a boss. Its targets are the boss's health, and the level loops from the bar before its
  last laser section until the boss falls.

<!-- begin every-level -->
- Tempo from 96 BPM in level 1 to 132 in level 25. Length from 10 bars to 22.
- Warnings: a level's `warn` (2 beats in every level) times the difficulty's: EASY ×1.5, NORMAL ×1.25, HARD ×1, TRUE ×0.85. On NORMAL, 1563 ms in level 1 to 1136 ms in level 25.
- Moving lasers go at the difficulty's pace, of TRUE's: EASY ×0.4, NORMAL ×0.6, HARD ×0.8, TRUE ×1. A corridor keeps its bar and gets that share of its path through it; a sweeper, the radar, a pendulum and the spinning X make their whole way all the same, over 10 beats on EASY, 6.7 beats on NORMAL, 5 beats on HARD, 4 beats on TRUE, on into the bars after their own (sooner where laser form, the level's end, another of them or a bar with a place of its own to be in comes first: see Moving lasers on each difficulty); a drifting laser takes 20 beats on EASY, 13.3 beats on NORMAL, 10 beats on HARD, 8 beats on TRUE to cross the screen.
- The gaps the player is asked into widen at the difficulty's `gap`: EASY ×1.5, NORMAL ×1.3, HARD ×1.15, TRUE ×1. All but a corridor's widen about the same middle and are kept on the screen.

| Gap | EASY | NORMAL | HARD | TRUE |
|---|---|---|---|---|
| A corridor's, of the height | 45% | 39% | 35% | 30% |
| A wall's, of the height | 45% | 39% | 35% | 30% |
| A sweeper's hole, of the height | 45% | 39% | 35% | 30% |
| A pincer's, of the height | 30% | 26% | 23% | 20% |
| A cage's cell, of the height × the width | 30% × 30% | 26% × 26% | 23% × 23% | 20% × 20% |
| Closing walls', of the width | 30% | 26% | 23% | 20% |
<!-- end every-level -->

## Milestones

<!-- begin milestones -->
| | Levels |
|---|---|
| Colours | none: 1-5; solid (the key changes at a bar line): 6-18, 20; pairs (every 2 beats): 9-25; alt (every beat): 16-25 |
| Laser form | 3-25 (first in 3, bars 5-7); two sections or more: 10, 17-25 |
| Laser form targets | tune: 3-5, 7-9, 11-13, 15, 17-19, 22-23, 25; hold: 5-7; jump: 7, 9-10, 13; steps: 8-10, 14, 16, 20; zigzag: 11-15, 17, 19-25; scatter: 17-25 |
| Lasers to dodge a laser bar | 0: 3-4, 6; 1: 5, 7-17; 2: 18-25 |
| Rest bars after bar 0 | 1-7, 10 |
| Combinations | two in a bar: 5, 9-10, 13-25; three: 24-25 |
| Drifting lasers | roll (PIANO ROLL): 21-22, 24-25; swarm: 22-23, 25; mines: 24-25 |
| Bosses | 5 Red Giant (node, 30 HP, round 2 at the earliest), 10 Interference (twin, 40 HP, round 3 at the earliest), 15 Static Bloom (radar, 50 HP, round 4 at the earliest), 20 Overdrive (chaser, 60 HP, round 5 at the earliest), 25 Lazer Wave (mirror, 75 HP, round 4 at the earliest) |
<!-- end milestones -->

## Act by act

Columns: tempo; bars; colour patterns; laser form bars and the targets they deal; lasers to dodge a laser bar; what is
new to the game (a pattern or combination with the bar it first comes in, and the firsts of colours, laser form,
targets and lasers to dodge); rest bars after bar 0; lasers a bar; the tightest moment.

### Act I, Infrared (levels 1-5): the beat, the melody, laser form

<!-- begin act-1 -->
| # | Level | BPM | Bars | Colours | Laser form | Dodge | New | Rests | Lasers a bar | Tightest |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Signal | 96 | 10 | none | - | - | melody (1) | 1 | 3.0 / 4 | 88% |
| 2 | Carrier | 98 | 10 | none | - | - | rain (1), fall (4) | 1 | 3.4 / 4 | 79% |
| 3 | Ember Line | 99 | 12 | none | 5-7: tune | 0 | laser form, tune targets | 2 | 3.2 / 4 | 88% |
| 4 | Heat Haze | 101 | 12 | none | 4-7: tune | 0 | pincer (3) | 1 | 3.5 / 4 | 76% |
| 5 | Red Giant, boss | 102 | 14 | none | 6-9: hold, tune | 1 | cage (2), pincer+cage (4), hold targets, a laser to dodge | 1 | 9.0 / 18 | 64% |
<!-- end act-1 -->

- No colours: either key hits any beat.
- Laser form comes in on its own in 3: tune targets, nothing to dodge.
- The boss is the act's biggest step: the cage, the first combination, hold targets and the first laser to dodge,
  with more than twice the lasers a bar of the level before.

### Act II, Sodium (levels 6-10): colours, walls

<!-- begin act-2 -->
| # | Level | BPM | Bars | Colours | Laser form | Dodge | New | Rests | Lasers a bar | Tightest |
|---|---|---|---|---|---|---|---|---|---|---|
| 6 | Streetlight | 104 | 12 | solid | 5-7: hold | 0 | colours, a bar each | 2 | 3.7 / 4 | 88% |
| 7 | Amber Alert | 105 | 14 | solid | 6-9: jump, tune, hold | 1 | wall (3), jump targets | 2 | 4.7 / 8 | 53% |
| 8 | Sodium Rain | 107 | 14 | solid | 6-9: steps, tune | 1 | corridor (5), steps targets | 0 | 5.3 / 16 | 33% |
| 9 | Afterglow | 108 | 14 | solid, pairs | 6-9: jump, steps, tune | 1 | colours in pairs | 0 | 7.2 / 24 | 64% |
| 10 | Interference, boss | 110 | 16 | solid, pairs | 3-5, 8-10: steps, jump | 1 | 2 laser sections | 1 | 8.1 / 24 | 40% |
<!-- end act-2 -->

- Colours come in with nothing else new (6).
- Level 8 is the tightest level of all, the final boss only matching it on TRUE: a cage straight after a corridor
  (bars 11-12).
- The busiest bars in 9 and 10 are pincer+cage: a cage already fires a pincer's two beams, so they fire twice.
- The boss (10) is the twin: two laser sections, the second facing left.

### Act III, Phosphor (levels 11-15): beams down the screen, lasers that move

<!-- begin act-3 -->
| # | Level | BPM | Bars | Colours | Laser form | Dodge | New | Rests | Lasers a bar | Tightest |
|---|---|---|---|---|---|---|---|---|---|---|
| 11 | Phosphor | 111 | 14 | solid, pairs | 6-9: tune, zigzag | 1 | cross (3), zigzag targets, mirror (10) | 0 | 4.7 / 8 | 53% |
| 12 | Radar Sweep | 113 | 14 | solid, pairs | 6-9: zigzag, tune | 1 | radar (2), ripple (5) | 0 | 6.3 / 12 | 64% |
| 13 | Oscilloscope | 114 | 16 | solid, pairs | 6-9: zigzag, tune, jump | 1 | crossfire (3), crossfire+melody (3), stairs (12) | 0 | 7.5 / 18 | 74% |
| 14 | Green Flash | 116 | 16 | solid, pairs | 7-10: zigzag, steps | 1 | sweep (3), sweep+cage (14) | 0 | 8.1 / 17 | 49% |
| 15 | Static Bloom, boss | 117 | 18 | solid, pairs | 6-9: tune, zigzag | 1 | - | 0 | 8.9 / 19 | 49% |
<!-- end act-3 -->

- Two new patterns a level in 11, 12 and 13; the boss brings none. Its radar arm runs slower the more it is hurt.

### Act IV, Blueshift (levels 16-20): colours on every beat, two laser sections

<!-- begin act-4 -->
| # | Level | BPM | Bars | Colours | Laser form | Dodge | New | Rests | Lasers a bar | Tightest |
|---|---|---|---|---|---|---|---|---|---|---|
| 16 | Cherenkov | 119 | 16 | solid, pairs, alt | 6-9: steps | 1 | segment (2), offbeat (3), offbeat+segment (3), colours on every beat | 0 | 4.4 / 8 | 47% |
| 17 | Deep Water | 120 | 16 | solid, pairs, alt | 4-6, 10-12: tune, zigzag, scatter | 1 | chord (1), pendulum (2), pendulum+cage (2), scatter targets | 0 | 5.1 / 13 | 47% |
| 18 | Blueshift | 122 | 18 | solid, pairs, alt | 4-6, 11-13: tune, scatter | 2 | double (7), close (8), close+melody (8), doubletap (14), 2 lasers to dodge | 0 | 4.1 / 6 | 53% |
| 19 | Cold Fire | 123 | 18 | pairs, alt | 4-6, 11-13: zigzag, tune, scatter | 2 | chase (9), stutter (10), chase+cage (17) | 0 | 5.7 / 16 | 53% |
| 20 | Overdrive, boss | 125 | 18 | solid, pairs, alt | 4-6, 11-13: scatter, steps, zigzag | 2 | ring (1), diagonal (1), ring+diagonal (1), spin (14) | 0 | 4.5 / 8 | 76% |
<!-- end act-4 -->

- 16 brings two patterns and alt colours at once; 18 three patterns and a second laser to dodge.
- The boss brings three: ring and diagonal together, as ring+diagonal in bar 1, before either plays alone (bars 7
  and 8), and the spinning X. It is also the roomiest level since Act I.

### Act V, Ultraviolet (levels 21-25): drifting lasers

<!-- begin act-5 -->
| # | Level | BPM | Bars | Colours | Laser form | Dodge | New | Rests | Lasers a bar | Tightest |
|---|---|---|---|---|---|---|---|---|---|---|
| 21 | Indigo | 126 | 18 | pairs, alt | 5-8, 11-13: scatter, zigzag | 2 | roll (1), fill (14) | 0 | 4.0 / 10, 8 drifting | 57% |
| 22 | Black Light | 128 | 20 | pairs, alt | 5-8, 12-15: zigzag, tune, scatter | 2 | swarm (2), roll+cross (3), spin+ring (4) | 0 | 3.5 / 9, 18 drifting | 54% |
| 23 | Fluorescence | 129 | 20 | pairs, alt | 5-8, 12-15: tune, zigzag, scatter | 2 | swarm+stairs (9) | 0 | 5.2 / 9, 17 drifting | 52% |
| 24 | Edge of Sight | 131 | 22 | pairs, alt | 5-8, 13-16: scatter, zigzag | 2 | mines (2), roll+rain+stairs (17) | 0 | 4.2 / 9, 4 drifting | 49% |
| 25 | Lazer Wave, boss | 132 | 22 | pairs, alt | 5-8, 13-16: scatter, zigzag, tune | 2 | swarm+rain+stairs (19), mines+cross (21) | 0 | 3.9 / 10, 19 drifting | 36% |
<!-- end act-5 -->

- 23 brings nothing new since the march came out.
- The final boss's echo beams fire across the middle on every other beat, where the measured piece stands.

## Room on each difficulty

The tightest moment of each level on each difficulty: the warnings don't change what can hit, but the moving lasers'
pace does, and so do the gaps, and so does how far ahead the final boss fires its echoes. A corridor's walls and a
wall's beams run out to the screen's edges, so a wider gap burns less, and the levels tightest at one (8, 10 and 25;
7, 11, 14, 15, 18, 19, 23 and 24) open up the most on the easier difficulties. A pincer's beams, a cage's and closing
walls' are as thick wherever they stand, so a wider gap or cell moves room from outside them to inside, where the
player is asked to be, rather than adding to it, and the measure, which counts all the room, moves by a point either
way as its 16 px grid falls differently: the levels tightest at a cage (5, 9 and 12) come out a point under TRUE, and
so does 17 on NORMAL, its pendulum crossing a cage's cell. EASY can come out a point under NORMAL where a slowed sweeper stops mid-screen at the bar line just as a
wall fires (14, bar 12): the strip it burned last counts as out of reach for a moment.

<!-- begin room -->
| # | Level | EASY | NORMAL | HARD | TRUE |
|---|---|---|---|---|---|
| 1 | Signal | 88% | 88% | 88% | 88% |
| 2 | Carrier | 79% | 79% | 79% | 79% |
| 3 | Ember Line | 88% | 88% | 88% | 88% |
| 4 | Heat Haze | 76% | 76% | 76% | 76% |
| 5 | Red Giant | 64% | 64% | 64% | 65% |
| 6 | Streetlight | 88% | 88% | 88% | 88% |
| 7 | Amber Alert | 56% | 53% | 47% | 44% |
| 8 | Sodium Rain | 39% | 33% | 30% | 25% |
| 9 | Afterglow | 64% | 64% | 64% | 65% |
| 10 | Interference | 48% | 40% | 35% | 34% |
| 11 | Phosphor | 56% | 53% | 47% | 44% |
| 12 | Radar Sweep | 64% | 64% | 64% | 65% |
| 13 | Oscilloscope | 74% | 74% | 74% | 74% |
| 14 | Green Flash | 50% | 49% | 46% | 44% |
| 15 | Static Bloom | 53% | 49% | 47% | 44% |
| 16 | Cherenkov | 47% | 47% | 47% | 47% |
| 17 | Deep Water | 52% | 47% | 50% | 48% |
| 18 | Blueshift | 56% | 53% | 47% | 44% |
| 19 | Cold Fire | 54% | 53% | 50% | 44% |
| 20 | Overdrive | 76% | 76% | 76% | 76% |
| 21 | Indigo | 55% | 57% | 58% | 55% |
| 22 | Black Light | 55% | 54% | 55% | 54% |
| 23 | Fluorescence | 54% | 52% | 46% | 43% |
| 24 | Edge of Sight | 51% | 49% | 43% | 42% |
| 25 | Lazer Wave | 43% | 36% | 31% | 25% |
<!-- end room -->

## Moving lasers on each difficulty

How long each sweeper, radar, pendulum and spinning X in the charts takes to make its whole way, in beats: a bar at
TRUE's pace, the longer at a slower one's, on into the bars after its own. Each is done before laser form, the level's
end, another of them, or a bar with a place of its own to be in (a cage, a pincer, a corridor, closing walls), so
where one of those comes soon it goes faster than its difficulty's pace (Done before), and where one is the very next
bar it can't slow down at all: a rest put after it gives it room.

<!-- begin movers -->
| # | Bar | Laser | EASY | NORMAL | HARD | TRUE | Done before |
|---|---|---|---|---|---|---|---|
| 12 | 2 | radar | 8 | 6.7 | 5 | 4 | pincer, bar 4 |
| 12 | 13 | radar | 4 | 4 | 4 | 4 | the level's end |
| 14 | 3 | sweeper | 10 | 6.7 | 5 | 4 | - |
| 14 | 11 | sweeper | 10 | 6.7 | 5 | 4 | - |
| 14 | 14 | sweeper (sweep+cage) | 8 | 6.7 | 5 | 4 | the level's end |
| 15 | 1 | sweeper (sweep+cage) | 8 | 6.7 | 5 | 4 | sweep+cage, bar 3 |
| 15 | 3 | sweeper (sweep+cage) | 4 | 4 | 4 | 4 | cage, bar 4 |
| 15 | 11 | radar | 4 | 4 | 4 | 4 | sweep, bar 12 |
| 15 | 12 | sweeper | 10 | 6.7 | 5 | 4 | - |
| 17 | 2 | pendulum (pendulum+cage) | 4 | 4 | 4 | 4 | pendulum, bar 3 |
| 17 | 3 | pendulum | 4 | 4 | 4 | 4 | laser form, bar 4 |
| 17 | 7 | pendulum (pendulum+cage) | 10 | 6.7 | 5 | 4 | - |
| 17 | 14 | pendulum | 8 | 6.7 | 5 | 4 | the level's end |
| 20 | 14 | spinning X | 10 | 6.7 | 5 | 4 | - |
| 22 | 4 | spinning X (spin+ring) | 4 | 4 | 4 | 4 | laser form, bar 5 |
| 22 | 10 | sweeper (sweep+cage) | 4 | 4 | 4 | 4 | close, bar 11 |
| 22 | 18 | spinning X (spin+ring) | 8 | 6.7 | 5 | 4 | the level's end |
| 23 | 3 | pendulum (pendulum+cage) | 8 | 6.7 | 5 | 4 | laser form, bar 5 |
| 24 | 1 | spinning X | 8 | 6.7 | 5 | 4 | radar, bar 3 |
| 24 | 3 | radar | 8 | 6.7 | 5 | 4 | laser form, bar 5 |
| 25 | 4 | spinning X | 4 | 4 | 4 | 4 | laser form, bar 5 |
| 25 | 12 | spinning X (spin+ring) | 4 | 4 | 4 | 4 | laser form, bar 13 |
<!-- end movers -->

## Where each pattern appears

Names as a chart writes them (practice's tile name in brackets where it differs).

<!-- begin patterns -->
| Pattern | First (level, bar) | Levels |
|---|---|---|
| melody | 1, bar 1 | 1-11, 13, 15-16, 18 |
| rain | 2, bar 1 | 2-4, 6-14, 16-21, 24-25 |
| fall (FALLERS) | 2, bar 4 | 2-6, 9 |
| pincer | 4, bar 3 | 4-5, 7, 9-10, 12 |
| cage | 5, bar 2 | 5, 8-12, 14-15, 17, 19, 21-23, 25 |
| wall | 7, bar 3 | 7-8, 10-11, 14-16, 18-19, 23-24 |
| corridor | 8, bar 5 | 8, 10, 25 |
| cross | 11, bar 3 | 11-15, 17, 19-23, 25 |
| mirror | 11, bar 10 | 11, 13, 15, 17, 23 |
| radar | 12, bar 2 | 12, 15, 24 |
| ripple | 12, bar 5 | 12, 14-15 |
| crossfire | 13, bar 3 | 13-15 |
| stairs | 13, bar 12 | 13, 15-16, 18-20, 23-25 |
| sweep (SWEEPER) | 14, bar 3 | 14-15, 22 |
| segment | 16, bar 2 | 16, 24 |
| offbeat | 16, bar 3 | 16, 24 |
| chord | 17, bar 1 | 17, 23 |
| pendulum | 17, bar 2 | 17, 23 |
| double | 18, bar 7 | 18-24 |
| close | 18, bar 8 | 18, 22 |
| doubletap | 18, bar 14 | 18, 23 |
| chase (CHASERS) | 19, bar 9 | 19, 21, 25 |
| stutter | 19, bar 10 | 19, 22 |
| ring | 20, bar 1 | 20-22, 24-25 |
| diagonal | 20, bar 1 | 20-22, 24-25 |
| spin (SPINNING X) | 20, bar 14 | 20, 22, 24-25 |
| roll (PIANO ROLL) | 21, bar 1 | 21-22, 24-25 |
| fill | 21, bar 14 | 21, 24 |
| swarm | 22, bar 2 | 22-23, 25 |
| mines | 24, bar 2 | 24-25 |
<!-- end patterns -->

## Combinations

<!-- begin combinations -->
| Combination | First (level, bar) | Levels |
|---|---|---|
| pincer+cage | 5, bar 4 | 5, 9-10 |
| crossfire+melody | 13, bar 3 | 13, 15 |
| sweep+cage | 14, bar 14 | 14-15, 22 |
| offbeat+segment | 16, bar 3 | 16, 24 |
| pendulum+cage | 17, bar 2 | 17, 23 |
| close+melody | 18, bar 8 | 18 |
| chase+cage | 19, bar 17 | 19, 21, 25 |
| ring+diagonal | 20, bar 1 | 20-21, 24-25 |
| roll+cross | 22, bar 3 | 22 |
| spin+ring | 22, bar 4 | 22, 25 |
| swarm+stairs | 23, bar 9 | 23 |
| roll+rain+stairs | 24, bar 17 | 24 |
| swarm+rain+stairs | 25, bar 19 | 25 |
| mines+cross | 25, bar 21 | 25 |
<!-- end combinations -->

## What stands out

- Bosses carry new material: the cage and the first combination (5); ring, diagonal and the spinning X (20).
- A pattern can arrive inside a combination before it plays alone: ring and diagonal, as ring+diagonal in 20's first
  bar.
- New things come unevenly: three at once in 18 and in 20, two with alt colours in 16, none in 15 or 23.
- The colour pools step back and forth: 19 drops solid, 20 has it again, 21-25 drop it.
- The busiest bars are pincer+cage (5, 9 and 10), its beams fired twice.
- Tightness doesn't climb with the levels: 8 is the tightest of all (the final boss matches it on TRUE), while 13 and 20 are roomier than most of
  Act II on.
- Rest bars stop after 10; fallers after 9; pincers after 12; the corridor appears only in 8, 10 and 25.

## Changing it

Each level's `chart` in `waves.js` lists its bars, one entry a bar, bar 0 first: `"rest"`, a pattern, a combination of
two or three (`"swarm+rain+stairs"`), or a laser form bar and its targets (`"laser:zigzag"`). Changing an entry
changes that bar alone. Then run `node .claude/progression.js` (about a minute): it brings these tables up to date and
runs the checks, listing anything wrong under Checks and in its output, and exits with 1 if it found anything. The
notes around the tables are written by hand, so read them over after a change.
