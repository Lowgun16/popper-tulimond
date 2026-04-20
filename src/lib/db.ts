// src/lib/db.ts
// DATABASE_URL is required at runtime. At build time it may be absent —
// neon does not connect until a query is actually executed, so this is safe.
import { neon } from "@neondatabase/serverless";

export const sql = neon(
  process.env.DATABASE_URL ?? "postgresql://localhost/placeholder"
);
