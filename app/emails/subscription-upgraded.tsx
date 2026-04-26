import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface SubscriptionUpgradedProps {
  workspaceName: string;
  plan: string;
}

export default function SubscriptionUpgraded({
  workspaceName,
  plan,
}: SubscriptionUpgradedProps) {
  return (
    <EmailLayout preview={`${workspaceName} has been upgraded to ${plan}`}>
      <Heading style={styles.heading}>You're on {plan}</Heading>
      <Text style={styles.paragraph}>
        <strong>{workspaceName}</strong> has been upgraded to the{" "}
        <strong>{plan}</strong> plan. Thanks for your support!
      </Text>
    </EmailLayout>
  );
}
