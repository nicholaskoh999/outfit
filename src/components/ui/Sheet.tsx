import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Visually hidden context for screen readers; falls back to title. */
  description?: string;
  children: ReactNode;
  /** bottom sheet on mobile, right panel on desktop */
  side?: "bottom" | "right";
}

/**
 * Minimal sheet built on Radix Dialog. Bottom sheet on mobile,
 * side panel on desktop — styling is entirely ours, not shadcn defaults.
 */
export function Sheet({ open, onOpenChange, title, description, children, side = "bottom" }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/25 backdrop-blur-[2px] animate-overlay-in" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={
            side === "bottom"
              ? "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto bg-paper border-t hairline rounded-t-[10px] animate-sheet-up sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:w-[420px] sm:rounded-none sm:border-t-0 sm:border-l sm:animate-sheet-in-right"
              : "fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] overflow-y-auto bg-paper border-l hairline animate-sheet-in-right"
          }
        >
          <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur px-6 pt-5 pb-4 border-b hairline flex items-baseline justify-between">
            <Dialog.Title className="display text-xl">{title}</Dialog.Title>
            <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
            <Dialog.Close className="label-caps hover:text-ink transition-colors cursor-pointer">
              Close
            </Dialog.Close>
          </div>
          <div className="px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
