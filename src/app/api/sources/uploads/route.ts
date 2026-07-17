import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { requestActor, apiError, clientAddress } from "@/http";
import { SourceInputService } from "@/ingestion/source-input-service";
import { enforceRateLimit, privacySafeClientKey } from "@/security/rate-limit";
import { validateUpload } from "@/security/uploads";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await enforceRateLimit(db(), `upload:${privacySafeClientKey(clientAddress(request))}`, 10, 3600);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("UPLOAD_REQUIRED: multipart field 'file' is required");
    validateUpload(file);
    const slugs = String(form.get("case_file_slugs") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const record = await new SourceInputService(db()).registerUpload(file, requestActor(request), slugs);
    return NextResponse.json(record, { status: 201 });
  } catch (error) { return apiError(error); }
}

