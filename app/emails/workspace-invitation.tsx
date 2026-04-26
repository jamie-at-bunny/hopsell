import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface WorkspaceInvitationProps {
  inviterName: string;
  workspaceName: string;
  role: string;
  url: string;
}

export default function WorkspaceInvitation({
  inviterName,
  workspaceName,
  role,
  url,
}: WorkspaceInvitationProps) {
  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${workspaceName}`}
    >
      <Heading style={styles.heading}>You've been invited</Heading>
      <Text style={styles.paragraph}>
        {inviterName} invited you to join <strong>{workspaceName}</strong> as a{" "}
        <strong>{role}</strong>.
      </Text>
      <Button style={styles.button} href={url}>
        Accept invitation
      </Button>
      <Text style={styles.subtle}>
        If you don't want to join, you can ignore this email.
      </Text>
    </EmailLayout>
  );
}
