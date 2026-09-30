const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    // Supabase Edge Functions run in Deno, which Metro's resolver does not model.
    ignores: ["dist/*", ".expo/*", "node_modules/*", "expo-env.d.ts", "uniwind-types.d.ts", "supabase/functions/*"],
  },
];
