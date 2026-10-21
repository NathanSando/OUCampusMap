// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-maps has no web implementation; web bundles get a tile-map stand-in.
const mapsWebShim = path.resolve(__dirname, 'src/shims/react-native-maps.web.tsx');
const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'sourceFile', filePath: mapsWebShim };
  }
  return (upstreamResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
