import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface StoredObject { uri: string; byteSize: number }

export async function storePrivateObject(content: Uint8Array, extension = "bin"): Promise<StoredObject> {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const storageRoot = path.join(process.cwd(), "storage", "private");
  await mkdir(storageRoot, { recursive: true, mode: 0o700 });
  const filename = `${randomUUID()}.${safeExtension}`;
  const target = path.join(storageRoot, filename);
  if (!target.startsWith(`${storageRoot}${path.sep}`)) throw new Error("STORAGE_PATH_BLOCKED");
  await writeFile(target, content, { mode: 0o600, flag: "wx" });
  return { uri: `private://${filename}`, byteSize: content.byteLength };
}

export async function readPrivateObject(uri:string):Promise<Uint8Array>{if(!uri.startsWith("private://"))throw new Error("STORAGE_URI_BLOCKED: expected a private object URI");const filename=uri.slice("private://".length);if(!/^[a-f0-9-]+\.[a-z0-9]{1,8}$/i.test(filename))throw new Error("STORAGE_PATH_BLOCKED: invalid private object name");const storageRoot=path.join(process.cwd(),"storage","private");const target=path.join(storageRoot,filename);if(!target.startsWith(`${storageRoot}${path.sep}`))throw new Error("STORAGE_PATH_BLOCKED");return new Uint8Array(await readFile(target));}
