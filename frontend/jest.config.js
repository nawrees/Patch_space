// @ts-check

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  // Coverage is off by default for a fast local `npm test` loop - CI/SonarCloud
  // use `npm run test:coverage` instead, which turns this on via --coverage.
  collectCoverage: false,
  coverageDirectory: 'coverage',
  // lcovonly writes just coverage/lcov.info, the machine-readable file
  // SonarCloud (sonar.javascript.lcov.reportPaths) actually reads - no
  // separate 'html' entry needed, since the plain 'lcov' reporter type
  // already generates an HTML report internally alongside lcov.info,
  // which is what was crashing (a synthetic Angular template sourceURL
  // path Istanbul's HTML writer couldn't turn into a valid file path).
  coverageReporters: ['lcovonly', 'text-summary'],
};
