import { Resend } from "resend";
import { render } from "@react-email/components";
import { db } from "~/db/index.server";
import { emailLog } from "~/db/email-log-schema";
import { config } from "~/lib/config";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  react: React.ReactElement;
}

export async function sendEmail({ to, subject, react }: SendEmailOptions) {
  if (!resend) {
    const html = await render(react);
    console.log("\n📧 [DEV EMAIL]");
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${html}\n`);
    return;
  }

  const { data, error } = await resend.emails.send({
    from: config.emailFrom,
    to,
    subject,
    react,
  });

  if (data?.id) {
    await db.insert(emailLog).values({
      id: crypto.randomUUID(),
      resendEmailId: data.id,
      to,
      subject,
      status: "sent",
    });
  }

  if (error) {
    console.error("[email] Failed to send:", error);
  }
}
