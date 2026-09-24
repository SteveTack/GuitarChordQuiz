export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const NATURAL_PITCH_CLASSES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI notes and pitch classes share this normalization boundary. */
export function normalizePitchClass(note: number): number {
  if (!Number.isInteger(note)) throw new RangeError('Notes must be finite integers.');
  return ((note % 12) + 12) % 12;
}

export function uniquePitchClasses(notes: Iterable<number>): number[] {
  return [...new Set(Array.from(notes, normalizePitchClass))].sort((a, b) => a - b);
}

export function pitchClassName(note: number, flats = false): string {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[normalizePitchClass(note)];
}

export function noteNameToPitchClass(name: string): number {
  const match = /^([A-G])([#b]{0,2})$/.exec(name);
  if (!match || (match[2].includes('#') && match[2].includes('b'))) throw new TypeError(`Invalid note name: ${name}`);
  const accidental = [...match[2]].reduce((sum, char) => sum + (char === '#' ? 1 : -1), 0);
  return normalizePitchClass(NATURAL_PITCH_CLASSES[match[1]] + accidental);
}

export function noteToMidi(note: string): number {
  const match = /^([A-G][#b]{0,2})(-?\d+)$/.exec(note);
  if (!match) throw new TypeError(`Expected a note and octave, such as E2: ${note}`);
  // Keep accidentals across octave boundaries: B#3 is C4, not C3.
  noteNameToPitchClass(match[1]);
  const accidental = [...match[1].slice(1)].reduce((sum, char) => sum + (char === '#' ? 1 : -1), 0);
  return (Number(match[2]) + 1) * 12 + NATURAL_PITCH_CLASSES[match[1][0]] + accidental;
}

export function midiToNote(note: number, flats = false): string {
  return `${pitchClassName(note, flats)}${Math.floor(note / 12) - 1}`;
}
