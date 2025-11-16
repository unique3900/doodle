import { fixupConfigRules } from "@eslint/compat";
import next from "@next/eslint-plugin-next";
import globals from "globals";
import tseslint from "typescript-eslint";

import baseConfig from "./base.js";
import flatCompat from "./compat.js";

const nextConfig = /** @type {import("eslint").Linter.Config[]} */ (
  fixupConfigRules(
    /** @type {import("@eslint/compat").FixupConfigArray} */
    (flatCompat.config(next.configs["core-web-vitals"])),
  )
);

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  ...nextConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        JSX: true,
        React: true,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      next,
    },
    rules: {
      // Next.js specific rules
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      // TypeScript specific rules
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-definitions": "off",

      "@typescript-eslint/consistent-type-imports": [
        "warn",
        {
          fixStyle: "inline-type-imports",
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/no-empty-function": "off",

      // Import/Export rules
      "import/no-default-export": "off",
      "import/prefer-default-export": "off",

      "react/display-name": "off",
      "react/prop-types": "off",
      // React specific rules
      "react/react-in-jsx-scope": "off",
    },
    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
        typescript: {
          alwaysTryTypes: true,
          project: ["./tsconfig.json"],
        },
      },
      react: {
        version: "detect",
      },
    },
  },
];
