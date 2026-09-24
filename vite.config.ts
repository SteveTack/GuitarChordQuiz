import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // GitHub project sites live under the repository name. Keep local development at /.
  base: command === 'build' || isPreview ? '/GuitarChordQuiz/' : '/',
}));
