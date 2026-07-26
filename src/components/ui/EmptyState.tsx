import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && (
        <div className="text-muted" aria-hidden="true">
          {icon}
        </div>
      )}
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
