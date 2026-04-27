import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface VerifyListingProps {
  productTitle: string;
  url: string;
}

export default function VerifyListing({
  productTitle,
  url,
}: VerifyListingProps) {
  return (
    <EmailLayout preview={`Confirm your new Hopsell listing · ${productTitle}`}>
      <Heading style={styles.heading}>Confirm your new listing</Heading>
      <Text style={styles.paragraph}>
        Someone (hopefully you) just started a new listing on your Hopsell
        account: <strong>{productTitle}</strong>.
      </Text>
      <Text style={styles.paragraph}>
        Click below to publish it. The link expires in 24 hours and only works
        once.
      </Text>
      <Button style={styles.button} href={url}>
        Publish &ldquo;{productTitle}&rdquo;
      </Button>
      <Text style={styles.subtle}>
        If you didn&apos;t start this listing, ignore this email and nothing
        will happen.
      </Text>
    </EmailLayout>
  );
}
