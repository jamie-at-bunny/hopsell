import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface ResetPasswordProps {
  url: string;
}

export default function ResetPassword({ url }: ResetPasswordProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Heading style={styles.heading}>Reset your password</Heading>
      <Text style={styles.paragraph}>
        Click the button below to reset your password. This link will expire
        shortly.
      </Text>
      <Button style={styles.button} href={url}>
        Reset password
      </Button>
      <Text style={styles.subtle}>
        If you didn't request a password reset, you can safely ignore this
        email.
      </Text>
    </EmailLayout>
  );
}
