import { NextResponse } from "next/server";
import { getCurrentDrop } from "@/lib/drops";

export async function GET() {
  try {
    const drop = await getCurrentDrop();
    return NextResponse.json({ drop });
  } catch (err) {
    console.error("[active-drop]", err);
    return NextResponse.json({ drop: null });
  }
}
