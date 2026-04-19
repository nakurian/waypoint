module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 30000,
  // Same NodeNext .js → .ts mapper as transform-core (see Task 5).
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }
};
