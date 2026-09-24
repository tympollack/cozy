import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "max-lines": [
        "warn",
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "warn",
        {
          max: 150,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: true,
        },
      ],
    },
  },
  {
    files: ["app/**/page.tsx"],
    rules: {
      "max-lines": [
        "error",
        {
          max: 300,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: [
      "app/actions/groupActions.ts",
      "app/actions/notificationActions.ts",
      "app/camera/page.tsx",
      "app/settings/page.tsx",
      "components/ProfileShell.tsx",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**",
  ]),
]);

export default eslintConfig;
