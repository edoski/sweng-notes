// eslint.config.mjs
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";

// Plugins that Next's legacy configs rely on:
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint"; // parser + plugin + flat presets

// Node 20+ provides import.meta.dirname; if you prefer, keep your __dirname code.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  // Sensible JS defaults; flat-config style
  js.configs.recommended,

  // Bring in Next's legacy shareable configs under flat config
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Register the plugins those legacy configs reference
  {
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      "@typescript-eslint": tseslint.plugin,
    },
  },

  // Ensure TS files parse correctly (no type-aware project required)
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
    settings: {
      react: { version: "detect" },
    },
  },

  // Your ignores (kept intact)
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "convex/_generated/**",
    ],
  },
];

export default config;
