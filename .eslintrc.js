module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    project: './tsconfig.eslint.json',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'import',
        format: ['camelCase', 'PascalCase'],
      },
    ],
    '@typescript-eslint/semi': 'warn',
    curly: 'warn',
    eqeqeq: 'warn',
    'no-throw-literal': 'warn',
    semi: 'off',
  },

  // dot files are ignored by default, `'!.*'` enables linting of dot files
  ignorePatterns: ['out', 'dist', '**/*.d.ts', '!.*'],

  extends: [
    // sets up both `eslint-plugin-prettier` and `eslint-config-prettier`
    // should be the last item in the `extends` array
    'plugin:prettier/recommended',
  ],
};
