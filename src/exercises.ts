import type { Chord, QualityId } from './theory/chords';
import { parseFingering, type Fingering } from './theory/guitar';

export interface Exercise {
  readonly id: string;
  readonly start: Chord;
  readonly startingFingering: Fingering;
  readonly target: Chord;
}

function exercise(root: string, quality: QualityId, shape: string, startingQuality: QualityId = 'major'): Exercise {
  return {
    id: `${root}-${startingQuality}-${quality}`,
    start: { root, quality: startingQuality },
    startingFingering: Object.freeze(parseFingering(shape)),
    target: { root, quality },
  };
}

export const EXERCISES: readonly Exercise[] = [
  exercise('D', 'major7', 'xx0232'),
  exercise('D', 'dominant7', 'xx0232'),
  exercise('D', 'minor', 'xx0232'),
  exercise('D', 'minor7', 'xx0232'),
  exercise('A', 'dominant7', 'x02220'),
  exercise('A', 'major7', 'x02220'),
  exercise('A', 'minor', 'x02220'),
  exercise('C', 'major7', 'x32010'),
  exercise('C', 'dominant7', 'x32010'),
  exercise('E', 'dominant7', '022100'),
  exercise('E', 'minor', '022100'),
  exercise('G', 'dominant7', '320003'),
  exercise('A', 'major', 'x02210', 'minor'),
  exercise('A', 'minorMajor7', 'x02210', 'minor'),
  exercise('A', 'major6', 'x02220'),
  exercise('A', 'minor6', 'x02210', 'minor'),
  exercise('D', 'sus2', 'xx0232'),
  exercise('D', 'sus4', 'xx0232'),
];
