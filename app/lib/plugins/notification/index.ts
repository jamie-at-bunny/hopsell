import {
  createAuthEndpoint,
  createAuthMiddleware,
  sessionMiddleware,
  APIError,
} from "better-auth/api";
import * as z from "zod";
import type { BetterAuthPlugin } from "better-auth";

// --- SSE Connection Registry (single-server deployment) ---

const connections = new Map<string, Set<ReadableStreamDefaultController>>();

export function addSSEConnection(
  userId: string,
  controller: ReadableStreamDefaultController,
) {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(controller);
}

export function removeSSEConnection(
  userId: string,
  controller: ReadableStreamDefaultController,
) {
  const set = connections.get(userId);
  if (set) {
    set.delete(controller);
    if (set.size === 0) connections.delete(userId);
  }
}

function pushToUser(userId: string, data: string) {
  const set = connections.get(userId);
  if (!set) return;
  const encoder = new TextEncoder();
  const message = encoder.encode(`data: ${data}\n\n`);
  for (const controller of set) {
    try {
      controller.enqueue(message);
    } catch {
      set.delete(controller);
    }
  }
}

// --- Server-side send helper (import this from the plugin) ---

// We need the adapter to send notifications from outside endpoint context.
// It's captured lazily from the first endpoint call.
let _adapter: any = null;

export function setAdapter(adapter: any) {
  _adapter = adapter;
}

export async function sendNotification(params: {
  userId: string;
  organizationId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  if (!_adapter) {
    console.warn("[notification] Adapter not yet initialized, skipping notification");
    return;
  }

  // Check user notification preferences
  const user = await _adapter.findOne({
    model: "user",
    where: [{ field: "id", value: params.userId }],
  });

  const notifyInApp = user?.notifyInApp !== false;
  const notifyEmail = user?.notifyEmail !== false;

  if (!notifyInApp && !notifyEmail) {
    return;
  }

  if (notifyInApp) {
    const record = await _adapter.create({
      model: "notification",
      data: {
        userId: params.userId,
        organizationId: params.organizationId || null,
        type: params.type,
        title: params.title,
        body: params.body || null,
        link: params.link || null,
        read: false,
      },
    });

    const payload = JSON.stringify({
      id: record.id,
      type: params.type,
      title: params.title,
      body: params.body || null,
      link: params.link || null,
      read: false,
      createdAt: new Date().toISOString(),
    });

    pushToUser(params.userId, payload);
  }

  if (notifyEmail && user?.email) {
    // Lazy imports to avoid circular dependency
    const React = await import("react");
    const { sendEmail } = await import("~/lib/email.server");
    const { default: Notification } = await import("~/emails/notification");
    void sendEmail({
      to: user.email,
      subject: params.title,
      react: React.createElement(Notification, {
        title: params.title,
        body: params.body,
        link: params.link,
      }),
    });
  }
}

// --- Plugin Definition ---

interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date | string;
  organizationId: string | null;
}

