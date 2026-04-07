// src/app/api/builder/structural-edit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const EDIT_INSTRUCTIONS: Record<string, { increase: string; decrease: string }> = {
  "placket-width": {
    increase: "Widen the V-neckline placket opening so the two fabric panels fall further apart, exposing more chest. Keep all other garment details identical.",
    decrease: "Narrow the V-neckline placket opening so the two fabric panels are closer together. Keep all other garment details identical.",
  },
  "neckline-depth": {
    increase: "Deepen the neckline so the V-opening extends further down the chest. Keep the placket panel width and all other details identical.",
    decrease: "Raise the neckline so the V-opening is shallower and sits higher on the chest. Keep all other details identical.",
  },
  "sleeve-length": {
    increase: "Extend the sleeves so they reach closer to the elbow. The sleeve should remain tight-fitting against the arm with no air gap. Keep all other details identical.",
    decrease: "Shorten the sleeves so they end higher on the upper arm. Keep the tight sleeve compression and all other details identical.",
  },
  "sleeve-compression": {
    increase: "Make the sleeves hug the arm more tightly from shoulder to hem with zero gap between fabric and skin. Keep sleeve length and all other details identical.",
    decrease: "Slightly relax the sleeve fit so there is a small amount of ease between fabric and arm. Keep sleeve length and all other details identical.",
  },
};

export async function POST(req: NextRequest) {
  let body: { imageBase64: string; editType: string; direction: string; styleReferenceBase64?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageBase64, editType, direction, styleReferenceBase64 } = body;

  const instruction = EDIT_INSTRUCTIONS[editType]?.[direction as "increase" | "decrease"];
  if (!instruction) {
    return NextResponse.json({ ok: false, error: `Unknown editType/direction: ${editType}/${direction}` }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "GOOGLE_API_KEY not set" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    const parts: object[] = [
      { inlineData: { data: imageBase64, mimeType: "image/png" } },
      { text: `You are a garment image editor. Apply exactly this change to the garment in the image: ${instruction} Do not change the model, background, lighting, fabric texture, or color. Output only the edited image.` },
    ];

    if (styleReferenceBase64) {
      parts.unshift(
        { text: "Style reference (use this as a guide for what this garment should look like):" },
        { inlineData: { data: styleReferenceBase64, mimeType: "image/png" } }
      );
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: parts as any }],
      generationConfig: { responseModalities: ["image", "text"] } as any,
    });

    const candidate = result.response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((p: any) => p.inlineData);
    if (!imagePart) {
      return NextResponse.json({ ok: false, error: "Gemini returned no image" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, imageBase64: (imagePart as any).inlineData.data });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
