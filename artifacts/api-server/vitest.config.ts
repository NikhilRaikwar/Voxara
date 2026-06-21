import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      // Keep pino quiet and avoid the pino-pretty worker thread during tests.
      NODE_ENV: "production",
      LOG_LEVEL: "silent",
      // isolateVocals() requires a key; tests mock fetch so it is never used.
      ELEVENLABS_API_KEY: "test-key",
    },
  },
});
