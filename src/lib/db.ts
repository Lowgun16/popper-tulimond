// src/lib/db.ts
// Lazy singleton — neon() is not called until the first query executes.
// This allows Vercel to build without DATABASE_URL set at build time.
import { neon } from "@neondatabase/serverless";

let _instance: ReturnType<typeof neon> | undefined;

function getInstance(): ReturnType<typeof neon> {
  if (!_instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _instance = neon(process.env.DATABASE_URL);
  }
  return _instance;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<any[]> {
  const result = await getInstance()(strings, ...values);
  return result as unknown as any[];
}
