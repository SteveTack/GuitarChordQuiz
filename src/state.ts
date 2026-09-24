import { EXERCISES } from './exercises';
import { DISPLAY_FRETS, type StringPosition } from './theory/guitar';

export interface QuizState {
  readonly exerciseIndex: number;
  readonly fingering: readonly StringPosition[];
}

export function loadExercise(index: number): QuizState {
  if (!Number.isInteger(index) || index < 0 || index >= EXERCISES.length) throw new RangeError('Unknown exercise.');
  return { exerciseIndex: index, fingering: [...EXERCISES[index].startingFingering] };
}

export function setPosition(state: QuizState, stringIndex: number, position: StringPosition): QuizState {
  if (!Number.isInteger(stringIndex) || stringIndex < 0 || stringIndex > 5) throw new RangeError('Unknown string.');
  if (position !== null && (!Number.isInteger(position) || position < 0 || position > DISPLAY_FRETS)) throw new RangeError('Position outside the fretboard.');
  return { ...state, fingering: state.fingering.map((old, index) => index === stringIndex ? position : old) };
}

export function nextExercise(state: QuizState): QuizState {
  return loadExercise((state.exerciseIndex + 1) % EXERCISES.length);
}

export function randomExercise(state: QuizState, random = Math.random): QuizState {
  const offset = 1 + Math.floor(random() * (EXERCISES.length - 1));
  return loadExercise((state.exerciseIndex + offset) % EXERCISES.length);
}
