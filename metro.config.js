const { getDefaultConfig } = require('metro-config'); 
const { withNativeWind } = require('nativewind/metro');

const defaultConfig = (async () => await getDefaultConfig())();

module.exports = withNativeWind({
  resolver: defaultConfig.resolver,
  transformer: defaultConfig.transformer,
}, { input: './global.css' });
