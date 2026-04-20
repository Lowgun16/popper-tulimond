// src/lib/__mocks__/db.ts
// Jest manual mock — prevents db.ts from throwing when DATABASE_URL is absent in tests.
export const sql = jest.fn().mockResolvedValue([]);
