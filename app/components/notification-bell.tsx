import { useNavigate } from "react-router";
import { useNotifications, type Notification } from "~/lib/use-notifications";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { Separator } from "~/components/ui/separator";
import { HugeiconsIcon } from "@hugeicons/react";
import { BellDotIcon, TickDouble01Icon } from "@hugeicons/core-free-icons";
import { useState, useEffect, useRef, useCallback } from "react";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type Tab = "all" | "unread";

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const navigate = useNavigate();

  const handleClick = (n: Notification) => {
    if (!n.read) markRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const filtered =
    tab === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="hover:bg-accent relative rounded-lg p-2 transition-colors"
          />
        }
      >
        <HugeiconsIcon icon={BellDotIcon} className="size-4" />
        {unreadCount > 0 && (
          <span className="bg-primary absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-0 p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              title="Mark all as read"
              className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors hover:bg-accent"
            >
              <HugeiconsIcon icon={TickDouble01Icon} className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-1 px-4 pb-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === "all"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === "unread"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <Separator />
        <div className="max-h-80 overflow-hidden overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground p-4 text-center text-sm">
              {tab === "unread" ? "No unread notifications" : "No notifications"}
            </p>
          ) : (
            filtered.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onClick={() => handleClick(n)}
                onSeen={() => {
                  if (!n.read) markRead(n.id);
                }}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({
  notification: n,
  onClick,
  onSeen,
}: {
  notification: Notification;
  onClick: () => void;
  onSeen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const seenRef = useRef(false);

  useEffect(() => {
    if (n.read || seenRef.current) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !seenRef.current) {
          seenRef.current = true;
          // Small delay so it doesn't fire instantly on open
          const timeout = setTimeout(() => onSeen(), 1500);
          observer.disconnect();
          return () => clearTimeout(timeout);
        }
      },
      { threshold: 0.8 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [n.read, onSeen]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`hover:bg-accent last:rounded-b-lg flex w-full gap-3 px-4 py-3 text-left transition-colors ${
        !n.read ? "bg-primary/5" : ""
      }`}
    >
      {!n.read && (
        <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{n.title}</p>
        {n.body && (
          <p className="text-muted-foreground truncate text-xs">{n.body}</p>
        )}
        <p className="text-muted-foreground mt-0.5 text-[10px]">
          {timeAgo(n.createdAt)}
        </p>
      </div>
    </button>
  );
}
