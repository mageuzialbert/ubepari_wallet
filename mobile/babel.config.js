module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated v4 ships its worklets plugin via the separate
    // react-native-worklets package.
    plugins: ["react-native-worklets/plugin"],
  };
};
