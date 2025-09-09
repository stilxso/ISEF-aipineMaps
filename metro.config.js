const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  maxWorkers: 2,
  resetCache: false,
  cacheVersion: '1',
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);