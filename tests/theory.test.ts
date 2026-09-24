import { describe, expect, it } from 'vitest';
import { analyzePitchClasses, CHORD_QUALITIES, chordName, chordTones, compareChord, expectedPitchClasses, matchChords, type QualityId } from '../src/theory/chords';
import { fingeringNotes, formatFingering, parseFingering, STANDARD_TUNING, stringFretToMidi } from '../src/theory/guitar';
import { midiToNote, normalizePitchClass, noteNameToPitchClass, noteToMidi, uniquePitchClasses } from '../src/theory/notes';

const midiNotes = (shape: string) => fingeringNotes(parseFingering(shape)).map(note => note.midi);

describe('notes and pitch classes', () => {
  it.each([[0, 0], [12, 0], [25, 1], [-1, 11], [-12, 0], [64, 4]])('normalizes %i to %i', (input, expected) => {
    expect(normalizePitchClass(input)).toBe(expected);
  });
  it('collapses duplicate pitch classes and sorts them', () => {
    expect(uniquePitchClasses([64, 40, 67, 60, 7, 4])).toEqual([0, 4, 7]);
    expect(uniquePitchClasses(new Set([60, 72, 64]))).toEqual([0, 4]);
  });
  it.each([NaN, Infinity, -Infinity, 3.5])('rejects invalid input %s', value => {
    expect(() => normalizePitchClass(value)).toThrow(RangeError);
  });
  it.each([['E2', 40], ['A2', 45], ['D3', 50], ['G3', 55], ['B3', 59], ['E4', 64], ['C4', 60]])('converts %s to MIDI %i and back', (name, midi) => {
    expect(noteToMidi(name)).toBe(midi);
    expect(midiToNote(midi)).toBe(name);
  });
  it('handles enharmonic names and accidental octave boundaries', () => {
    expect(noteNameToPitchClass('Bb')).toBe(10);
    expect(noteNameToPitchClass('A#')).toBe(10);
    expect(noteToMidi('B#3')).toBe(60);
    expect(noteToMidi('Cb4')).toBe(59);
    expect(noteToMidi('F##4')).toBe(67);
    expect(() => noteNameToPitchClass('H')).toThrow();
    expect(() => noteNameToPitchClass('C#b')).toThrow();
  });
});

describe('six-string guitar', () => {
  it('uses standard tuning from low E to high E', () => {
    expect([...STANDARD_TUNING]).toEqual([40, 45, 50, 55, 59, 64]);
    expect(fingeringNotes(parseFingering('000000')).map(note => note.name)).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  });
  it('adds one semitone per fret, including fret 12', () => {
    STANDARD_TUNING.forEach((midi, index) => {
      expect(stringFretToMidi(index, 1)).toBe(midi + 1);
      expect(stringFretToMidi(index, 12)).toBe(midi + 12);
    });
  });
  it('omits muted strings while keeping string order', () => {
    const notes = fingeringNotes(parseFingering('xx0232'));
    expect(notes.map(note => note.name)).toEqual(['D3', 'A3', 'D4', 'F#4']);
    expect(notes.map(note => note.stringIndex)).toEqual([2, 3, 4, 5]);
    expect(fingeringNotes(parseFingering('xxxxxx'))).toEqual([]);
  });
  it('round trips compact and two-digit fret notation', () => {
    expect(formatFingering(parseFingering('XX0232'))).toBe('xx0232');
    expect(parseFingering('x x 10 12 11 10')).toEqual([null, null, 10, 12, 11, 10]);
    expect(formatFingering(parseFingering('x x 10 12 11 10'))).toBe('x x 10 12 11 10');
  });
  it('rejects invalid strings, frets, and malformed shapes', () => {
    expect(() => stringFretToMidi(6, 0)).toThrow();
    expect(() => stringFretToMidi(-1, 0)).toThrow();
    expect(() => stringFretToMidi(1, -1)).toThrow();
    expect(() => stringFretToMidi(1, 2.5)).toThrow();
    expect(() => parseFingering('xx023')).toThrow();
    expect(() => parseFingering('xx02q2')).toThrow();
    expect(() => parseFingering('')).toThrow();
  });
});

const intervals: [QualityId, number[]][] = [
  ['major', [0, 4, 7]], ['minor', [0, 3, 7]], ['dominant7', [0, 4, 7, 10]],
  ['major7', [0, 4, 7, 11]], ['minor7', [0, 3, 7, 10]], ['minorMajor7', [0, 3, 7, 11]],
  ['major6', [0, 4, 7, 9]], ['minor6', [0, 3, 7, 9]], ['sus2', [0, 2, 7]], ['sus4', [0, 5, 7]],
];

