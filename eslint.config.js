import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// Rules shared by both tracks. `null: "ignore"` permits `x != null`, the one
// loose comparison that is deliberate: it catches null and undefined together,
// which is what an omitted React prop needs (see maxCount in Input/Textarea).
const shared = {
  "no-unused-vars": "warn",
  "no-console": "off",
  eqeqeq: ["error", "always", { null: "ignore" }],
  "prefer-const": "error"
};

export default [
  {
    ignores: ["node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    },
    rules: shared
  },

  // The React track. Without eslint-plugin-react every component referenced
  // only from JSX reads as unused, and without eslint-plugin-react-hooks the
  // exhaustive-deps suppression in Menu.jsx has no rule to suppress.
  { ...react.configs.flat.recommended, files: ["**/*.jsx"] },
  {
    files: ["**/*.jsx"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser
      }
    },
    // react is not a dependency here (these files are source to copy, nothing
    // builds them), so the version can't be detected and is named instead.
    settings: { react: { version: "19.0" } },
    rules: {
      ...shared,
      // Modern JSX transform: no React import, and props are documented in the
      // header comment rather than with prop-types.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      // The two long-standing hook rules only. react-hooks v7's recommended set
      // also turns on the React Compiler rules (set-state-in-effect, refs,
      // immutability); those police patterns this codebase uses deliberately
      // and correctly outside the compiler, such as writing a ref from an event
      // handler. Revisit them together if the compiler is ever adopted.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
];
