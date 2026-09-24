# Chordcraft — guitar chord quiz

A small local, client-side app for learning how chord tones change a guitar shape. Built with TypeScript, HTML/CSS, Vite, and Vitest. No backend, account, external fonts, microphone, or audio processing.

**Website:** [stevetack.github.io/GuitarChordQuiz](https://stevetack.github.io/GuitarChordQuiz/)

## Run locally

Install Node.js 22.12 or newer (Node 24 recommended). Then run these commands in PowerShell:

```powershell
cd 'C:\Game Projects\GuitarChordQuiz'
npm ci
npm run dev
```

Open the local URL printed by Vite, normally **http://127.0.0.1:5173**. The server binds to your computer's loopback interface. If that port is already in use, Vite prints another port. Stop it with Ctrl+C.

`npm ci` installs the exact dependency versions in the committed lockfile. Dependencies are already installed on the machine where this project was created. After editing dependencies in `package.json`, use `npm install` to update the lockfile instead.

```powershell
npm test             # Run all deterministic theory and state tests once
npm run test:watch   # Watch tests while editing
npm run build        # Strict TypeScript check, then production build in dist/
npm run preview      # Serve the production build locally (normally port 4173)
```

The production preview is at **http://127.0.0.1:4173/GuitarChordQuiz/**. Local development still uses the root URL on port 5173.

Vite usage: [official guide](https://vite.dev/guide/). Test runner: [Vitest guide](https://vitest.dev/guide/).

## Practice

- The starting shape loads automatically. Click one of frets 1–12 to set that string's note. **×** mutes it and **○** plays it open.
- The diagram has high E at the top and low E at the bottom. Fingering notation reads low E to high E, so `xx0232` is D major. Numbers in the yellow dots are **fret numbers**, not finger numbers.
- Each string has one active position. Hovering previews where a note can be placed; clicking sets it. On small screens, swipe the fretboard horizontally.
- Keyboard: Tab to a string's active position; arrows move focus between positions/strings; Enter or Space selects. Home focuses mute, End focuses fret 12.
- Feedback updates immediately: detected chord names, unique note names, numeric pitch classes (C = 0), requested tones, and missing/extra tones. Expand “Notes on each string” for octave and MIDI details.
- Reset restores the current starting shape. Next cycles through the library; Random chooses a different exercise. The selector jumps directly to an exercise.
- The solved counter counts unique exercises completed during this page session. Resetting a shape keeps that count; reloading the page starts a new session.

The 18 exercises include all 12 requested transformations, plus Am → A, Am → Am(maj7), A → A6, Am → Am6, D → Dsus2, and D → Dsus4. All ten supported qualities appear as targets.

## Grading rules

The current **set of pitch classes must exactly equal the target set**. Every required tone must be present, including the fifth, and no unexpected tone may be present. Doublings, octave changes, string order, and inversions are accepted. Physical reach/playability is not evaluated.

For example, the common C7 shape `x32310` omits G, so this quiz reports G as missing. `x32313` supplies G and passes. This deliberately follows the all-required-tones grading rule.

Chord qualities are interval definitions relative to any root: major, minor, dominant 7, major 7, minor 7, minor-major 7, major 6, minor 6, sus2, and sus4. Target note spellings and degree descriptions are generated from these definitions; for example, C7 has Bb, and Dmaj7 has C#.

Some sets have multiple names: C6 and Am7, or Dsus2 and Asus4. The app keeps all exact supported candidates. If the target is among them, it is displayed first with the alternatives explained. Otherwise the candidates are shown together. Partial or unsupported sets display “No exact match.” The engine does not guess a root from the bass.

Per-string octave names use canonical sharp spelling (for example, A#3); chord-tone feedback uses the chord's degree-based spelling (Bb for C7). These represent the same pitch class.

## Architecture

| File | Responsibility |
| --- | --- |
| `src/theory/notes.ts` | Note/MIDI conversion, pitch-class normalization, duplicate removal |
| `src/theory/guitar.ts` | Standard tuning, fret-to-note calculation, fingering parsing/formatting |
| `src/theory/chords.ts` | Interval definitions, spelling, expected sets, matching, comparison |
| `src/exercises.ts` | Starting shapes and target chord definitions |
| `src/state.ts` | Immutable editing, reset/load, sequential and random exercise state |
| `src/main.ts` | DOM rendering, interactions, live feedback, session progress |
| `src/style.css` | Responsive layout and fretboard appearance |
| `tests/` | Theory, known shapes, alternate voicings, ambiguities, exercise/state tests |

All theory modules are pure TypeScript with no DOM or browser dependencies. Fingerings use six values in low-to-high string order: `null` is muted, `0` is open, and positive integers are frets. Compact single-digit notation and space-separated notation for higher frets are supported: `x x 10 12 11 10`.

## Future audio input

Feed detected integer MIDI notes or pitch classes into the same API:

```ts
import { analyzePitchClasses } from './src/theory/chords';

const result = analyzePitchClasses(
  [50, 57, 61, 66], // D3, A3, C#4, F#4; pitch classes [2, 9, 1, 6] also work
  { root: 'D', quality: 'major7' },
);

result.candidates;          // All exact supported matches; target first when matched
result.comparison?.correct; // true
result.comparison?.missing; // []
result.comparison?.extra;   // []
```

`analyzePitchClasses(notes, target?)` accepts an iterable of integers, normalizes octave differences, and collapses duplicates. Omit the target for identification only. Audio capture, frequency-to-note conversion, polyphonic detection, confidence filtering, and time smoothing belong in a future input adapter **before** this boundary. Raw frequencies and fractional MIDI values are not accepted by this deterministic engine.

## Publishing with GitHub Pages

Source repository: [SteveTack/GuitarChordQuiz](https://github.com/SteveTack/GuitarChordQuiz).

In the repository's **Settings → Pages → Build and deployment**, choose **GitHub Actions** as the source. The workflow in `.github/workflows/deploy.yml` installs the locked dependencies, runs all tests, builds the site, and publishes `dist/`. It runs on pushes to `main` and can also be started manually from the Actions tab. Deployment only runs after the build and tests pass.

`vite.config.ts` uses `/GuitarChordQuiz/` for production builds and previews, and `/` for local development. If the repository name changes or you switch to a custom domain, update the production base path there. The header icon uses Vite's base URL so it works in both locations.

To publish future edits from this folder:

```powershell
npm test
npm run build
git add .
git commit -m "Describe your change"
git push
```

The `.gitignore` excludes installed dependencies, generated builds, logs, and local environment files. Only the source, tests, documentation, configuration, and dependency lockfile belong in the repository. No remote repository or deployment is required for local practice.
