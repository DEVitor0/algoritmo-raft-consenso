import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/packages/dashboard/public/**',
      'core/**',
      'raftNode/**',
      'machineDiscovery/**',
      'lb/**',
      'moduleAlias.mjs',
      'packages/dashboard/vite.config.js',
    ],
  },
  js.configs.recommended,
  prettier,
];
