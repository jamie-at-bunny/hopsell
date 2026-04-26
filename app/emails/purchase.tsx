import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface PurchaseProps {
  productTitle: string;
  amountFormatted: string;
  downloadUrl: string;
  libraryUrl: string;
}

export default function Purchase({
  productTitle,
  amountFormatted,
  downloadUrl,
  libraryUrl,
}: PurchaseProps) {
  return (
    <EmailLayout preview={`Your download for ${productTitle}`}>
      <Heading style={styles.heading}>Thanks for your purchase</Heading>
      <Text style={styles.paragraph}>
        You bought <strong>{productTitle}</strong> for {amountFormatted}.
      </Text>
      <Button style={styles.button} href={downloadUrl}>
        Download now
      </Button>
      <Text style={styles.subtle}>
        Lost the file? Re-download anytime from{" "}
        <a href={libraryUrl} style={{ color: "#0a0a0a" }}>
          your library
        </a>
        .
      </Text>
    </EmailLayout>
  );
}
