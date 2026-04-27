import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface ShareBlockProps {
  url: string;
  title: string;
}

export function ShareBlock({ url, title }: ShareBlockProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  const text = `${title} · Hopsell`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const links: Array<{ label: string; href: string }> = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    },
    {
      label: "Email",
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%20${encodedUrl}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      inputRef.current?.select();
      document.execCommand?.("copy");
      toast.success("Link copied");
    }
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url, text });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  return (
    <div className="w-full">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={async () => {
          const shared = await nativeShare();
          if (!shared) setOpen((o) => !o);
        }}
      >
        Share
      </Button>

      {open && (
        <div className="border-hop-border bg-hop-bg mt-3 flex flex-col gap-3 rounded-lg border p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 text-[0.8125rem]"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copy}
            >
              Copy
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="border-hop-border hover:bg-hop-hover text-hop-text rounded-md border px-3 py-1.5 text-[0.75rem] transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
