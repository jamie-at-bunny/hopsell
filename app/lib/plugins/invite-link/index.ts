import {
  createAuthEndpoint,
  sessionMiddleware,
  APIError,
} from "better-auth/api";
import { generateRandomString } from "better-auth/crypto";
import * as z from "zod";
import type { BetterAuthPlugin } from "better-auth";
import type { InferOrganizationRolesFromOption } from "better-auth/plugins/organization";

type DefaultOrgRole = InferOrganizationRolesFromOption<undefined>;

export interface InviteLinkOptions {
  /**
   * How long invite links remain valid, in milliseconds.
   * @default 129600000 (36 hours)
   */
  expiresInMs?: number;
  /**
   * Roles allowed to create/revoke invite links.
   * @default ["owner", "admin"]
   */
  allowedRoles?: DefaultOrgRole[];
}

interface InviteLinkRecord {
  id: string;
  token: string;
  organizationId: string;
  role: string;
  name: string | null;
  expiresAt: Date | string;
  createdBy: string;
  usedCount: number;
  createdAt: Date | string;
}

interface OrgRecord {
  id: string;
  slug: string;
  name: string;
  [key: string]: unknown;
}

const DEFAULT_EXPIRES_MS = 36 * 60 * 60 * 1000; // 36 hours
const DEFAULT_ALLOWED_ROLES: DefaultOrgRole[] = ["owner", "admin"];

