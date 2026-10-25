import { EXERCISES, type Exercise } from './exercises';
import { CHORD_QUALITIES, type QualityId } from './theory/chords';
import { noteNameToPitchClass, pitchClassName } from './theory/notes';

export function generateQuestions(count: number, random = Math.random): Exercise[] {
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new RangeError('Choose 1–50 questions.');
  const pool: Exercise[] = [];
  const seen = new Set<string>();
  for (const seed of EXERCISES) {
    for (let shift = 0; shift <= 12 - Math.max(...seed.startingFingering.map(f => f ?? 0)); shift++) {
      const root = pitchClassName(noteNameToPitchClass(seed.start.root) + shift);
      for (const quality of Object.keys(CHORD_QUALITIES) as QualityId[]) {
        if (quality === seed.start.quality) continue;
        const id = `${root}-${seed.start.quality}-${quality}`;
        if (seen.has(id)) continue;
        seen.add(id);
        pool.push({ id, start: { root, quality: seed.start.quality }, target: { root, quality }, startingFingering: seed.startingFingering.map(f => f === null ? null : f + shift) });
      }
    }
  }
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count);
}
