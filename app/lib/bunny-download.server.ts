import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;

function client() {
  if (_client) return _client;
  const region = process.env.BUNNY_STORAGE_REGION;
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const password = process.env.BUNNY_STORAGE_PASSWORD;
  if (!region || !zone || !password) {
    throw new Error(
      "Bunny Storage env vars missing: BUNNY_STORAGE_REGION, BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD",
    );
  }
  _client = new S3Client({
    region,
    endpoint: `https://${region}-s3.storage.bunnycdn.com`,
    credentials: { accessKeyId: zone, secretAccessKey: password },
    forcePathStyle: true,
  });
  return _client;
}

export async function getDownloadUrl(opts: {
  storagePath: string;
  originalFilename: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: process.env.BUNNY_STORAGE_ZONE!,
    Key: opts.storagePath,
    ResponseContentDisposition: `attachment; filename="${opts.originalFilename.replace(/"/g, "")}"`,
  });
  return getSignedUrl(client(), cmd, {
    expiresIn: opts.expiresInSeconds ?? 60,
  });
}
