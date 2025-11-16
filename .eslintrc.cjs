/**
 * Basis ESLint-Konfiguration für TypeScript + Vite/Phaser Projekt
 * Kann später erweitert werden (z.B. Prettier-Integration, Jest/Playwright Overrides)
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    // Projekt-spezifische Feinjustierung
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'no-console': ['warn', { allow: ['warn', 'error', 'log'] }],
  },
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'public/',
    '**/*.d.ts'
  ],
  overrides: [
    {
      files: ['**/__tests__/**', '**/*.spec.ts'],
      env: { jest: true },
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
