import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface VerifyNewEmailProps {
  url: string;
}

export default function VerifyNewEmail({ url }: VerifyNewEmailProps) {
  return (
    <EmailLayout preview="Verify your new email address">
      <Heading style={styles.heading}>Verify your new email</Heading>
      <Text style={styles.paragraph}>
        You requested to change your email address. Click the button below to
        confirm.
      </Text>
      <Button style={styles.button} href={url}>
        Verify new email
      </Button>
      <Text style={styles.subtle}>
        If you didn't request this change, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
