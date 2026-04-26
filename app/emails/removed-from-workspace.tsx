import { Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface RemovedFromWorkspaceProps {
  workspaceName: string;
}

export default function RemovedFromWorkspace({
  workspaceName,
}: RemovedFromWorkspaceProps) {
  return (
    <EmailLayout preview={`You've been removed from ${workspaceName}`}>
      <Heading style={styles.heading}>Removed from workspace</Heading>
      <Text style={styles.paragraph}>
        You've been removed from <strong>{workspaceName}</strong>. You no longer
        have access to this workspace.
      </Text>
      <Text style={styles.subtle}>
        If you believe this was a mistake, contact the workspace owner.
      </Text>
    </EmailLayout>
  );
}
