const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'gpx'],
  },
  maxWorkers: 2,
  resetCache: false,
  cacheVersion: '1',
};

module.exports = mergeConfig(defaultConfig, config);