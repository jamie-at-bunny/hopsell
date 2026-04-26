import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface SubscriptionCancelledProps {
  workspaceName: string;
  endDate: string;
}

export default function SubscriptionCancelled({
  workspaceName,
  endDate,
}: SubscriptionCancelledProps) {
  return (
    <EmailLayout preview={`${workspaceName} subscription has been cancelled`}>
      <Heading style={styles.heading}>Subscription cancelled</Heading>
      <Text style={styles.paragraph}>
        The subscription for <strong>{workspaceName}</strong> has been
        cancelled. You'll continue to have access until{" "}
        <strong>{endDate}</strong>.
      </Text>
      <Text style={styles.subtle}>
        Changed your mind? You can resubscribe from workspace settings at any
        time before your access ends.
      </Text>
    </EmailLayout>
  );
}
