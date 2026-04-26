import type { BetterAuthClientPlugin } from "better-auth/client";
import type { inviteLink } from "./index";

export const inviteLinkClient = () => {
  return {
    id: "invite-link",
    $InferServerPlugin: {} as ReturnType<typeof inviteLink>,
    pathMethods: {
      "/invite-link/list-invite-links": "GET",
    },
  } satisfies BetterAuthClientPlugin;
};
