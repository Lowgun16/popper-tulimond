// src/app/api/builder/save-render/route.ts
// Writes an approved character render PNG to /public/renders/
// Also logs correction entries if provided.
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { CorrectionLogEntry } from "@/components/builder/builderTypes";

export async function POST(req: NextRequest) {
  let body: {
    imageBase64: string;
    characterId: string;
    garmentId: string;
    corrections?: CorrectionLogEntry[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { imageBase64, characterId, garmentId, corrections } = body;
  if (!imageBase64 || !characterId || !garmentId) {
    return NextResponse.json({ ok: false, error: "imageBase64, characterId, garmentId required" }, { status: 400 });
  }

  try {
    const renderDir = path.join(process.cwd(), "public", "renders");
    fs.mkdirSync(renderDir, { recursive: true });

    const timestamp = Date.now();
    const filename = `${characterId}-${garmentId}-${timestamp}.png`;
    const filePath = path.join(renderDir, filename);
    fs.writeFileSync(filePath, Buffer.from(imageBase64, "base64"));

    // Append correction log if provided
    if (corrections && corrections.length > 0) {
      const logDir = path.join(process.cwd(), "src", "data");
      const logPath = path.join(logDir, "correctionLog.json");
      let existing: CorrectionLogEntry[] = [];
      if (fs.existsSync(logPath)) {
        try { existing = JSON.parse(fs.readFileSync(logPath, "utf-8")); } catch { /* ignore */ }
      }
      fs.writeFileSync(logPath, JSON.stringify([...existing, ...corrections], null, 2));
    }

    return NextResponse.json({ ok: true, imagePath: `/renders/${filename}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
