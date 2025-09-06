module.exports = {
  preset: 'react-native',
  setupFiles: [],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    "node_modules/(?!(@react-navigation|@react-native|@expo|react-native)/)",
  ],
};
