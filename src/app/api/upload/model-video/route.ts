import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireSession } from "@/lib/adminAuth";

const ALLOWED_TYPES = ["video/mp4", "video/webm"];
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  // @vercel/blob client upload sends two request types:
  // 1. "blob.generate-client-token" — browser asks for an upload token
  // 2. "blob.upload-completed"       — blob notifies us the upload finished
  const body = await req.json() as HandleUploadBody;

  const sessionOrResponse = await requireSession(req);
  if (sessionOrResponse instanceof NextResponse) return sessionOrResponse;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate file type from the pathname extension
        const ext = pathname.split(".").pop()?.toLowerCase();
        const mimeType = ext === "webm" ? "video/webm" : "video/mp4";
        if (!ALLOWED_TYPES.includes(mimeType)) {
          throw new Error("Only .mp4 and .webm files are allowed");
        }
        return {
          maximumSizeInBytes: MAX_BYTES,
          allowedContentTypes: ALLOWED_TYPES,
        };
      },
      onUploadCompleted: async () => {
        // Nothing to do — the client reads the URL from the upload() response
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
