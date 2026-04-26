import type { BetterAuthClientPlugin } from "better-auth/client";
import type { notification } from "./index";

export const notificationClient = () => {
  return {
    id: "notification",
    $InferServerPlugin: {} as ReturnType<typeof notification>,
    pathMethods: {
      "/notification/list-notifications": "GET",
    },
  } satisfies BetterAuthClientPlugin;
};
