import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface SaleProps {
  productTitle: string;
  buyerEmail: string;
  netAmountFormatted: string;
}

export default function Sale({
  productTitle,
  buyerEmail,
  netAmountFormatted,
}: SaleProps) {
  return (
    <EmailLayout preview={`You made a sale on ${productTitle}`}>
      <Heading style={styles.heading}>Cha-ching</Heading>
      <Text style={styles.paragraph}>
        Someone just bought <strong>{productTitle}</strong>.
      </Text>
      <Text style={styles.paragraph}>
        Net to you: <strong>{netAmountFormatted}</strong>
        <br />
        Buyer: {buyerEmail}
      </Text>
      <Text style={styles.subtle}>
        Stripe handles the payout — funds will land in your bank on your
        regular schedule.
      </Text>
    </EmailLayout>
  );
}
