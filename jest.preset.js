const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  transform: {
    ...nxPreset.transform,
    '^.+\\.js$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [
    ...(nxPreset.transformIgnorePatterns ?? []),
    'node_modules/(?!.*@noble)',
  ],
};
