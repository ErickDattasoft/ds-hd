import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'coverage/**', '*.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Scripts de build/migración/docs: se ejecutan en terminal, console es su salida normal.
    files: ['scripts/**/*.{ts,mjs,js}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // JS de cliente servido al navegador.
    files: ['src/assets/js/**/*.js'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Las capas de dominio y aplicación no deben importar frameworks ni infraestructura.
    files: ['src/core/**/*.ts', 'src/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['express', 'nunjucks', 'firebase-admin', 'helmet', 'pino*'], message: 'core/application no deben depender de frameworks ni infraestructura (DIP).' },
            { group: ['../infrastructure/*', '**/infrastructure/*'], message: 'core/application dependen de core/ports, no de infrastructure (DIP).' },
            { group: ['../interfaces/*', '**/interfaces/*'], message: 'core/application no dependen de la capa de entrega.' },
          ],
        },
      ],
    },
  },
);
