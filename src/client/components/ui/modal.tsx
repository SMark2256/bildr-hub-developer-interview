import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
export function Modal({
  title,
  description,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-backdrop fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content
          className="modal-surface fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 shadow-xl"
          onFocusOutside={(event) => {
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest(
                "[data-radix-popper-content-wrapper], [data-radix-select-content]",
              )
            )
              event.preventDefault();
          }}
          onInteractOutside={(event) => {
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest(
                "[data-radix-popper-content-wrapper], [data-radix-select-content]",
              )
            )
              event.preventDefault();
          }}
        >
          <Dialog.Title className="pr-10 text-xl font-semibold">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-1 pr-10 text-sm text-muted-foreground">
            {description}
          </Dialog.Description>
          <Dialog.Close asChild>
            <Button
              className="absolute right-4 top-4"
              size="icon"
              variant="ghost"
              aria-label="Bezárás"
            >
              <X />
            </Button>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
