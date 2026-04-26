import { useState, useEffect } from "react";
import { useNavigate, useFetcher } from "react-router";
import { authClient, useSession } from "~/lib/auth-client";
import { getInitials } from "~/lib/utils";
import { Avatar, AvatarImage, AvatarFallback, AvatarBadge } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Logout01Icon } from "@hugeicons/core-free-icons";

interface DeviceSession {
  session: {
    id: string;
    token: string;
    userId: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface UserButtonProps {
  onManageAccount: () => void;
}

export function UserButton({ onManageAccount }: UserButtonProps) {
  const { data: currentSession } = useSession();
  const [open, setOpen] = useState(false);
  const [otherSessions, setOtherSessions] = useState<DeviceSession[]>([]);
  const navigate = useNavigate();
  const fetcher = useFetcher<{ switched?: boolean; signedOut?: boolean; error?: string }>();

  useEffect(() => {
    if (!open || !currentSession) return;

    authClient.multiSession.listDeviceSessions().then(({ data }) => {
      if (data) {
        setOtherSessions(
          data.filter((s) => s.user.id !== currentSession.user.id),
        );
      }
    });
  }, [open, currentSession]);

  // Handle responses
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.switched) {
        setOpen(false);
        window.location.href = "/";
        return;
      }
      if (fetcher.data.signedOut) {
        setOpen(false);
        navigate("/login");
      }
    }
  }, [fetcher.state, fetcher.data]);

  if (!currentSession) return null;

  const emailVerified = (currentSession.user as Record<string, unknown>)
    ?.emailVerified as boolean | undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="rounded-full transition-opacity hover:opacity-80"
          />
        }
      >
        <Avatar size="sm">
          {currentSession.user.image && (
            <AvatarImage
              src={currentSession.user.image}
              alt={currentSession.user.name}
            />
          )}
          <AvatarFallback>
            {getInitials(currentSession.user.name)}
          </AvatarFallback>
          {!emailVerified && (
            <AvatarBadge className="bg-amber-500" />
          )}
        </Avatar>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 gap-0 p-0">
        {/* Current account */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <Avatar>
            {currentSession.user.image && (
              <AvatarImage
                src={currentSession.user.image}
                alt={currentSession.user.name}
              />
            )}
            <AvatarFallback>
              {getInitials(currentSession.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {currentSession.user.name}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {currentSession.user.email}
            </p>
          </div>
        </div>
        {!emailVerified && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onManageAccount();
            }}
            className="mx-4 mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-left transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:hover:bg-amber-900"
          >
            <div className="mt-0.5 size-1.5 shrink-0 rounded-full bg-amber-500" />
            <div>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Verify your email
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Please verify {currentSession.user.email} to secure your account.
              </p>
            </div>
          </button>
        )}
        <div className="flex gap-2 px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setOpen(false);
              onManageAccount();
            }}
          >
            Manage account
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              fetcher.submit(
                { intent: "sign-out" },
                { method: "post", action: "/" },
              )
            }
          >
            <HugeiconsIcon icon={Logout01Icon} className="size-3.5" />
            Sign out
          </Button>
        </div>

        {/* Other accounts */}
        {otherSessions.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              {otherSessions.map((s) => (
                <button
                  key={s.session.id}
                  type="button"
                  onClick={() =>
                    fetcher.submit(
                      { intent: "switch-account", sessionToken: s.session.token },
                      { method: "post", action: "/" },
                    )
                  }
                  className="hover:bg-accent flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition-colors"
                >
                  <Avatar size="sm">
                    {s.user.image && (
                      <AvatarImage src={s.user.image} alt={s.user.name} />
                    )}
                    <AvatarFallback>
                      {getInitials(s.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{s.user.name}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {s.user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <Separator />
        <div className="p-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/login?add=true");
            }}
            className="hover:bg-accent flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors"
          >
            <HugeiconsIcon icon={Add01Icon} className="size-4 opacity-60" />
            Add another account
          </button>
          {otherSessions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const formData = new FormData();
                formData.append("intent", "sign-out-all");
                for (const s of otherSessions) {
                  formData.append("sessionToken", s.session.token);
                }
                fetcher.submit(formData, { method: "post", action: "/" });
              }}
              className="hover:bg-accent text-destructive flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm transition-colors"
            >
              <HugeiconsIcon
                icon={Logout01Icon}
                className="size-4 opacity-60"
              />
              Sign out of all accounts
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
