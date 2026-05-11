import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSession } from "@/lib/adminAuth";

const ALLOWED_TYPES = ["video/mp4", "video/webm"];
const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const modelId = formData.get("modelId") as string | null;

  if (!file || !modelId) {
    return NextResponse.json({ error: "file and modelId are required" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only .mp4 and .webm files are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 200 MB limit" }, { status: 400 });
  }

  const ext = file.type === "video/webm" ? "webm" : "mp4";
  try {
    const blob = await put(`models/${modelId}/${Date.now()}.${ext}`, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[upload/model-video] put() failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
