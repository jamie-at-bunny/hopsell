import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { useSession } from "~/lib/auth-client";
import { useFetcherToast } from "~/lib/use-fetcher-toast";
import { Heading } from "~/components/heading";
import { Switch } from "~/components/ui/switch";

export function NotificationsTab() {
  const { data: session } = useSession();
  const fetcher = useFetcher<{ error?: string; toast?: string }>();
  useFetcherToast(fetcher);

  const user = session?.user as Record<string, unknown> | undefined;
  const serverInApp = (user?.notifyInApp as boolean) ?? true;
  const serverEmail = (user?.notifyEmail as boolean) ?? true;

  const [notifyInApp, setNotifyInApp] = useState(serverInApp);
  const [notifyEmail, setNotifyEmail] = useState(serverEmail);

  // Only sync from server when not saving
  useEffect(() => {
    if (fetcher.state === "idle") {
      setNotifyInApp(serverInApp);
      setNotifyEmail(serverEmail);
    }
  }, [serverInApp, serverEmail, fetcher.state]);

  function save(inApp: boolean, email: boolean) {
    fetcher.submit(
      {
        intent: "update-notification-preferences",
        notifyInApp: String(inApp),
        notifyEmail: String(email),
      },
      { method: "post", action: "/account" },
    );
  }

  return (
    <div className="space-y-6">
      <Heading
        title="Notifications"
        description="Choose how you want to be notified."
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">In-app notifications</p>
            <p className="text-muted-foreground text-xs">
              Show notifications in the bell icon
            </p>
          </div>
          <Switch
            checked={notifyInApp}
            onCheckedChange={(checked) => {
              setNotifyInApp(checked);
              save(checked, notifyEmail);
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email notifications</p>
            <p className="text-muted-foreground text-xs">
              Receive notifications via email
            </p>
          </div>
          <Switch
            checked={notifyEmail}
            onCheckedChange={(checked) => {
              setNotifyEmail(checked);
              save(notifyInApp, checked);
            }}
          />
        </div>
      </div>
    </div>
  );
}
