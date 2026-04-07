// src/app/api/builder/auth/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  let body: { password: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const expected = process.env.BUILDER_PASSWORD;
  if (!expected) {
    // No password set — allow access (dev convenience)
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: body.password === expected });
}
