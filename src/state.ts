import { EXERCISES, type Exercise } from './exercises';
import { DISPLAY_FRETS, type StringPosition } from './theory/guitar';

export interface QuizState {
  readonly exerciseIndex: number;
  readonly fingering: readonly StringPosition[];
}

export function loadExercise(index: number, exercises: readonly Exercise[] = EXERCISES): QuizState {
  if (!Number.isInteger(index) || index < 0 || index >= exercises.length) throw new RangeError('Unknown exercise.');
  return { exerciseIndex: index, fingering: [...exercises[index].startingFingering] };
}

export function setPosition(state: QuizState, stringIndex: number, position: StringPosition): QuizState {
  if (!Number.isInteger(stringIndex) || stringIndex < 0 || stringIndex > 5) throw new RangeError('Unknown string.');
  if (position !== null && (!Number.isInteger(position) || position < 0 || position > DISPLAY_FRETS)) throw new RangeError('Position outside the fretboard.');
  return { ...state, fingering: state.fingering.map((old, index) => index === stringIndex ? position : old) };
}

export function nextExercise(state: QuizState, exercises: readonly Exercise[] = EXERCISES): QuizState {
  return loadExercise((state.exerciseIndex + 1) % exercises.length, exercises);
}

export function randomExercise(state: QuizState, random = Math.random, exercises: readonly Exercise[] = EXERCISES): QuizState {
  const offset = 1 + Math.floor(random() * (exercises.length - 1));
  return loadExercise((state.exerciseIndex + offset) % exercises.length, exercises);
}
