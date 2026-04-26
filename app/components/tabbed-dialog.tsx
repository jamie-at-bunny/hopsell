import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";

interface TabbedDialogTab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabbedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  tabs: TabbedDialogTab[];
  defaultTab?: string;
  disablePointerDismissal?: boolean;
}

export function TabbedDialog({
  open,
  onOpenChange,
  title,
  description,
  tabs,
  defaultTab,
  disablePointerDismissal,
}: TabbedDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      disablePointerDismissal={disablePointerDismissal}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-[700px]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <Tabs
          defaultValue={defaultTab ?? tabs[0]?.value}
          orientation="vertical"
          className="flex h-[500px]"
        >
          <div className="hidden w-48 shrink-0 border-r py-3 pl-3 md:block">
            <TabsList
              variant="line"
              className="w-full flex-col items-stretch"
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="justify-start"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                {tab.content}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
