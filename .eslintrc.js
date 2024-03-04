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
    '@typescript-eslint/semi': 'warn',
    curly: 'warn',
    eqeqeq: 'warn',
    'no-throw-literal': 'warn',
    semi: 'off',
  },

  // dot files are ignored by default, `'!.*'` enables linting of dot files
  ignorePatterns: ['out', 'dist', '**/*.d.ts', '!.*'],

  extends: [
    'plugin:@typescript-eslint/strict-type-checked',

    // sets up both `eslint-plugin-prettier` and `eslint-config-prettier`
    // should be the last item in the `extends` array
    'plugin:prettier/recommended',
  ],

  overrides: [
    // // disable type-aware linting for JavaScript files
    // // https://typescript-eslint.io/linting/typed-linting/#how-can-i-disable-type-aware-linting-for-a-subset-of-files
    // // or use jsdoc type annotations to add type information to js files where needed
    // {
    //   extends: ['plugin:@typescript-eslint/disable-type-checked'],
    //   files: ['./**/*.{js,mjs}'],
    // },
    {
      files: ['./src/**/*'],
      rules: {
        '@typescript-eslint/naming-convention': [
          'error',
          {
            selector: 'default',
            format: ['strictCamelCase', 'StrictPascalCase'],
          },
          {
            selector: ['classMethod', 'classProperty'],
            format: ['strictCamelCase', 'StrictPascalCase'],
            leadingUnderscore: 'allow',
          },
        ],
      },
    },
  ],
};
