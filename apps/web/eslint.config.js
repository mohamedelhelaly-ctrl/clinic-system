import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // The domain layer must stay framework-free so it can move to the backend unchanged.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'react',
            'react-dom',
            '../data/*',
            '../demo/*',
            '../features/*',
            '../components/*',
          ],
        },
      ],
    },
  },
  {
    // Only the app entry and the demo layer may import from src/demo; features must not.
    files: ['src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', 'src/data/**/*.{ts,tsx}'],
    ignores: ['src/data/mock/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['**/demo/*', '**/demo'] }],
    },
  },
);
