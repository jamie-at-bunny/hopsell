import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Text style={footer}>LaunchMade</Text>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
};

const content = {
  padding: "0 48px",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  textAlign: "center" as const,
};

export const styles = {
  heading: {
    fontSize: "24px",
    fontWeight: "bold" as const,
    marginBottom: "16px",
  },
  paragraph: {
    fontSize: "14px",
    lineHeight: "24px",
    color: "#525f7f",
  },
  subtle: {
    fontSize: "12px",
    color: "#8898aa",
    marginTop: "24px",
  },
  button: {
    backgroundColor: "#0a0a0a",
    borderRadius: "6px",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600" as const,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    padding: "12px 24px",
    marginTop: "16px",
  },
  codeContainer: {
    background: "#f4f4f5",
    borderRadius: "8px",
    padding: "16px 0",
    marginTop: "16px",
  },
  code: {
    fontSize: "32px",
    fontWeight: "bold" as const,
    letterSpacing: "6px",
    color: "#0a0a0a",
    textAlign: "center" as const,
  },
};
