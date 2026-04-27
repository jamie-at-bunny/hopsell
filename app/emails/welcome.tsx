import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface WelcomeProps {
  productTitle: string;
  productUrl: string;
  connectUrl: string;
}

export default function Welcome({
  productTitle,
  productUrl,
  connectUrl,
}: WelcomeProps) {
  return (
    <EmailLayout preview={`Welcome to Hopsell · ${productTitle}`}>
      <Heading style={styles.heading}>Welcome to Hopsell</Heading>
      <Text style={styles.paragraph}>
        Your page for <strong>{productTitle}</strong> is set up. Connect your
        bank with Stripe and your page goes live automatically.
      </Text>
      <Text style={styles.paragraph}>
        Didn&apos;t finish? Pick up where you left off:
      </Text>
      <Button style={styles.button} href={connectUrl}>
        Continue setup
      </Button>
      <Text style={styles.subtle}>
        Save this link to find your page anytime:{" "}
        <a href={productUrl} style={{ color: "#0a0a0a" }}>
          {productUrl}
        </a>
      </Text>
    </EmailLayout>
  );
}
