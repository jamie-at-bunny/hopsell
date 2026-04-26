import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface MagicLinkProps {
  url: string;
}

export default function MagicLink({ url }: MagicLinkProps) {
  return (
    <EmailLayout preview="Your sign-in link for Hopsell">
      <Heading style={styles.heading}>Sign in to Hopsell</Heading>
      <Text style={styles.paragraph}>
        Click the button below to sign in. This link will expire in 7 days and
        can only be used once.
      </Text>
      <Button style={styles.button} href={url}>
        Sign in
      </Button>
      <Text style={styles.subtle}>
        If you didn&apos;t request this email, you can safely ignore it.
      </Text>
    </EmailLayout>
  );
}
