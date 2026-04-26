import { Webhook } from "svix";
import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { emailLog } from "~/db/email-log-schema";
import type { Route } from "./+types/api.webhooks.resend";

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id: string;
    to: string[];
    from: string;
    subject: string;
    created_at: string;
    [key: string]: unknown;
  };
}

export async function action({ request }: Route.ActionArgs) {
  if (!webhookSecret) {
    return new Response("Webhook secret not configured", { status: 501 });
  }

  const body = await request.text();
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing webhook headers", { status: 400 });
  }

  let payload: ResendWebhookPayload;

  try {
    const wh = new Webhook(webhookSecret);
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const { type, data } = payload;
  const resendEmailId = data.email_id;

  switch (type) {
    case "email.sent": {
      await upsertStatus(resendEmailId, "sent", data);
      break;
    }

    case "email.delivered": {
      await upsertStatus(resendEmailId, "delivered", data);
      break;
    }

    case "email.delivery_delayed": {
      await upsertStatus(resendEmailId, "delayed", data);
      break;
    }

    case "email.bounced": {
      await upsertStatus(resendEmailId, "bounced", data);
      break;
    }

    case "email.complained": {
      await upsertStatus(resendEmailId, "complained", data);
      break;
    }
  }

  return new Response("OK", { status: 200 });
}

async function upsertStatus(
  resendEmailId: string,
  status: string,
  data: ResendWebhookPayload["data"],
) {
  const existing = await db
    .select()
    .from(emailLog)
    .where(eq(emailLog.resendEmailId, resendEmailId))
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(emailLog)
      .set({ status, updatedAt: new Date() })
      .where(eq(emailLog.resendEmailId, resendEmailId));
  } else {
    await db.insert(emailLog).values({
      id: crypto.randomUUID(),
      resendEmailId,
      to: data.to?.[0] ?? "",
      subject: data.subject ?? "",
      status,
    });
  }
}
