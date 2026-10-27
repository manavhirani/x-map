import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    // Older X API experiment routes; not used by the UI.
    files: ["app/api/x-api/**", "app/api/geocode/**"],
    rules: { "@typescript-eslint/no-explicit-any": "warn" },
  },
  { ignores: [".next/**", "out/**", "node_modules/**", "next-env.d.ts"] },
];

export default eslintConfig;
