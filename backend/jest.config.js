module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/unit/'], // run by jest.unit.config.js
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
