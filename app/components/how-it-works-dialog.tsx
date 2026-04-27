import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

interface HowItWorksDialogProps {
  trigger: React.ReactElement;
}

export function HowItWorksDialog({ trigger }: HowItWorksDialogProps) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>How it works</DialogTitle>
          <DialogDescription>
            Three steps from upload to payout.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          <StepCard
            step="01"
            title="Drop your file"
            caption="Up to 2 GB. Any file type."
          >
            <div className="bg-hop-bg border-hop-border flex items-center gap-2.5 rounded-md border p-2.5">
              <div className="bg-hop-hover text-hop-muted flex size-8 shrink-0 items-center justify-center rounded text-[0.625rem] font-mono uppercase">
                pdf
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.75rem] font-medium">
                  portfolio-2026.pdf
                </p>
                <div className="bg-hop-hover mt-1.5 h-1 overflow-hidden rounded-full">
                  <div className="bg-hop-text h-full w-[78%]" />
                </div>
                <p className="text-hop-muted mt-1 text-[0.625rem] tabular-nums">
                  Uploading… 78%
                </p>
              </div>
            </div>
          </StepCard>

          <StepCard
            step="02"
            title="Set a price"
            caption="Your link, your price."
          >
            <div className="bg-hop-bg border-hop-border flex flex-col gap-2 rounded-md border p-2.5">
              <div>
                <div className="text-hop-muted text-[0.625rem] tracking-[0.12em] uppercase">
                  Title
                </div>
                <div className="mt-1 truncate text-[0.75rem] font-medium">
                  Portfolio template
                </div>
              </div>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-hop-muted text-[0.625rem] tracking-[0.12em] uppercase">
                    Price
                  </div>
                  <div className="mt-0.5 font-mono text-[1rem] font-semibold tabular-nums">
                    £9.00
                  </div>
                </div>
                <div className="bg-hop-text text-hop-bg shrink-0 rounded-full px-2.5 py-1 text-[0.625rem] font-medium">
                  Publish
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard
            step="03"
            title="Get paid"
            caption="Direct to your bank."
          >
            <div className="bg-hop-bg border-hop-border flex items-start gap-2.5 rounded-md border p-2.5">
              <div className="bg-hop-text mt-1 size-2 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[0.75rem] font-medium">New sale</p>
                  <p className="text-hop-muted text-[0.625rem] tabular-nums">
                    just now
                  </p>
                </div>
                <p className="text-hop-muted mt-0.5 truncate text-[0.6875rem] tabular-nums">
                  portfolio-2026.pdf · £9.00
                </p>
              </div>
            </div>
          </StepCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepCard({
  step,
  title,
  caption,
  children,
}: {
  step: string;
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-hop-surface border-hop-border flex flex-col gap-3 rounded-2xl border p-4">
      <div className="text-hop-muted text-[0.6875rem] font-medium tracking-[0.18em] tabular-nums uppercase">
        {step}
      </div>
      <div className="text-[0.9375rem] font-semibold tracking-tight">
        {title}
      </div>
      {children}
      <p className="text-hop-muted mt-auto text-[0.75rem]">{caption}</p>
    </div>
  );
}
