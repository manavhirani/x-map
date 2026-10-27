/** Server-only environment helpers. */

/** Treat empty values and the `.env.example` placeholders ("your_..._here") as "not set". */
function readSecret(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value && !/^your_.*_here$/.test(value)) return value;
  }
  return undefined;
}

/** xAI key for Grok. Without it, `/api/grok/breaking-news` serves sample data. */
export const getXaiApiKey = () => readSecret("XAI_API_KEY");

/** X API v2 bearer token. Without it, stories have no attached posts. */
export const getXBearerToken = () => readSecret("X_BEARER_TOKEN", "BEARER_TOKEN");
