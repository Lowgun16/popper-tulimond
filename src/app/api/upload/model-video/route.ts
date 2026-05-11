import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireSession } from "@/lib/adminAuth";

const ALLOWED_TYPES = ["video/mp4", "video/webm"];
const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  const body = await req.json() as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Auth check only runs for the browser's token request, not Vercel's completion callback
        const sessionOrResponse = await requireSession(req);
        if (sessionOrResponse instanceof NextResponse) {
          throw new Error("Unauthorized");
        }

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
        // No auth needed — this is called by Vercel Blob's servers, not the browser
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
