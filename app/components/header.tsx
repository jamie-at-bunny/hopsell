import { Link, useNavigate } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircleIcon,
  Logout01Icon,
} from "@hugeicons/core-free-icons";
import { signOut, useSession } from "~/lib/auth-client";
import { config } from "~/lib/config";
import { SignInDialog } from "~/components/sign-in-dialog";
import { HowItWorksDialog } from "~/components/how-it-works-dialog";

const pillBase =
  "bg-hop-surface/90 ring-foreground/5 hover:bg-hop-surface inline-flex items-center justify-center rounded-full shadow-md ring-1 backdrop-blur transition-colors";

export function Header() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            to="/"
            className={`${pillBase} px-4 py-2 text-[14px] font-semibold tracking-tight`}
          >
            {config.name}
          </Link>
          <HowItWorksDialog
            trigger={
              <button
                type="button"
                className={`${pillBase} px-4 py-2 text-[13px] font-medium tracking-tight`}
              >
                How it works
              </button>
            }
          />
        </div>

        {isPending ? null : session ? (
          <div className="pointer-events-auto flex items-center gap-2">
            <Link
              to="/dashboard"
              aria-label="Open dashboard"
              className={`${pillBase} size-10`}
            >
              <HugeiconsIcon
                icon={UserCircleIcon}
                strokeWidth={1.6}
                size={20}
              />
            </Link>
            <button
              type="button"
              aria-label="Sign out"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className={`${pillBase} size-10`}
            >
              <HugeiconsIcon
                icon={Logout01Icon}
                strokeWidth={1.6}
                size={18}
              />
            </button>
          </div>
        ) : (
          <SignInDialog
            trigger={
              <button
                type="button"
                aria-label="Sign in"
                className={`${pillBase} pointer-events-auto size-10`}
              >
                <HugeiconsIcon
                  icon={UserCircleIcon}
                  strokeWidth={1.6}
                  size={20}
                />
              </button>
            }
          />
        )}
      </div>
    </header>
  );
}
