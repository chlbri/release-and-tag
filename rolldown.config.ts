import { defineConfig } from 'rolldown';

export default defineConfig({
  input: './src/main.ts',
  output: {
    file: 'lib/main.js',
    format: 'esm',
  },
  platform: 'node',
});
