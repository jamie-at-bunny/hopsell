import { TabbedDialog } from "~/components/tabbed-dialog";
import { GeneralTab } from "~/components/account-dialog/general-tab";
import { NotificationsTab } from "~/components/account-dialog/notifications-tab";
import { ConnectedAccountsTab } from "~/components/account-dialog/connected-accounts-tab";
import { SecurityTab } from "~/components/account-dialog/security-tab";

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountDialog({ open, onOpenChange }: AccountDialogProps) {
  return (
    <TabbedDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Account Settings"
      description="Manage your account settings and preferences"
      tabs={[
        { value: "general", label: "General", content: <GeneralTab /> },
        {
          value: "notifications",
          label: "Notifications",
          content: <NotificationsTab />,
        },
        {
          value: "accounts",
          label: "Connected Accounts",
          content: <ConnectedAccountsTab />,
        },
        { value: "security", label: "Security", content: <SecurityTab /> },
      ]}
    />
  );
}
