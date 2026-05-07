import { NextResponse } from "next/server";
import { getMemberSession } from "@/lib/memberAuth";

export async function GET() {
  const session = await getMemberSession();
  if (!session) return NextResponse.json({ memberId: null });
  return NextResponse.json({ memberId: session.memberId });
}
