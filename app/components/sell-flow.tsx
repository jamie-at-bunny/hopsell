import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { UploadDropzone } from "@bunny.net/upload-react";
import type { FileState, UploadResult } from "@bunny.net/upload-core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";

type ActionResult =
  | { error?: string }
  | { verificationSent: true; email: string };

interface FileMeta {
  storagePath: string;
  originalFilename: string;
  fileExtension: string;
  fileMimeType: string;
  fileSizeBytes: number;
}

function extOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx + 1).toLowerCase();
}

export function SellFlow() {
  const fetcher = useFetcher<ActionResult>();
  const [completed, setCompleted] = useState<FileMeta | null>(null);
  const [resetKey, setResetKey] = useState(0);

  const submitting = fetcher.state !== "idle";
  const error =
    (fetcher.data && "error" in fetcher.data && fetcher.data.error) || null;
  const verificationSent =
    !!fetcher.data &&
    "verificationSent" in fetcher.data &&
    fetcher.data.verificationSent === true
      ? fetcher.data.email
      : null;

  return (
    <UploadDropzone
      key={resetKey}
      presigned
      autoUpload
      maxFiles={1}
      maxSize="2gb"
      onComplete={(results: UploadResult[]) => {
        const r = results[0];
        if (!r) return;
        const ext = extOf(r.name);
        setCompleted({
          storagePath: r.path.replace(/^\//, ""),
          originalFilename: r.name,
          fileExtension: ext,
          fileMimeType: "",
          fileSizeBytes: 0,
        });
      }}
    >
      {({
        isDragOver,
        openFilePicker,
        files,
        getDropzoneProps,
        getInputProps,
        reset,
      }) => {
        const file: FileState | undefined = files[0];
        const open = !!file;
        const progress = file?.progress ?? 0;
        const status = file?.status;
        const meta: FileMeta | null = completed
          ? {
              ...completed,
              fileMimeType: file?.type ?? completed.fileMimeType,
              fileSizeBytes: file?.size ?? completed.fileSizeBytes,
            }
          : null;
        const closeAndReset = () => {
          reset();
          setCompleted(null);
          setResetKey((k) => k + 1);
        };

        return (
          <>
            <input {...getInputProps()} className="sr-only" />

            <div className="relative">
              <div
                aria-hidden="true"
                className="bg-hop-surface ring-hop-border absolute -top-4 left-1/2 h-4 w-[calc(100%-4rem)] -translate-x-1/2 rounded-t-2xl ring-1"
              />
              <div
                aria-hidden="true"
                className="bg-hop-surface ring-hop-border absolute -top-2 left-1/2 h-4 w-[calc(100%-2rem)] -translate-x-1/2 rounded-t-2xl ring-1"
              />
              <div
                {...getDropzoneProps()}
                onClick={openFilePicker}
                className={`bg-hop-surface ring-hop-border relative cursor-pointer rounded-2xl p-10 text-center shadow-md ring-1 transition-all sm:p-12 ${
                  isDragOver ? "ring-hop-text bg-hop-hover ring-2" : ""
                }`}
              >
                <div className="text-3xl" aria-hidden="true">
                  📎
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {isDragOver ? "Drop it here" : "Drop your file"}
                </p>
                <p className="text-hop-muted mt-1 text-sm">
                  We turn it into a product page in seconds.
                </p>
                <Button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFilePicker();
                  }}
                  className="mt-5 rounded-full px-6"
                >
                  Choose a file
                </Button>
              </div>
            </div>

            <Dialog
              open={open}
              onOpenChange={(o) => {
                // Lock the dialog while a file is staged. The only ways out are
                // the Cancel button or a successful submission; backdrop clicks,
                // Escape, and the X button must not throw away the upload.
                if (!o) return;
              }}
            >
              <DialogContent
                className="sm:max-w-md"
                showCloseButton={false}
              >
                {verificationSent ? (
                  <>
                    <DialogHeader>
                      <DialogTitle>Check your email</DialogTitle>
                      <DialogDescription>
                        We sent a confirmation link to{" "}
                        <span className="text-hop-text font-medium">
                          {verificationSent}
                        </span>
                        . Click it to publish your listing.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={closeAndReset}
                      >
                        Done
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                <DialogHeader>
                  <DialogTitle>Almost there</DialogTitle>
                  <DialogDescription>
                    Last step: connect your bank with Stripe. Takes 2 minutes.
                    Your page goes live when you finish.
                  </DialogDescription>
                </DialogHeader>

                {file && (
                  <div className="bg-hop-bg border-hop-border flex items-center gap-3 rounded-md border p-3">
                    <div className="bg-hop-hover flex size-9 shrink-0 items-center justify-center rounded text-[0.6875rem] font-mono uppercase">
                      {extOf(file.name).slice(0, 4) || "file"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8125rem] font-medium">
                        {file.name}
                      </p>
                      <div className="bg-hop-hover mt-1.5 h-1 overflow-hidden rounded-full">
                        <div
                          className="bg-hop-text h-full transition-all duration-200"
                          style={{ width: `${Math.round(progress)}%` }}
                        />
                      </div>
                      <p className="text-hop-muted mt-1 text-[0.6875rem] tabular-nums">
                        {status === "complete"
                          ? "Uploaded"
                          : status === "error"
                            ? `Error: ${file.error ?? "upload failed"}`
                            : `Uploading… ${Math.round(progress)}%`}
                      </p>
                    </div>
                  </div>
                )}

                <fetcher.Form method="post" className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      name="title"
                      required
                      maxLength={120}
                      placeholder="What you're selling"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="price">Price (£)</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        required
                        step="0.01"
                        min="0.50"
                        placeholder="9.00"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="email">Your email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description">
                      Description{" "}
                      <span className="text-hop-muted text-[0.6875rem]">
                        optional
                      </span>
                    </Label>
                    <textarea
                      id="description"
                      name="description"
                      maxLength={2000}
                      rows={3}
                      className="border-hop-border bg-hop-surface min-h-[72px] rounded-md border px-3 py-2 text-sm"
                      placeholder="What buyers get."
                    />
                  </div>

                  {meta && (
                    <>
                      <input
                        type="hidden"
                        name="storagePath"
                        value={meta.storagePath}
                      />
                      <input
                        type="hidden"
                        name="originalFilename"
                        value={meta.originalFilename}
                      />
                      <input
                        type="hidden"
                        name="fileExtension"
                        value={meta.fileExtension}
                      />
                      <input
                        type="hidden"
                        name="fileMimeType"
                        value={meta.fileMimeType}
                      />
                      <input
                        type="hidden"
                        name="fileSizeBytes"
                        value={String(meta.fileSizeBytes)}
                      />
                    </>
                  )}

                  {error && (
                    <p className="text-destructive text-[0.8125rem]">
                      {error}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            "Discard your upload? You'll need to re-upload the file to start over.",
                          )
                        ) {
                          closeAndReset();
                        }
                      }}
                      disabled={submitting}
                      className="text-hop-muted hover:text-hop-text text-[0.8125rem] transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      disabled={!meta || submitting}
                      className="min-w-[180px]"
                    >
                      {submitting
                        ? "Redirecting to Stripe…"
                        : meta
                          ? "Continue to Stripe →"
                          : "Uploading…"}
                    </Button>
                  </div>
                </fetcher.Form>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        );
      }}
    </UploadDropzone>
  );
}
