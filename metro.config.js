const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Zustand's ESM build references `import.meta.env` (for Redux DevTools
// detection), which Metro's web bundle output can't parse since it isn't
// loaded as a real ES module. Force zustand to resolve via the "react-native"
// export condition (its plain CommonJS build) on every platform, which has
// no import.meta reference and is already what native resolves to anyway.
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ['require', 'react-native', 'default'] },
      moduleName,
      platform
    );
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
