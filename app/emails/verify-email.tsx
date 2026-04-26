import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface VerifyEmailProps {
  url: string;
}

export default function VerifyEmail({ url }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Verify your email address">
      <Heading style={styles.heading}>Verify your email</Heading>
      <Text style={styles.paragraph}>
        Click the button below to verify your email address.
      </Text>
      <Button style={styles.button} href={url}>
        Verify email
      </Button>
      <Text style={styles.subtle}>
        If you didn't create an account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