describe('interval-defined chords', () => {
  it.each(intervals)('constructs %s at all twelve roots', (quality, expected) => {
    const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    roots.forEach((root, pc) => {
      expect(expectedPitchClasses({ root, quality })).toEqual(expected.map(interval => (pc + interval) % 12));
    });
  });
  it('generates target spellings and interval degrees', () => {
    expect(chordTones({ root: 'D', quality: 'major7' })).toEqual([
      { pitchClass: 2, name: 'D', degree: '1' }, { pitchClass: 6, name: 'F#', degree: '3' },
      { pitchClass: 9, name: 'A', degree: '5' }, { pitchClass: 1, name: 'C#', degree: '7' },
    ]);
    expect(chordTones({ root: 'C', quality: 'dominant7' }).map(tone => tone.name)).toEqual(['C', 'E', 'G', 'Bb']);
    expect(chordTones({ root: 'F#', quality: 'major7' }).map(tone => tone.name)).toEqual(['F#', 'A#', 'C#', 'E#']);
    expect(chordTones({ root: 'Bb', quality: 'minor' }).map(tone => tone.name)).toEqual(['Bb', 'Db', 'F']);
    expect(CHORD_QUALITIES.minor6.degrees).toEqual(['1', 'b3', '5', '6']);
  });
});

describe('chord matching and grading', () => {
  it.each<[string, QualityId, string]>([
    ['xx0232', 'major', 'D'], ['xx0222', 'major7', 'Dmaj7'], ['xx0212', 'dominant7', 'D7'],
    ['xx0231', 'minor', 'Dm'], ['xx0211', 'minor7', 'Dm7'],
  ])('identifies %s as %s', (shape, quality, name) => {
    const target = { root: 'D', quality };
    const analysis = analyzePitchClasses(midiNotes(shape), target);
    expect(analysis.comparison?.correct).toBe(true);
    expect(chordName(analysis.candidates[0])).toBe(name);
  });
  it('accepts doubled notes and octave-displaced inversions', () => {
    const target = { root: 'D', quality: 'major7' } as const;
    expect(compareChord([2, 6, 9, 1, 2, 6], target).correct).toBe(true);
    expect(compareChord([57, 61, 66, 74, 86, 78], target).correct).toBe(true);
    expect(compareChord(midiNotes('x57675'), target).correct).toBe(true);
  });
  it('rejects a chord when even the fifth is missing', () => {
    const comparison = compareChord([50, 54, 61], { root: 'D', quality: 'major7' });
    expect(comparison.correct).toBe(false);
    expect(comparison.missing).toEqual([9]);
    expect(comparison.extra).toEqual([]);
  });
  it('rejects the common C7 shell voicing until its fifth is added', () => {
    const target = { root: 'C', quality: 'dominant7' } as const;
    expect(compareChord(midiNotes('x32310'), target)).toMatchObject({ correct: false, missing: [7], extra: [] });
    expect(compareChord(midiNotes('x32313'), target).correct).toBe(true);
  });
  it('reports missing and unexpected notes for D7 versus Dmaj7', () => {
    const comparison = compareChord(midiNotes('xx0212'), { root: 'D', quality: 'major7' });
    expect(comparison.correct).toBe(false);
    expect(comparison.missing).toEqual([1]);
    expect(comparison.extra).toEqual([0]);
  });
  it('rejects extra notes even if all required notes are present', () => {
    expect(compareChord([2, 6, 9, 1, 3], { root: 'D', quality: 'major7' })).toMatchObject({ correct: false, missing: [], extra: [3] });
  });
  it('does not claim a chord for silence or unsupported clusters', () => {
    expect(matchChords([])).toEqual([]);
    expect(matchChords([0, 1, 2])).toEqual([]);
    expect(compareChord([], { root: 'D', quality: 'major7' }).missing).toEqual([2, 6, 9, 1]);
  });
  it('keeps both interpretations of C6 / Am7 and prefers a correct target', () => {
    expect(matchChords([0, 4, 7, 9]).map(chordName)).toEqual(['C6', 'Am7']);
    expect(matchChords([0, 4, 7, 9], { root: 'A', quality: 'minor7' }).map(chordName)).toEqual(['Am7', 'C6']);
    expect(matchChords([0, 4, 7, 9], { root: 'D', quality: 'major' }).map(chordName)).toEqual(['C6', 'Am7']);
  });
  it('keeps suspended-chord ambiguity and the target enharmonic spelling', () => {
    expect(matchChords([2, 4, 9], { root: 'D', quality: 'sus2' }).map(chordName)).toEqual(['Dsus2', 'Asus4']);
    expect(matchChords([1, 5, 8], { root: 'C#', quality: 'major' }).map(chordName)).toEqual(['C#']);
  });
  it('consumes an iterable only once at the shared analysis boundary', () => {
    function* detectedNotes() { yield 60; yield 64; yield 67; yield 72; }
    const analysis = analyzePitchClasses(detectedNotes(), { root: 'C', quality: 'major' });
    expect(analysis.pitchClasses).toEqual([0, 4, 7]);
    expect(analysis.comparison?.correct).toBe(true);
    expect(analysis.candidates.map(chordName)).toEqual(['C']);
  });
});
