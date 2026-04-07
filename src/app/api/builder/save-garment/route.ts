// src/app/api/builder/save-garment/route.ts
// Writes an approved Garment Truth PNG to /public/garments/
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  let body: {
    imageBase64: string;
    name: string;
    sku: string;
    fabricComposition: string;
    availableSizes: string[];
    version: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { imageBase64, name, sku, version } = body;
  if (!imageBase64 || !name || !sku) {
    return NextResponse.json({ ok: false, error: "imageBase64, name, and sku required" }, { status: 400 });
  }

  try {
    const garmentDir = path.join(process.cwd(), "public", "garments");
    fs.mkdirSync(garmentDir, { recursive: true });

    const slug = sku.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `${slug}-v${version}.png`;
    const filePath = path.join(garmentDir, filename);

    const buf = Buffer.from(imageBase64, "base64");
    fs.writeFileSync(filePath, buf);

    const imagePath = `/garments/${filename}`;
    return NextResponse.json({ ok: true, imagePath });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
