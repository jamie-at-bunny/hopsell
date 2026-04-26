import { Heading, Text, Section, Row, Column } from "@react-email/components";
import * as React from "react";
import { EmailLayout, styles } from "./components/layout";

interface VerifyEmailOtpProps {
  otp: string;
}

export default function VerifyEmailOtp({ otp }: VerifyEmailOtpProps) {
  return (
    <EmailLayout preview={`Your verification code is ${otp}`}>
      <Heading style={styles.heading}>Verify your email address</Heading>
      <Text style={styles.paragraph}>
        Enter this code to verify your email address.
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
