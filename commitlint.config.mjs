import defaults from '@commitlint/config-conventional';

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // https://commitlint.js.org/reference/rules.html#type-enum
    'type-enum': [
      2,
      'always',
      [...defaults.rules['type-enum'][2], 'config'].sort(),
    ],
  },
};
