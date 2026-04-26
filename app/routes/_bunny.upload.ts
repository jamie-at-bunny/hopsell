import { randomUUID } from "node:crypto";
import {
  createBunnyUploadHandler,
  UploadError,
  type FileInfo,
} from "@bunny.net/upload";
import { auth } from "~/lib/auth.server";
import { getOrIssuePreAuth } from "~/lib/pre-auth-cookie.server";

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "epub", "mobi", "txt", "md", "docx", "xlsx", "csv", "pptx", "odt",
  "zip", "tar", "gz", "7z", "rar",
  "png", "jpg", "jpeg", "gif", "webp", "svg", "psd", "ai", "sketch", "fig",
  "mp3", "wav", "flac", "ogg", "mp4", "mov", "webm",
  "json", "xml", "html", "css", "js", "ts",
]);

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx + 1).toLowerCase();
}

const reqStorage = new WeakMap<Request, string>();

let _handler: ((request: Request) => Promise<Response>) | null = null;

function getHandler() {
  if (_handler) return _handler;
  _handler = createBunnyUploadHandler({
    restrictions: { maxFileSize: "2gb", maxFiles: 1 },

    onBeforeUpload: async (file: FileInfo, req: Request) => {
      const ext = extensionOf(file.name);
      if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
        throw new UploadError(
          `File type .${ext || "unknown"} not allowed`,
          400,
        );
      }

      if (reqStorage.has(req)) return;

      const session = await auth.api.getSession({ headers: req.headers });
      let prefix: string | undefined;
      if (session?.user) {
        prefix = (session.user as { storagePrefix?: string }).storagePrefix;
      }
      if (!prefix) {
        const { value } = getOrIssuePreAuth(req);
        prefix = value.storagePrefix;
      }
      reqStorage.set(req, prefix);
    },

    getPath: (file: FileInfo, req: Request) => {
      const prefix = reqStorage.get(req);
      if (!prefix) {
        throw new UploadError("Missing storage prefix", 500);
      }
      const productId = randomUUID();
      const fileId = randomUUID();
      const ext = extensionOf(file.name) || "bin";
      return `products/${prefix}/${productId}/${fileId}.${ext}`;
    },
  });
  return _handler;
}

export async function action({ request }: { request: Request }) {
  return getHandler()(request);
}

export async function loader({ request }: { request: Request }) {
  return getHandler()(request);
}
