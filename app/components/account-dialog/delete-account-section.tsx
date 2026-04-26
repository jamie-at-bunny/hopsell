import { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { useSession } from "~/lib/auth-client";
import { Heading } from "~/components/heading";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";

export function DeleteAccountSection() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const fetcher = useFetcher<{ error?: string; deleted?: boolean }>();

  const loading = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.deleted) {
      window.location.href = "/";
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Heading
          as="h4"
          title="Delete Account"
          description="Permanently delete your account and all associated data."
        />
        <Popover
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setInputValue("");
          }}
        >
          <PopoverTrigger render={<Button variant="destructive" size="sm" />}>
            Delete my account
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <p className="text-sm font-medium text-destructive">
                  This action cannot be undone.
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  This will permanently delete your account
                  {session?.user.email && (
                    <>
                      {" "}
                      <strong>{session.user.email}</strong>
                    </>
                  )}
                  , your workspaces, and remove you from all teams.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="delete-confirm" className="text-xs">
                  Type <strong>delete my account</strong> to confirm
                </Label>
                <Input
                  id="delete-confirm"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="delete my account"
                  autoComplete="off"
                />
              </div>

              {fetcher.data?.error && (
                <p className="text-destructive text-xs">{fetcher.data.error}</p>
              )}

              <Button
                variant="destructive"
                size="sm"
                disabled={loading || inputValue !== "delete my account"}
                onClick={() =>
                  fetcher.submit(
                    { intent: "delete-account" },
                    { method: "post", action: "/account" },
                  )
                }
              >
                {loading ? "Deleting..." : "Delete my account"}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
