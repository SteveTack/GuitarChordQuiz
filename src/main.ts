import './style.css';
import { EXERCISES } from './exercises';
import { analyzePitchClasses, CHORD_QUALITIES, chordLongName, chordName, chordTones } from './theory/chords';
import { DISPLAY_FRETS, fingeringNotes, formatFingering, STRING_LABELS, stringFretToMidi } from './theory/guitar';
import { midiToNote, normalizePitchClass, pitchClassName } from './theory/notes';
import { loadExercise, nextExercise, randomExercise, setPosition } from './state';

const app = document.querySelector<HTMLDivElement>('#app')!;
let state = loadExercise(0);
const completed = new Set<string>();
const displayOrder = [5, 4, 3, 2, 1, 0];
const frets = Array.from({ length: DISPLAY_FRETS }, (_, index) => index + 1);

app.innerHTML = `
  <div class="shell">
    <header class="site-header">
      <a class="brand" href="./" aria-label="Chordcraft home"><img src="${import.meta.env.BASE_URL}favicon.svg" alt="" width="35" height="35">Chordcraft<span class="brand-divider"></span><span class="brand-caption">a little practice, every day.</span></a>
      <span class="local-badge"><span></span>Fretboard practice</span>
    </header>
    <main>
      <section class="intro" aria-labelledby="page-title">
        <div><p class="eyebrow">THE CHORD WORKSHOP</p><h1 id="page-title">Small changes. New chords.</h1><p class="intro-copy">Explore the notes that turn a familiar shape into something new.</p></div>
        <div class="library-control"><label for="exercise-select">Choose an exercise</label><select id="exercise-select">${EXERCISES.map((exercise, index) => `<option value="${index}">${String(index + 1).padStart(2, '0')} · ${chordName(exercise.start)} → ${chordName(exercise.target)}</option>`).join('')}</select></div>
      </section>

      <section class="exercise-card" aria-labelledby="exercise-prompt">
        <div class="exercise-instruction"><p class="eyebrow"><span class="exercise-number" id="exercise-number"></span> YOUR CHALLENGE</p><h2 id="exercise-prompt"></h2><p id="target-description"></p></div>
        <div class="starting-shape"><span class="small-label">STARTING SHAPE</span><strong id="starting-name"></strong><code id="starting-fingering"></code><span class="shape-order">low E → high E</span></div>
      </section>

      <section class="fretboard-panel" aria-labelledby="fretboard-title">
        <div class="panel-heading"><div><h2 id="fretboard-title">Your fretboard</h2><span class="tuning">STANDARD TUNING · E A D G B E</span></div><button class="button reset-button" id="reset"><span aria-hidden="true">↺</span> Reset shape</button></div>
        <p class="board-instruction" id="board-instruction">Click a fret to move a note. <strong>×</strong> mutes a string; <strong>○</strong> plays it open.</p>
        <div class="fretboard-scroll" tabindex="0" role="region" aria-label="Scrollable six-string fretboard" aria-describedby="board-instruction keyboard-help">
          <div class="fretboard" id="fretboard">
            <div class="fretboard-axis" aria-hidden="true"><span>STRING</span><span>×</span><span>○</span>${frets.map(fret => `<span>${fret}</span>`).join('')}<span>NOTE</span></div>
            ${displayOrder.map(stringIndex => `<div class="string-row" role="group" aria-label="${STRING_LABELS[stringIndex]} string" data-string-row="${stringIndex}" style="--string-width:${1 + (5 - stringIndex) * .4}px">
              <span class="string-label">${STRING_LABELS[stringIndex].slice(0, 1)}<small>${6 - stringIndex}</small></span>
              <button class="position-button state-button mute-button" data-string="${stringIndex}" data-position="x" aria-label="Mute ${STRING_LABELS[stringIndex]} string" aria-pressed="false"><span>×</span></button>
              <button class="position-button state-button open-button" data-string="${stringIndex}" data-position="0" aria-label="Open ${STRING_LABELS[stringIndex]} string" aria-pressed="false"><span>○</span></button>
              ${frets.map(fret => `<button class="position-button fret-button ${fret === 1 ? 'first-fret' : ''}" data-string="${stringIndex}" data-position="${fret}" aria-label="${STRING_LABELS[stringIndex]} string, fret ${fret}, ${midiToNote(stringFretToMidi(stringIndex, fret))}" aria-pressed="false"><span class="finger-dot">${fret}</span></button>`).join('')}
              <span class="string-note" id="string-note-${stringIndex}"></span>
            </div>`).join('')}
            <div class="fretboard-axis inlay-row" aria-hidden="true"><span></span><span></span><span></span>${frets.map(fret => `<span>${[3, 5, 7, 9].includes(fret) ? '●' : fret === 12 ? '● ●' : ''}</span>`).join('')}<span></span></div>
          </div>
        </div>
        <div class="board-caption"><div class="legend"><span><i class="legend-muted">×</i> Muted</span><span><i class="legend-open">○</i> Open</span><span><i class="legend-fretted"></i> Fretted</span></div><p>High E at top · low E at bottom</p></div>
        <details class="keyboard-help"><summary>Keyboard controls</summary><p id="keyboard-help">Tab to a string. Use the arrow keys to move between positions and strings, then Enter or Space to select. Home goes to mute; End goes to fret 12. On a narrow screen, swipe the fretboard horizontally.</p></details>
      </section>

      <div class="feedback-grid">
        <section class="feedback-card detected-card" aria-labelledby="detected-heading"><h2 class="small-label" id="detected-heading">WHAT YOU'RE PLAYING</h2><div class="detected-title"><h3 id="detected-chord"></h3><code id="current-fingering" title="Fingering, low E to high E"></code></div><p class="candidate-info" id="candidate-info"></p><div id="current-tones" class="note-chips"></div><p class="pitch-classes" id="pitch-classes"></p><details class="string-details"><summary>Notes on each string</summary><div id="string-details"></div></details></section>
        <section class="feedback-card target-card" aria-labelledby="target-heading"><div class="target-heading"><h2 class="small-label" id="target-heading">WHAT YOU'RE AIMING FOR</h2><span class="formula" id="target-formula"></span></div><div id="target-tones" class="target-tones"></div><div class="difference-row"><div><span class="difference-label">Missing</span><span id="missing-notes"></span></div><div><span class="difference-label">Extra / unexpected</span><span id="extra-notes"></span></div></div></section>
      </div>

      <div class="session-bar"><div class="status" id="status" role="status" aria-live="polite" aria-atomic="true"></div><div class="exercise-actions"><button class="button" id="random"><span aria-hidden="true">⤨</span> Random exercise</button><button class="button primary" id="next">Next exercise <span aria-hidden="true">→</span></button></div></div>
      <footer class="footer"><span>Every chord tone counts. Doubled notes and different octaves welcome.</span><span id="session-progress"></span></footer>
    </main>
  </div>`;

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function render(): void {
  const exercise = EXERCISES[state.exerciseIndex];
  const notes = fingeringNotes(state.fingering);
  const analysis = analyzePitchClasses(notes.map(note => note.midi), exercise.target);
  const comparison = analysis.comparison!;
  const tones = chordTones(exercise.target);
  const targetName = chordName(exercise.target);
  const matchedTones = analysis.candidates[0] ? chordTones(analysis.candidates[0]) : [];
  const nameOf = (pc: number): string => tones.find(tone => tone.pitchClass === pc)?.name
    ?? matchedTones.find(tone => tone.pitchClass === pc)?.name ?? pitchClassName(pc);
  const noteNames = (pcs: number[]) => pcs.map(nameOf).join(' · ') || 'None';
  const currentPcs = [...comparison.expected.filter(pc => comparison.current.includes(pc)), ...comparison.extra];

  element<HTMLSelectElement>('exercise-select').value = String(state.exerciseIndex);
  element('exercise-number').textContent = `${String(state.exerciseIndex + 1).padStart(2, '0')} / ${EXERCISES.length}`;
  element('exercise-prompt').innerHTML = `Change ${chordLongName(exercise.start)} into <span>${targetName}.</span>`;
  element('target-description').textContent = `Find the ${CHORD_QUALITIES[exercise.target.quality].name} sound. Any voicing with all the target tones works.`;
  element('starting-name').textContent = chordLongName(exercise.start);
  element('starting-fingering').textContent = formatFingering(exercise.startingFingering);
  element('current-fingering').textContent = formatFingering(state.fingering);

  document.querySelectorAll<HTMLButtonElement>('.position-button').forEach(button => {
    const stringIndex = Number(button.dataset.string);
    const position = button.dataset.position === 'x' ? null : Number(button.dataset.position);
    const active = state.fingering[stringIndex] === position;
    button.setAttribute('aria-pressed', String(active));
    button.tabIndex = active ? 0 : -1;
  });
  state.fingering.forEach((fret, stringIndex) => {
    const label = element(`string-note-${stringIndex}`);
    const row = document.querySelector<HTMLElement>(`[data-string-row="${stringIndex}"]`)!;
    row.classList.toggle('is-muted', fret === null);
    label.textContent = fret === null ? '—' : nameOf(normalizePitchClass(stringFretToMidi(stringIndex, fret)));
  });

  const candidateNames = analysis.candidates.map(chordName);
  element('detected-chord').textContent = candidateNames.length ? (comparison.correct ? targetName : candidateNames.join(' / ')) : notes.length ? 'No exact match' : 'All strings muted';
  element('candidate-info').textContent = candidateNames.length > 1
    ? comparison.correct ? `Also matches ${candidateNames.slice(1).join(', ')}. The exercise target takes priority.` : 'These chord names share the same pitch classes.'
    : candidateNames.length ? chordLongName(analysis.candidates[0]) : notes.length ? 'This note set does not match a supported chord yet.' : 'Choose an open string or a fret to add a note.';
  element('current-tones').innerHTML = currentPcs.length ? currentPcs.map(pc => `<span class="note-chip ${comparison.extra.includes(pc) ? 'extra' : ''}">${nameOf(pc)}</span>`).join('') : '<span class="empty-notes">No sounding notes</span>';
  element('pitch-classes').textContent = `Pitch classes: ${analysis.pitchClasses.length ? analysis.pitchClasses.join(', ') : 'none'} · C = 0`;
  element('string-details').innerHTML = state.fingering.map((fret, stringIndex) => {
    const midi = fret === null ? null : stringFretToMidi(stringIndex, fret);
    return `<div><span>${STRING_LABELS[stringIndex]}</span><span>${midi === null ? 'Muted' : `${midiToNote(midi)} · MIDI ${midi} · PC ${normalizePitchClass(midi)}`}</span></div>`;
  }).join('');

  element('target-formula').textContent = `${targetName} = ${CHORD_QUALITIES[exercise.target.quality].degrees.join(' ')}`;
  element('target-tones').innerHTML = tones.map(tone => `<div class="target-tone ${comparison.missing.includes(tone.pitchClass) ? 'is-missing' : 'is-present'}"><strong>${tone.name}</strong><span>${tone.degree}</span><small>${comparison.missing.includes(tone.pitchClass) ? 'missing' : 'present'}</small></div>`).join('');
  element('missing-notes').textContent = noteNames(comparison.missing);
  element('extra-notes').textContent = noteNames(comparison.extra);
  element('missing-notes').className = comparison.missing.length ? 'needs-note' : 'all-clear';
  element('extra-notes').className = comparison.extra.length ? 'unexpected-note' : 'all-clear';

  if (comparison.correct) completed.add(exercise.id);
  const status = element('status');
  status.classList.toggle('is-correct', comparison.correct);
  const statusTitle = comparison.correct ? `Correct: ${targetName}` : 'Keep exploring';
  const statusDetail = comparison.correct ? 'All target tones are present, with no extra notes.'
    : [comparison.missing.length ? `Add ${noteNames(comparison.missing)}.` : '', comparison.extra.length ? `Remove ${noteNames(comparison.extra)}.` : ''].filter(Boolean).join(' ');
  const statusHtml = `<span class="status-icon" aria-hidden="true">${comparison.correct ? '✓' : '•'}</span><div><strong>${statusTitle}</strong><p>${statusDetail}</p></div>`;
  // Avoid repeating live announcements when only the voicing/octave changes.
  if (status.innerHTML !== statusHtml) status.innerHTML = statusHtml;
  element('session-progress').textContent = `${completed.size} / ${EXERCISES.length} solved this session`;
}

