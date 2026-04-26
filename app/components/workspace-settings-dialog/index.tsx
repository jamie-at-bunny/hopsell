import { TabbedDialog } from "~/components/tabbed-dialog";
import { GeneralTab } from "~/components/workspace-settings-dialog/general-tab";
import { SsoTab } from "~/components/workspace-settings-dialog/sso-tab";
import { MembersTab } from "~/components/workspace-settings-dialog/members-tab";
import { AuditTab } from "~/components/workspace-settings-dialog/audit-tab";
import { BillingTab } from "~/components/workspace-settings-dialog/billing-tab";
interface WorkspaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stripeEnabled?: boolean;
  defaultTab?: string | null;
}

export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
  stripeEnabled,
  defaultTab,
}: WorkspaceSettingsDialogProps) {
  const tabs = [
    { value: "general", label: "General", content: <GeneralTab /> },
    { value: "sso", label: "SSO", content: <SsoTab /> },
    { value: "members", label: "Members", content: <MembersTab /> },
    { value: "audit", label: "Audit Log", content: <AuditTab /> },
  ];

  if (stripeEnabled) {
    tabs.push({ value: "billing", label: "Billing", content: <BillingTab /> });
  }

  return (
    <TabbedDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Workspace Settings"
      description="Manage your workspace settings"
      disablePointerDismissal
      tabs={tabs}
      defaultTab={defaultTab ?? undefined}
    />
  );
}
