import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface WelcomeProps {
  name: string;
  url: string;
}

export default function Welcome({ name, url }: WelcomeProps) {
  return (
    <EmailLayout preview={`Welcome to LaunchMade, ${name}`}>
      <Heading style={styles.heading}>Welcome to LaunchMade</Heading>
      <Text style={styles.paragraph}>Hi {name},</Text>
      <Text style={styles.paragraph}>
        Thanks for signing up. Your account is ready to go.
      </Text>
      <Button style={styles.button} href={url}>
        Get started
      </Button>
    </EmailLayout>
  );
}
