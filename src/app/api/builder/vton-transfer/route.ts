// src/app/api/builder/vton-transfer/route.ts
// Default: IDM-VTON on Hugging Face Spaces (free).
// Set VTON_PROVIDER=replicate in .env.local to switch to paid Replicate.
import { NextRequest, NextResponse } from "next/server";

const HF_BASE = "https://yisol-idm-vton.hf.space";
const REPLICATE_URL = "https://api.replicate.com/v1/predictions";
const REPLICATE_MODEL = "cuuupid/idm-vton:906425dbca90663ff5427624839572cc56ea7d380343d13e2a4c4b09d3f0c30f";

async function uploadToHF(base64: string, filename: string): Promise<string> {
  const blob = Buffer.from(base64, "base64");
  const formData = new FormData();
  formData.append("files", new Blob([blob], { type: "image/png" }), filename);
  const res = await fetch(`${HF_BASE}/upload`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`HF upload failed: ${res.status}`);
  const json = await res.json();
  // Returns array of paths
  const path: string = Array.isArray(json) ? json[0] : json;
  return path;
}

function fileData(path: string, name: string) {
  return { path, orig_name: name, meta: { _type: "gradio.FileData" } };
}

async function runHuggingFace(
  personBase64: string,
  garmentBase64: string
): Promise<string> {
  // Step 1: upload both images
  const [personPath, garmentPath] = await Promise.all([
    uploadToHF(personBase64, "person.png"),
    uploadToHF(garmentBase64, "garment.png"),
  ]);

  // Step 2: call the /tryon endpoint
  const response = await fetch(`${HF_BASE}/run/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fn_index: 0,
      data: [
        // EditorData (background image, no layers)
        { background: fileData(personPath, "person.png"), layers: [], composite: null },
        // Garment FileData
        fileData(garmentPath, "garment.png"),
        "Upper body garment",
        true,  // is_checked (auto mask)
        false, // is_checked_crop
        30,    // denoise_steps
        42,    // seed
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HF API error ${response.status}: ${text.slice(0, 300)}`);
  }

  const json = await response.json();
  // Returns FileData objects; fetch the result image URL
  const resultFile = json.data?.[0];
  if (!resultFile) throw new Error("HF returned empty data");

  const imageUrl: string = resultFile.url ?? `${HF_BASE}/file=${resultFile.path}`;
  const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30_000) });
  if (!imgRes.ok) throw new Error(`Failed to fetch result image: ${imgRes.status}`);
  const buf = await imgRes.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}

async function runReplicate(
  personBase64: string,
  garmentBase64: string
): Promise<string> {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) throw new Error("REPLICATE_API_KEY not set");

  const createRes = await fetch(REPLICATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL,
      input: {
        human_img: `data:image/png;base64,${personBase64}`,
        garm_img: `data:image/png;base64,${garmentBase64}`,
        garment_des: "Upper body garment",
        is_checked: true,
        is_checked_crop: true,
        denoise_steps: 30,
        seed: 42,
      },
    }),
  });
  const prediction = await createRes.json();

  // Poll until complete (max 60s)
  const predictionId: string = prediction.id;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${REPLICATE_URL}/${predictionId}`, {
      headers: { Authorization: `Token ${apiKey}` },
    });
    const poll = await pollRes.json();
    if (poll.status === "succeeded") {
      const imgUrl: string = Array.isArray(poll.output) ? poll.output[0] : poll.output;
      const imgRes = await fetch(imgUrl);
      const buf = await imgRes.arrayBuffer();
      return Buffer.from(buf).toString("base64");
    }
    if (poll.status === "failed") throw new Error(`Replicate failed: ${poll.error}`);
  }
  throw new Error("Replicate prediction timed out after 60s");
}

export async function POST(req: NextRequest) {
  let body: { personBase64: string; garmentBase64: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { personBase64, garmentBase64 } = body;
  if (!personBase64 || !garmentBase64) {
    return NextResponse.json({ ok: false, error: "personBase64 and garmentBase64 required" }, { status: 400 });
  }

  try {
    const provider = process.env.VTON_PROVIDER ?? "huggingface";
    const resultBase64 =
      provider === "replicate"
        ? await runReplicate(personBase64, garmentBase64)
        : await runHuggingFace(personBase64, garmentBase64);

    return NextResponse.json({ ok: true, imageBase64: resultBase64 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
