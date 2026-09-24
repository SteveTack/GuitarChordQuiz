import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../src/exercises';
import { CHORD_QUALITIES, compareChord } from '../src/theory/chords';
import { fingeringNotes, formatFingering, parseFingering } from '../src/theory/guitar';
import { loadExercise, nextExercise, randomExercise, setPosition } from '../src/state';

const solutions = ['xx0222', 'xx0212', 'xx0231', 'xx0211', 'x02020', 'x02120', 'x02210', 'x32000', 'x32313', '020100', '022000', '320001', 'x02220', 'x02110', 'x02222', 'x02212', 'xx0230', 'xx0233'];

describe('exercise library', () => {
  it.each(EXERCISES.map((exercise, index) => ({ ...exercise, solution: solutions[index] })))('$id has a valid start and a reachable solution', exercise => {
    const startNotes = fingeringNotes(exercise.startingFingering).map(note => note.midi);
    const solutionNotes = fingeringNotes(parseFingering(exercise.solution)).map(note => note.midi);
    expect(compareChord(startNotes, exercise.start).correct).toBe(true);
    expect(compareChord(startNotes, exercise.target).correct).toBe(false);
    expect(compareChord(solutionNotes, exercise.target).correct).toBe(true);
  });
  it('has unique IDs and covers every supported target quality', () => {
    expect(new Set(EXERCISES.map(exercise => exercise.id)).size).toBe(EXERCISES.length);
    expect(new Set(EXERCISES.map(exercise => exercise.target.quality))).toEqual(new Set(Object.keys(CHORD_QUALITIES)));
  });
});

describe('exercise controls', () => {
  it('changes one string without mutating the starting shape and resets it', () => {
    const initial = loadExercise(0);
    const edited = setPosition(initial, 4, 2);
    expect(formatFingering(edited.fingering)).toBe('xx0222');
    expect(formatFingering(initial.fingering)).toBe('xx0232');
    expect(formatFingering(EXERCISES[0].startingFingering)).toBe('xx0232');
    expect(loadExercise(edited.exerciseIndex)).toEqual(initial);
  });
  it('supports open, muted, and fret 12 states', () => {
    let state = loadExercise(0);
    state = setPosition(state, 0, 0);
    expect(state.fingering[0]).toBe(0);
    state = setPosition(state, 0, 12);
    expect(state.fingering[0]).toBe(12);
    state = setPosition(state, 0, null);
    expect(state.fingering[0]).toBeNull();
  });
  it('loads the next exercise and wraps at the end', () => {
    expect(nextExercise(loadExercise(0)).exerciseIndex).toBe(1);
    expect(nextExercise(loadExercise(EXERCISES.length - 1)).exerciseIndex).toBe(0);
  });
  it('random exercise never immediately repeats the current one', () => {
    EXERCISES.forEach((_, index) => {
      for (const value of [0, .1, .5, .9, .99999]) {
        const next = randomExercise(loadExercise(index), () => value);
        expect(next.exerciseIndex).not.toBe(index);
        expect(next.fingering).toEqual(EXERCISES[next.exerciseIndex].startingFingering);
      }
    });
  });
  it('rejects invalid UI positions and exercise indices', () => {
    expect(() => setPosition(loadExercise(0), 0, 13)).toThrow();
    expect(() => setPosition(loadExercise(0), 6, 1)).toThrow();
    expect(() => loadExercise(-1)).toThrow();
    expect(() => loadExercise(EXERCISES.length)).toThrow();
  });
});
