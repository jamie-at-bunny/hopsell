import { useState } from "react";
import { Link } from "react-router";
import { useSession } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { UserButton } from "~/components/user-button";
import { NotificationBell } from "~/components/notification-bell";
import { AccountDialog } from "~/components/account-dialog";
import { OrgPicker } from "~/components/org-picker";

export function Header({ stripeEnabled }: { stripeEnabled: boolean }) {
  const { data: session, isPending } = useSession();
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <>
      <header className="border-border border-b">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-semibold">
              LaunchMade
            </Link>
            {session && (
              <>
                <span className="text-border">/</span>
                <OrgPicker stripeEnabled={stripeEnabled} />
              </>
            )}
          </div>
          <nav className="flex items-center gap-2">
            {isPending ? (
              <div className="flex items-center gap-2">
                <div className="bg-muted size-8 animate-pulse rounded" />
                <div className="bg-muted size-8 animate-pulse rounded-full" />
              </div>
            ) : session ? (
              <>
                <NotificationBell />
                <UserButton onManageAccount={() => setAccountOpen(true)} />
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      {session && (
        <AccountDialog open={accountOpen} onOpenChange={setAccountOpen} />
      )}
    </>
  );
}