export const inviteLink = (options?: InviteLinkOptions): BetterAuthPlugin => {
  const expiresInMs = options?.expiresInMs ?? DEFAULT_EXPIRES_MS;
  const allowedRoles = options?.allowedRoles ?? DEFAULT_ALLOWED_ROLES;

  return {
    id: "invite-link",
    endpoints: {
      createInviteLink: createAuthEndpoint(
        "/invite-link/create-invite-link",
        {
          method: "POST",
          body: z.object({
            organizationId: z.string(),
            role: z.string().default("member"),
            name: z.string().optional(),
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Create an invite link",
              description:
                "Generate a shareable invite link for an organization",
            },
          },
        },
        async (ctx) => {
          const { organizationId, role, name } = ctx.body;
          const userId = ctx.context.session.user.id;

          // Verify membership and role
          const memberCount = await ctx.context.adapter.count({
            model: "member",
            where: [
              { field: "userId", value: userId },
              { field: "organizationId", value: organizationId },
              { field: "role", value: allowedRoles, operator: "in" },
            ],
          });

          if (memberCount === 0) {
            throw new APIError("FORBIDDEN", {
              message: "You don't have permission to create invite links",
            });
          }

          const token = generateRandomString(32);
          const expiresAt = new Date(Date.now() + expiresInMs);

          const link = await ctx.context.adapter.create({
            model: "inviteLink",
            data: {
              token,
              organizationId,
              role,
              name: name || null,
              expiresAt,
              createdBy: userId,
              usedCount: 0,
            },
          });

          const origin = new URL(ctx.context.baseURL).origin;

          return ctx.json({
            id: link.id,
            token: link.token,
            url: `${origin}/invite/${token}`,
            role,
            name: name || null,
            expiresAt: expiresAt.toISOString(),
          });
        },
      ),

      listInviteLinks: createAuthEndpoint(
        "/invite-link/list-invite-links",
        {
          method: "GET",
          query: z.object({
            organizationId: z.string(),
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "List active invite links",
              description:
                "List all non-expired invite links for an organization",
            },
          },
        },
        async (ctx) => {
          const { organizationId } = ctx.query;
          const userId = ctx.context.session.user.id;

          // Verify membership
          const memberCount = await ctx.context.adapter.count({
            model: "member",
            where: [
              { field: "userId", value: userId },
              { field: "organizationId", value: organizationId },
            ],
          });

          if (memberCount === 0) {
            throw new APIError("FORBIDDEN", {
              message: "You don't have access to this organization",
            });
          }

          const links = await ctx.context.adapter.findMany({
            model: "inviteLink",
            where: [
              { field: "organizationId", value: organizationId },
              {
                field: "expiresAt",
                value: new Date(),
                operator: "gt",
              },
            ],
            sortBy: { field: "createdAt", direction: "desc" },
          });

          return ctx.json(links);
        },
      ),

      revokeInviteLink: createAuthEndpoint(
        "/invite-link/revoke-invite-link",
        {
          method: "POST",
          body: z.object({
            id: z.string(),
            organizationId: z.string(),
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Revoke an invite link",
              description: "Delete an invite link so it can no longer be used",
            },
          },
        },
        async (ctx) => {
          const { id, organizationId } = ctx.body;
          const userId = ctx.context.session.user.id;

          // Verify role
          const memberCount = await ctx.context.adapter.count({
            model: "member",
            where: [
              { field: "userId", value: userId },
              { field: "organizationId", value: organizationId },
              { field: "role", value: allowedRoles, operator: "in" },
            ],
          });

          if (memberCount === 0) {
            throw new APIError("FORBIDDEN", {
              message: "You don't have permission to revoke invite links",
            });
          }

          await ctx.context.adapter.delete({
            model: "inviteLink",
            where: [
              { field: "id", value: id },
              { field: "organizationId", value: organizationId },
            ],
          });

          return ctx.json({ success: true });
        },
      ),

      acceptInviteLink: createAuthEndpoint(
        "/invite-link/accept-invite-link",
        {
          method: "POST",
          body: z.object({
            token: z.string(),
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Accept an invite link",
              description:
                "Join an organization using an invite link token",
            },
          },
        },
        async (ctx) => {
          const { token } = ctx.body;
          const userId = ctx.context.session.user.id;

          const link = (await ctx.context.adapter.findOne({
            model: "inviteLink",
            where: [{ field: "token", value: token }],
          })) as InviteLinkRecord | null;

          if (!link) {
            throw new APIError("NOT_FOUND", {
              message: "Invite link not found",
            });
          }

          if (new Date(link.expiresAt) < new Date()) {
            throw new APIError("FORBIDDEN", {
              message: "This invite link has expired",
            });
          }

          // Check if already a member
          const existing = await ctx.context.adapter.count({
            model: "member",
            where: [
              { field: "userId", value: userId },
              { field: "organizationId", value: link.organizationId },
            ],
          });

          if (existing > 0) {
            const org = (await ctx.context.adapter.findOne({
              model: "organization",
              where: [{ field: "id", value: link.organizationId }],
            })) as OrgRecord | null;
            return ctx.json({
              alreadyMember: true,
              organizationId: link.organizationId,
              slug: org?.slug || null,
            });
          }

          // Add as member
          await ctx.context.adapter.create({
            model: "member",
            data: {
              organizationId: link.organizationId,
              userId,
              role: link.role,
              createdAt: new Date(),
            },
          });

          // Increment used count
          await ctx.context.adapter.update({
            model: "inviteLink",
            where: [{ field: "id", value: link.id }],
            update: { usedCount: (link.usedCount || 0) + 1 },
          });

          const org = (await ctx.context.adapter.findOne({
            model: "organization",
            where: [{ field: "id", value: link.organizationId }],
          })) as OrgRecord | null;

          return ctx.json({
            alreadyMember: false,
            organizationId: link.organizationId,
            slug: org?.slug || null,
            role: link.role,
            createdBy: link.createdBy,
          });
        },
      ),
    },

    schema: {
      inviteLink: {
        fields: {
          token: {
            type: "string",
            required: true,
            unique: true,
          },
          organizationId: {
            type: "string",
            required: true,
            references: {
              model: "organization",
              field: "id",
              onDelete: "cascade",
            },
          },
          role: {
            type: "string",
            required: true,
            defaultValue: "member",
          },
          name: {
            type: "string",
            required: false,
          },
          expiresAt: {
            type: "date",
            required: true,
          },
          createdBy: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
              onDelete: "cascade",
            },
          },
          usedCount: {
            type: "number",
            required: true,
            defaultValue: 0,
          },
          createdAt: {
            type: "date",
            required: true,
          },
        },
      },
    },
  };
};