element('fretboard').addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.position-button');
  if (!button) return;
  state = setPosition(state, Number(button.dataset.string), button.dataset.position === 'x' ? null : Number(button.dataset.position));
  render();
});

element('fretboard').addEventListener('keydown', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.position-button');
  if (!button || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  let stringIndex = Number(button.dataset.string);
  let position = button.dataset.position === 'x' ? -1 : Number(button.dataset.position);
  if (event.key === 'ArrowLeft') position = Math.max(-1, position - 1);
  if (event.key === 'ArrowRight') position = Math.min(DISPLAY_FRETS, position + 1);
  if (event.key === 'ArrowUp') stringIndex = Math.min(5, stringIndex + 1);
  if (event.key === 'ArrowDown') stringIndex = Math.max(0, stringIndex - 1);
  if (event.key === 'Home') position = -1;
  if (event.key === 'End') position = DISPLAY_FRETS;
  const destination = document.querySelector<HTMLButtonElement>(`[data-string="${stringIndex}"][data-position="${position === -1 ? 'x' : position}"]`)!;
  destination.focus();
});

element('exercise-select').addEventListener('change', event => {
  state = loadExercise(Number((event.target as HTMLSelectElement).value));
  render();
});
element('reset').addEventListener('click', () => { state = loadExercise(state.exerciseIndex); render(); });
element('next').addEventListener('click', () => { state = nextExercise(state); render(); });
element('random').addEventListener('click', () => { state = randomExercise(state); render(); });
render();
