module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/tests/style-mock.cjs',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^antd/es/(.*)$': 'antd/lib/$1',
  },
  transform: {
    '^.+\\.tsx?$': '<rootDir>/tests/typescript-transformer.cjs',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
};
