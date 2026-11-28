import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts", "**/*.prop.test.ts"],
    testTimeout: 30000,
  },
});
