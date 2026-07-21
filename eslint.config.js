import js from "@eslint/js";
import globals from "globals";

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
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      eqeqeq: "error",
      "prefer-const": "error"
    }
  }
];
