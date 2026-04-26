import { Link, useNavigate } from "react-router";
import { signOut, useSession } from "~/lib/auth-client";
import { config } from "~/lib/config";

export function Header() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  return (
    <nav className="mx-auto flex h-14 max-w-[900px] items-center justify-between px-4 sm:px-6">
      <Link to="/" className="text-[15px] font-semibold tracking-tight">
        {config.name}
      </Link>
      <div className="flex items-center gap-4">
        {isPending ? null : session ? (
          <>
            <Link
              to="/dashboard"
              className="text-hop-muted hover:text-hop-text text-[0.8125rem] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/library"
              className="text-hop-muted hover:text-hop-text text-[0.8125rem] transition-colors"
            >
              Library
            </Link>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="text-hop-muted hover:text-hop-text text-[0.8125rem] transition-colors"
            >
              Sign out
            </button>
          </>
        ) : null}
      </div>
    </nav>
  );
}
