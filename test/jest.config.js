/**
 * Runs the TypeScript tests in this folder against the mobile app's code.
 * From the repo root: npx jest -c test/jest.config.js
 * (Paths are mapped directly so this doesn't depend on node_modules workspace symlinks.)
 */
const path = require('path');

const root = path.resolve(__dirname, '..');
const mobileJest = require(path.join(root, 'apps/mobile/jest.config.js'));

/** @type {import('jest').Config} */
module.exports = {
  ...mobileJest,
  rootDir: root,
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    '^@ou-campus-map/shared-types$': '<rootDir>/packages/shared-types/src/index.ts',
    '^@/(.*)$': '<rootDir>/apps/mobile/src/$1',
  },
};
