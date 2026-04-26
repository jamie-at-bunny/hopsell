import { useOutletContext } from "react-router";

export function meta() {
  return [{ title: "Dashboard" }];
}

export default function WorkspaceIndex() {
  const { organization } = useOutletContext<{
    organization: { name: string; slug: string; logo?: string | null };
  }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">{organization.name}</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Welcome to your workspace.
      </p>
    </div>
  );
}
