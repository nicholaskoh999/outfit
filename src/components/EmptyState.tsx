import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

/** Light editorial empty state — a hairline and whitespace, not a card box. */
export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="border-t hairline pt-8 pb-12 animate-fade-in">
      <p className="display text-2xl mb-2.5">{title}</p>
      <p className="text-sm text-ink-soft font-light max-w-sm leading-relaxed">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
