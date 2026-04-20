// src/lib/__tests__/db.test.ts
// We can't test the actual Neon connection in unit tests.
// We verify the module exports the expected shape.

describe("db module", () => {
  it("exports a sql tagged template function", () => {
    // Mock the env var so the module doesn't throw during import
    process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sql } = require("../db");
    expect(typeof sql).toBe("function");
  });
});
