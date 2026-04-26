import { uploadFile } from "~/lib/upload.server";
import { getSession } from "~/lib/session.server";
import type { Route } from "./+types/api.upload";

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const url = await uploadFile(file);
  return Response.json({ url });
}
