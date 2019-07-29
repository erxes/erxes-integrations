module.exports = {
  roots: ['<rootDir>/src/__tests__'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testRegex: '/__tests__/.*\\.(ts|js)$',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  modulePathIgnorePatterns: ['setup.ts'],
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.json'
    }
  }
};
