import { useEffect } from "react";
import { type Fetcher } from "react-router";
import { toast } from "sonner";

/**
 * Watches a fetcher and fires toast notifications automatically.
 * Expects action responses to follow `{ error?: string, toast?: string }`.
 */
export function useFetcherToast(fetcher: Fetcher<{ error?: string; toast?: string }>) {
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.error) {
        toast.error(fetcher.data.error);
      } else if (fetcher.data.toast) {
        toast(fetcher.data.toast);
      }
    }
  }, [fetcher.state, fetcher.data]);
}
