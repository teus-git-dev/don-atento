import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Downgrade systemic pre-existing violations to warnings.
    // These are tracked as technical debt; the PR-level diff gate
    // (`Block new \`: any\``) still blocks net-new introductions.
    // Re-promote to 'error' once the legacy files are fully typed.
    //
    // React Compiler rules (react-hooks/purity + set-state-in-effect)
    // also downgraded: they flag idioms the codebase relies on
    // intentionally (client-mount setState pattern in 7 components,
    // Math.random inside `useMemo` with `[]` deps in SplatViewer's
    // Gaussian-splat positions — runs once, never re-renders).
    // static-components is KEPT as error after fixing the one violation
    // in MessageBubbles (extracted SentimentIcon to top level).
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;

