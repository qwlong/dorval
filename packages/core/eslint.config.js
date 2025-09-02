import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.eslint.json'
      },
      globals: {
        ...globals.node,
        ...globals.es2020,
        HandlebarsTemplateDelegate: 'readonly',
        BufferEncoding: 'readonly',
        Buffer: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      'no-console': 'off', // Allow console for development/debugging
      'no-unused-vars': 'off', // Use @typescript-eslint/no-unused-vars instead
      'no-useless-escape': 'off' // Allow escape sequences in regex patterns
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', '*.js', '*.d.ts', 'coverage/**', 'eslint.config.js', 'src/templates/**']
  }
];