// Importing the 'os' module
const os = require('os');

// Checking if the operating system is Windows
const isWin = os.platform() === 'win32';

// If it's Windows, define an object with ESLint rule patches
const winEsLintPatch = isWin ? {
  'import/no-unresolved': [2, { caseSensitive: false }],
  'linebreak-style': 0,
} : null;

/**
 * ESLint configuration for the project.
 *
 * @type {import("eslint").Linter.Config}
 */
module.exports = {
  // Using '@babel/eslint-parser' as the parser
  parser: '@babel/eslint-parser',

  // Extending from the 'airbnb/base' configuration
  extends: [
    'airbnb/base',
  ],

  // Defining custom rules for ESLint
  rules: {
    'max-len': [2, 120], // Maximum line length of 120 characters
    'no-underscore-dangle': 0, // Allowing variable names with underscore
    'class-methods-use-this': 0, // Allowing class methods without 'this'
    'import/prefer-default-export': 0, // Disabling the preference for default exports
    'template-curly-spacing': 'off', // Disabling template curly spacing rule
    'no-plusplus': 'off', // Disabling the use of increment/decrement operators
    ...winEsLintPatch, // Merging Windows-specific ESLint rule patches
  },

  // Declaring global variables
  globals: {},

  // Defining the environment for ESLint
  env: {
    es2020: true, // Specifying environment as ES2020
  },
};
