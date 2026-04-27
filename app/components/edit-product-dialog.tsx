import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

interface EditProductDialogProps {
  trigger: React.ReactElement;
  product: {
    id: string;
    title: string;
    description: string | null;
    priceCents: number;
  };
}

export function EditProductDialog({
  trigger,
  product,
}: EditProductDialogProps) {
  const fetcher = useFetcher<{ ok?: boolean; error?: string }>();
  const [open, setOpen] = useState(false);

  const submitting = fetcher.state !== "idle";
  const error = fetcher.data && "error" in fetcher.data ? fetcher.data.error : null;

  // Auto-close on successful save.
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data &&
      "ok" in fetcher.data &&
      fetcher.data.ok
    ) {
      setOpen(false);
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Title, description, and price update instantly. Buyers see the new
            details on their next visit.
          </DialogDescription>
        </DialogHeader>

        <fetcher.Form
          method="post"
          action={`/api/products/${product.id}`}
          className="flex flex-col gap-3"
        >
          <input type="hidden" name="_action" value="update" />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-title-${product.id}`}>Title</Label>
            <Input
              id={`edit-title-${product.id}`}
              name="title"
              defaultValue={product.title}
              required
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-price-${product.id}`}>Price (£)</Label>
            <Input
              id={`edit-price-${product.id}`}
              name="price"
              type="number"
              step="0.01"
              min="0.50"
              defaultValue={(product.priceCents / 100).toFixed(2)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-description-${product.id}`}>
              Description{" "}
              <span className="text-hop-muted text-[0.6875rem]">optional</span>
            </Label>
            <textarea
              id={`edit-description-${product.id}`}
              name="description"
              maxLength={2000}
              rows={3}
              defaultValue={product.description ?? ""}
              className="border-hop-border bg-hop-surface min-h-[72px] rounded-md border px-3 py-2 text-sm"
              placeholder="What buyers get."
            />
          </div>

          {error && (
            <p className="text-destructive text-[0.8125rem]">{error}</p>
          )}

          <div className="mt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
