const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@opentelemetry/api": path.resolve(__dirname, "src/lib/supabase/otelStub.js"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