export const notification = (): BetterAuthPlugin => {
  return {
    id: "notification",
    hooks: {
      before: [
        {
          matcher: () => true,
          handler: createAuthMiddleware(async (ctx) => {
            // Lazily capture the adapter for sendNotification() calls outside endpoints
            if (!_adapter) {
              _adapter = ctx.context.adapter;
            }
          }),
        },
      ],
    },
    endpoints: {
      listNotifications: createAuthEndpoint(
        "/notification/list-notifications",
        {
          method: "GET",
          query: z.object({
            limit: z.coerce.number().min(1).max(100).default(50),
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "List notifications",
              description: "List recent notifications for the current user",
            },
          },
        },
        async (ctx) => {
          const userId = ctx.context.session.user.id;
          const limit = ctx.query.limit;

          const notifications = (await ctx.context.adapter.findMany({
            model: "notification",
            where: [{ field: "userId", value: userId }],
            sortBy: { field: "createdAt", direction: "desc" },
            limit,
          })) as NotificationRecord[];

          const unreadCount = notifications.filter((n) => !n.read).length;

          return ctx.json({ notifications, unreadCount });
        },
      ),

      markNotificationRead: createAuthEndpoint(
        "/notification/mark-notification-read",
        {
          method: "POST",
          body: z.object({
            notificationId: z.string(),
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Mark notification as read",
              description: "Mark a single notification as read",
            },
          },
        },
        async (ctx) => {
          const userId = ctx.context.session.user.id;
          const { notificationId } = ctx.body;

          // Verify ownership then update
          const existing = (await ctx.context.adapter.findOne({
            model: "notification",
            where: [{ field: "id", value: notificationId }],
          })) as NotificationRecord | null;

          if (!existing || existing.userId !== userId) {
            throw new APIError("NOT_FOUND", {
              message: "Notification not found",
            });
          }

          await ctx.context.adapter.update({
            model: "notification",
            where: [{ field: "id", value: notificationId }],
            update: { read: true },
          });

          return ctx.json({ success: true });
        },
      ),

      markAllNotificationsRead: createAuthEndpoint(
        "/notification/mark-all-notifications-read",
        {
          method: "POST",
          body: z.object({}),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Mark all notifications as read",
              description:
                "Mark all unread notifications as read for the current user",
            },
          },
        },
        async (ctx) => {
          const userId = ctx.context.session.user.id;

          const all = (await ctx.context.adapter.findMany({
            model: "notification",
            where: [{ field: "userId", value: userId }],
          })) as NotificationRecord[];

          for (const n of all) {
            if (n.read) continue;
            await ctx.context.adapter.update({
              model: "notification",
              where: [{ field: "id", value: n.id }],
              update: { read: true },
            });
          }

          return ctx.json({ success: true });
        },
      ),

      sendNotification: createAuthEndpoint(
        "/notification/send-notification",
        {
          method: "POST",
          body: z.object({
            userId: z.string().optional(),
            email: z.string().optional(),
            organizationId: z.string().optional(),
            type: z.string(),
            title: z.string(),
            body: z.string().optional(),
            link: z.string().optional(),
          }),
          use: [sessionMiddleware],
          metadata: {
            openapi: {
              summary: "Send a notification",
              description:
                "Send a notification to a user by ID or email",
            },
          },
        },
        async (ctx) => {
          let { userId } = ctx.body;
          const { email, organizationId, type, title, body, link } = ctx.body;

          // Resolve userId from email if not provided
          if (!userId && email) {
            const found = (await ctx.context.adapter.findOne({
              model: "user",
              where: [{ field: "email", value: email }],
            })) as { id: string } | null;
            if (found) userId = found.id;
          }

          if (!userId) {
            // User doesn't exist yet — silently succeed
            return ctx.json({ success: true });
          }

          // Verify caller is a member of the org (if orgId provided)
          if (organizationId) {
            const memberCount = await ctx.context.adapter.count({
              model: "member",
              where: [
                { field: "userId", value: ctx.context.session.user.id },
                { field: "organizationId", value: organizationId },
              ],
            });
            if (memberCount === 0) {
              throw new APIError("FORBIDDEN", {
                message: "You don't have access to this organization",
              });
            }
          }

          await sendNotification({
            userId,
            organizationId,
            type,
            title,
            body,
            link,
          });

          return ctx.json({ success: true });
        },
      ),
    },

    schema: {
      notification: {
        fields: {
          userId: {
            type: "string",
            required: true,
            references: {
              model: "user",
              field: "id",
              onDelete: "cascade",
            },
          },
          organizationId: {
            type: "string",
            required: false,
            references: {
              model: "organization",
              field: "id",
              onDelete: "cascade",
            },
          },
          type: {
            type: "string",
            required: true,
          },
          title: {
            type: "string",
            required: true,
          },
          body: {
            type: "string",
            required: false,
          },
          link: {
            type: "string",
            required: false,
          },
          read: {
            type: "boolean",
            required: true,
            defaultValue: false,
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
