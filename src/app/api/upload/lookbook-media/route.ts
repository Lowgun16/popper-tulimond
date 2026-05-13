import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireSession } from "@/lib/adminAuth";

const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const sessionOrResponse = await requireSession(req);
    if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const outfitItemId = formData.get("outfitItemId") as string | null;

    if (!file || !outfitItemId) {
      return NextResponse.json({ error: "file and outfitItemId are required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" not allowed. Use .jpg, .png, .webp, .mp4, or .webm.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File exceeds 200 MB limit" }, { status: 400 });
    }

    const extMap: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const ext = extMap[file.type];
    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    // Let the SDK read BLOB_READ_WRITE_TOKEN from env automatically
    const blob = await put(
      `lookbook/${outfitItemId}/${Date.now()}.${ext}`,
      file,
      { access: "public" }
    );
    return NextResponse.json({ url: blob.url, type: mediaType });

  } catch (err) {
    console.error("[upload/lookbook-media]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
