import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

async function uploadToBunny(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const apiKey = process.env.BUNNY_API_KEY!;
  const storageZone = process.env.BUNNY_STORAGE_ZONE!;
  const cdnUrl = process.env.BUNNY_CDN_URL!;

  const response = await fetch(
    `https://storage.bunnycdn.com/${storageZone}/${filename}`,
    {
      method: "PUT",
      headers: {
        AccessKey: apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array(buffer),
    },
  );

  if (!response.ok) {
    throw new Error(`Bunny upload failed: ${response.statusText}`);
  }

  return `${cdnUrl}/${filename}`;
}

async function uploadToFilesystem(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const uploadsDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filePath = join(uploadsDir, filename);
  await writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

export async function uploadFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";
  const filename = `${randomUUID()}.${ext}`;

  if (process.env.BUNNY_API_KEY) {
    return uploadToBunny(buffer, filename);
  }

  return uploadToFilesystem(buffer, filename);
}
