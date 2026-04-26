import { Heading } from "~/components/heading";
import { Separator } from "~/components/ui/separator";
import { PasswordSection } from "~/components/account-dialog/password-section";
import { PasskeysSection } from "~/components/account-dialog/passkeys-section";
import { TwoFactorSection } from "~/components/account-dialog/two-factor-section";
import { SessionsSection } from "~/components/account-dialog/sessions-section";
import { DeleteAccountSection } from "~/components/account-dialog/delete-account-section";

export function SecurityTab() {
  return (
    <div className="space-y-6">
      <Heading title="Security" description="Manage your security settings." />

      <PasswordSection />
      <Separator />
      <PasskeysSection />
      <Separator />
      <TwoFactorSection />
      <Separator />
      <SessionsSection />
      <Separator />
      <DeleteAccountSection />
    </div>
  );
}
