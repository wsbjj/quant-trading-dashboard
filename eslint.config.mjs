import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "prisma/dev.db",
      "prisma/dev.db-journal",
      "tsconfig.tsbuildinfo",
    ],
  },
];

export default eslintConfig;
