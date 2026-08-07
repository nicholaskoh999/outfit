import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="border hairline rounded-card px-8 py-14 text-center animate-fade-in">
      <p className="display text-2xl mb-3">{title}</p>
      <p className="text-sm text-ink-soft font-light max-w-sm mx-auto leading-relaxed">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
