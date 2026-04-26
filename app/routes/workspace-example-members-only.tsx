import { useOutletContext } from "react-router";

export function meta() {
  return [{ title: "Members" }];
}

export default function WorkspaceMembers() {
  const { organization, member } = useOutletContext<{
    organization: { name: string; slug: string };
    member: { id: string; role: string } | null;
  }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Members</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        You are a <strong>{member?.role}</strong> of{" "}
        <strong>{organization.name}</strong>.
      </p>
      <p className="text-muted-foreground mt-4 text-sm">
        This page is visible to all workspace members. Replace this with your
        own member directory, activity feed, or team view.
      </p>
    </div>
  );
}
