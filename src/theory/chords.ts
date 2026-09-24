import { NATURAL_PITCH_CLASSES, normalizePitchClass, noteNameToPitchClass, uniquePitchClasses } from './notes';

interface ChordQuality {
  readonly name: string;
  readonly suffix: string;
  readonly intervals: readonly number[];
  readonly degrees: readonly string[];
}

export const CHORD_QUALITIES = {
  major: { name: 'major', suffix: '', intervals: [0, 4, 7], degrees: ['1', '3', '5'] },
  minor: { name: 'minor', suffix: 'm', intervals: [0, 3, 7], degrees: ['1', 'b3', '5'] },
  dominant7: { name: 'dominant 7', suffix: '7', intervals: [0, 4, 7, 10], degrees: ['1', '3', '5', 'b7'] },
  major7: { name: 'major 7', suffix: 'maj7', intervals: [0, 4, 7, 11], degrees: ['1', '3', '5', '7'] },
  minor7: { name: 'minor 7', suffix: 'm7', intervals: [0, 3, 7, 10], degrees: ['1', 'b3', '5', 'b7'] },
  minorMajor7: { name: 'minor-major 7', suffix: 'm(maj7)', intervals: [0, 3, 7, 11], degrees: ['1', 'b3', '5', '7'] },
  major6: { name: 'major 6', suffix: '6', intervals: [0, 4, 7, 9], degrees: ['1', '3', '5', '6'] },
  minor6: { name: 'minor 6', suffix: 'm6', intervals: [0, 3, 7, 9], degrees: ['1', 'b3', '5', '6'] },
  sus2: { name: 'suspended 2', suffix: 'sus2', intervals: [0, 2, 7], degrees: ['1', '2', '5'] },
  sus4: { name: 'suspended 4', suffix: 'sus4', intervals: [0, 5, 7], degrees: ['1', '4', '5'] },
} as const satisfies Record<string, ChordQuality>;

export type QualityId = keyof typeof CHORD_QUALITIES;
export interface Chord { readonly root: string; readonly quality: QualityId }
export interface ChordTone { readonly pitchClass: number; readonly name: string; readonly degree: string }

export function chordName(chord: Chord): string {
  return chord.root + CHORD_QUALITIES[chord.quality].suffix;
}

export function chordLongName(chord: Chord): string {
  return `${chord.root} ${CHORD_QUALITIES[chord.quality].name}`;
}

/** Root-first order is useful for teaching; matching itself is order-independent. */
export function expectedPitchClasses(chord: Chord): number[] {
  const root = noteNameToPitchClass(chord.root);
  return CHORD_QUALITIES[chord.quality].intervals.map(interval => normalizePitchClass(root + interval));
}

/** Spell by scale degree so C7 shows Bb and F#maj7 shows E#. */
export function chordTones(chord: Chord): ChordTone[] {
  const letters = 'CDEFGAB';
  const rootLetter = letters.indexOf(chord.root[0]);
  return expectedPitchClasses(chord).map((pitchClass, index) => {
    const degree = CHORD_QUALITIES[chord.quality].degrees[index];
    const letter = letters[(rootLetter + Number(degree.replace(/[b#]/g, '')) - 1) % 7];
    const difference = normalizePitchClass(pitchClass - NATURAL_PITCH_CLASSES[letter] + 6) - 6;
    const accidental = difference < 0 ? 'b'.repeat(-difference) : '#'.repeat(difference);
    return { pitchClass, name: letter + accidental, degree };
  });
}

export function compareChord(notes: Iterable<number>, target: Chord) {
  const current = uniquePitchClasses(notes);
  const expected = expectedPitchClasses(target);
  const missing = expected.filter(note => !current.includes(note));
  const extra = current.filter(note => !expected.includes(note));
  return { current, expected, missing, extra, correct: missing.length === 0 && extra.length === 0 };
}

const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Exact pitch-class matches only; no root/bass guesses or incomplete-chord heuristics. */
export function matchChords(notes: Iterable<number>, preferred?: Chord): Chord[] {
  const current = uniquePitchClasses(notes);
  const matches: Chord[] = [];
  for (const root of ROOT_NAMES) {
    for (const quality of Object.keys(CHORD_QUALITIES) as QualityId[]) {
      const chord = { root, quality };
      if (compareChord(current, chord).correct) matches.push(chord);
    }
  }
  if (preferred) {
    const index = matches.findIndex(chord => chord.quality === preferred.quality
      && noteNameToPitchClass(chord.root) === noteNameToPitchClass(preferred.root));
    if (index >= 0) {
      matches.splice(index, 1);
      matches.unshift(preferred);
    }
  }
  return matches;
}

/** Shared boundary for the fretboard now and detected MIDI notes/pitch classes later. */
export function analyzePitchClasses(notes: Iterable<number>, target?: Chord) {
  const pitchClasses = uniquePitchClasses(notes);
  return {
    pitchClasses,
    candidates: matchChords(pitchClasses, target),
    comparison: target ? compareChord(pitchClasses, target) : undefined,
  };
}
