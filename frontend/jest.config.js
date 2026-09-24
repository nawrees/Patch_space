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
  // lcov is what SonarCloud (sonar.javascript.lcov.reportPaths) actually reads.
  coverageReporters: ['html', 'lcov', 'text-summary'],
};
