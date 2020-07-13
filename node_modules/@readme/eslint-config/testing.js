module.exports = {
  extends: ['plugin:jest/recommended', 'plugin:jest/style', 'plugin:jest-formatting/recommended'],
  plugins: ['import', 'jest', 'node', 'sonarjs'],
  env: {
    'jest/globals': true,
  },
  rules: {
    'import/no-extraneous-dependencies': 'off',

    'jest/consistent-test-it': 'warn',
    'jest/expect-expect': 'error',
    'jest/no-conditional-expect': 'error',
    'jest/no-deprecated-functions': 'off',
    'jest/no-disabled-tests': 'off',
    'jest/no-duplicate-hooks': 'warn',
    'jest/no-expect-resolves': 'warn',
    'jest/no-truthy-falsy': 'error',
    'jest/no-if': 'error',
    'jest/prefer-hooks-on-top': 'warn',
    'jest/prefer-strict-equal': 'error',
    'jest/prefer-todo': 'warn',
    'jest/require-to-throw-message': 'error',
    'jest/valid-describe': 'error',
    'jest/valid-title': 'warn',

    'node/no-extraneous-require': 'off',

    // Sniff out tests that have useless `async` declarations. Since there's valid usecases for
    // having a function be async and not return or await a Promise, we're only running this rule
    // for tests where such a case isn't likely to be a thing.
    'require-await': 'error',

    'sonarjs/no-identical-functions': 'off',
  },
};
