import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import sonarjs from "eslint-plugin-sonarjs";
import unusedImports from "eslint-plugin-unused-imports";
import vitest from "eslint-plugin-vitest";
import noOnlyTests from "eslint-plugin-no-only-tests";
import llmCore from "eslint-plugin-llm-core";
import humanFirst from "eslint-plugin-human-first";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "convex/_generated", "coverage", ".claude/worktrees", "node_modules"] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      jsxA11y.flatConfigs.recommended,
      sonarjs.configs.recommended,
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      prettier: prettier,
      "unused-imports": unusedImports,
      "no-only-tests": noOnlyTests,
      "llm-core": llmCore,
      "human-first": humanFirst,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "prettier/prettier": "error",

      // --- Unused code ---
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      // --- Type safety ---
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-non-null-assertion": "off",

      // --- No debugging artifacts ---
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",

      // --- Code quality ---
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-empty": "error",
      "sonarjs/cognitive-complexity": ["warn", 15],
      "sonarjs/no-duplicate-string": "error",
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-nested-template-literals": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/prefer-immediate-return": "error",

      // --- AI slop prevention (llm-core) - critical rules only ---
      "llm-core/no-async-array-callbacks": "error",
      "llm-core/no-empty-catch": "error",
      "llm-core/throw-error-objects": "error",
      "llm-core/prefer-early-return": "error",
      "llm-core/no-magic-numbers": "error",
      "llm-core/prefer-unknown-in-catch": "error",
      "llm-core/explicit-export-types": "error",
      "llm-core/no-commented-out-code": "error",
      "llm-core/structured-logging": "error",
      "llm-core/no-llm-artifacts": "error",
      "llm-core/no-type-assertion-any": "error",
      "llm-core/no-redundant-logic": "error",
      "llm-core/no-any-in-generic": "error",
      "llm-core/consistent-catch-param-name": "error",
      "llm-core/no-exported-function-expressions": "error",
      "llm-core/max-nesting-depth": "error",
      "llm-core/max-params": "error",
      "llm-core/max-function-length": "error",
    },

  },

  // React components naturally have more lines due to JSX
  {
    files: ["**/*.tsx"],
    rules: {
      "llm-core/max-function-length": ["error", { max: 150 }],
    },
  },

  // --- Test files ---
  {
    files: ["**/*.test.{ts,tsx}", "vitest.setup.ts"],
    plugins: {
      vitest: vitest,
      "no-only-tests": noOnlyTests,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "no-console": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-duplicate-string": "off",
      "llm-core/no-magic-numbers": "off",
      "llm-core/no-empty-catch": "off",
      "llm-core/prefer-early-return": "off",
      "llm-core/explicit-export-types": "off",
      "llm-core/no-commented-out-code": "off",
      "llm-core/throw-error-objects": "off",
      "llm-core/consistent-exports": "off",
      "llm-core/no-async-array-callbacks": "off",
      "llm-core/prefer-unknown-in-catch": "off",
      "llm-core/structured-logging": "off",
      "human-first/no-comments": "off",
      "human-first/no-magic-numbers": "off",
      "max-params": "off",
      "max-lines-per-function": "off",
      "max-lines": "off",
      "vitest/no-focused-tests": "error",
      "vitest/consistent-test-it": ["warn", { fn: "it" }],
      "no-only-tests/no-only-tests": "error",
    },
  },

  eslintConfigPrettier
);
