const allowedMediaTypes = new Set([
  "application/pdf", "text/plain", "text/vtt", "application/x-subrip",
  "image/jpeg", "image/png", "image/webp"
]);

export const maximumUploadBytes = 15 * 1024 * 1024;

export function validateUpload(file: Pick<File, "name" | "type" | "size">): void {
  if (file.size <= 0) throw new Error("UPLOAD_EMPTY: file is empty");
  if (file.size > maximumUploadBytes) throw new Error("UPLOAD_TOO_LARGE: maximum size is 15 MB");
  if (!allowedMediaTypes.has(file.type)) throw new Error("UPLOAD_TYPE_BLOCKED: unsupported file type");
  if (/[\\/\0]/.test(file.name)) throw new Error("UPLOAD_NAME_INVALID: filename contains path characters");
}

