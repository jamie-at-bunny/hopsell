import { createAuthClient } from "better-auth/react";
import {
  organizationClient,
  lastLoginMethodClient,
  emailOTPClient,
  twoFactorClient,
  multiSessionClient,
} from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { ssoClient } from "@better-auth/sso/client";
import { inviteLinkClient } from "~/lib/plugins/invite-link/client";
import { notificationClient } from "~/lib/plugins/notification/client";
import { stripeClient } from "@better-auth/stripe/client";

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    emailOTPClient(),
    passkeyClient(),
    twoFactorClient(),
    multiSessionClient(),
    lastLoginMethodClient(),
    ssoClient(),
    inviteLinkClient(),
    notificationClient(),
    stripeClient({
      subscription: true,
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
