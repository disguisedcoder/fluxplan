import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Playwright fixtures use `use` from @playwright/test — not React hooks.
  {
    files: ["tests/**/*.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright artifacts (would otherwise lint bundled trace viewer JS)
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
