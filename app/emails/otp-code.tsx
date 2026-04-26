import { Heading, Text, Section, Row, Column } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface OtpCodeProps {
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
}

const descriptions: Record<string, string> = {
  "sign-in": "Use this code to sign in to your account.",
  "email-verification": "Use this code to verify your email address.",
  "forget-password": "Use this code to reset your password.",
  "change-email": "Use this code to confirm your email change.",
};

export default function OtpCode({ otp, type }: OtpCodeProps) {
  return (
    <EmailLayout preview={`Your code is ${otp}`}>
      <Heading style={styles.heading}>Your verification code</Heading>
      <Text style={styles.paragraph}>
        {descriptions[type] || "Use this code to continue."}
      </Text>
      <Section style={styles.codeContainer}>
        <Row>
          <Column align="center">
            <Text style={styles.code}>{otp}</Text>
          </Column>
        </Row>
      </Section>
      <Text style={styles.subtle}>This code expires in 10 minutes.</Text>
    </EmailLayout>
  );
}
