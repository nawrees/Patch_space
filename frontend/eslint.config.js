// @ts-check
const eslint = require("@eslint/js");
const { defineConfig } = require("eslint/config");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = defineConfig([
  {
    files: ["**/*.ts"],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "app",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "app",
          style: "kebab-case",
        },
      ],
      // This codebase consistently uses NgModules + constructor injection +
      // *ngIf/*ngFor, which is valid, supported Angular — not a bug. These
      // rules only flag "not the newest Angular idiom," so enforcing them
      // here would mean rewriting ~700 call sites as a side effect of
      // wiring up CI, not catching real issues.
      "@angular-eslint/prefer-inject": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/prefer-for-of": "off",
      // Rare enough to be worth a nudge without failing CI over it.
      "@typescript-eslint/no-empty-function": "warn",
      // Same underscore-prefix convention as the backend eslint.config.js,
      // for cases like a route guard's required-by-signature unused args.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {
      "@angular-eslint/template/prefer-control-flow": "off",
      "@angular-eslint/template/click-events-have-key-events": "warn",
      "@angular-eslint/template/interactive-supports-focus": "warn",
      "@angular-eslint/template/label-has-associated-control": "warn",
      // Only used on a form input inside a slide-out panel that opens in
      // response to a click (not on page load) — the legitimate case for
      // autofocus, not the anti-pattern this rule targets.
      "@angular-eslint/template/no-autofocus": "warn",
    },
  }
]);
