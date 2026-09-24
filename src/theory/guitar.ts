import { midiToNote, normalizePitchClass } from './notes';

/** Low E to high E, matching conventional fingering notation. */
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64] as const;
export const STRING_LABELS = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const;
export const DISPLAY_FRETS = 12;
export type StringPosition = number | null;
export type Fingering = readonly StringPosition[];

export function stringFretToMidi(stringIndex: number, fret: number): number {
  if (!Number.isInteger(stringIndex) || stringIndex < 0 || stringIndex >= 6) throw new RangeError('String index must be 0–5.');
  if (!Number.isInteger(fret) || fret < 0) throw new RangeError('Fret must be a non-negative integer.');
  return STANDARD_TUNING[stringIndex] + fret;
}

export function validateFingering(fingering: Fingering): void {
  if (fingering.length !== 6) throw new RangeError('A fingering must have exactly six strings.');
  fingering.forEach((fret, index) => { if (fret !== null) stringFretToMidi(index, fret); });
}

export function fingeringNotes(fingering: Fingering) {
  validateFingering(fingering);
  return fingering.flatMap((fret, stringIndex) => {
    if (fret === null) return [];
    const midi = stringFretToMidi(stringIndex, fret);
    return [{ stringIndex, fret, midi, pitchClass: normalizePitchClass(midi), name: midiToNote(midi) }];
  });
}

/** Compact open shapes, or space-separated tokens for frets 10 and up. */
export function parseFingering(value: string): Fingering {
  const trimmed = value.trim();
  const tokens = /\s/.test(trimmed) ? trimmed.split(/\s+/) : [...trimmed];
  const result = tokens.map(token => {
    if (/^x$/i.test(token)) return null;
    if (!/^\d+$/.test(token)) throw new TypeError(`Invalid fingering position: ${token}`);
    return Number(token);
  });
  validateFingering(result);
  return result;
}

export function formatFingering(fingering: Fingering): string {
  validateFingering(fingering);
  const separator = fingering.some(fret => fret !== null && fret >= 10) ? ' ' : '';
  return fingering.map(fret => fret === null ? 'x' : String(fret)).join(separator);
}
