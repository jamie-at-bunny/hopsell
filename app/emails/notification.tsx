import { Button, Heading, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface NotificationProps {
  title: string;
  body?: string;
  link?: string;
}

export default function Notification({ title, body, link }: NotificationProps) {
  return (
    <EmailLayout preview={title}>
      <Heading style={styles.heading}>{title}</Heading>
      {body && <Text style={styles.paragraph}>{body}</Text>}
      {link && (
        <Button style={styles.button} href={link}>
          View details
        </Button>
      )}
    </EmailLayout>
  );
}
