import { redirect } from "react-router";
import { auth } from "~/lib/auth.server";
import { Welcome } from "../welcome/welcome";
import type { Route } from "./+types/home-page";

export function meta() {
  return [
    { title: "LaunchMade" },
    { name: "description", content: "Welcome to LaunchMade" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    throw redirect("/");
  }
  return null;
}

export default function HomePage() {
  return <Welcome />;
}
