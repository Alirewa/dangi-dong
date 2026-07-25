'use client';

import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import { cn } from '@/lib/utils';

/**
 * A person's name, with a quiet "(you)" marker for the app's owner.
 *
 * Deliberately not used in the export cards or the text summary: "(شما)" is
 * true for the person holding the phone and misleading for everyone who
 * receives the image.
 */
export function PersonName({
  personId,
  name,
  className,
}: {
  personId: string;
  name: string;
  className?: string;
}) {
  const { t } = useT();
  const selfPersonId = useDongStore((s) => s.settings.selfPersonId);

  return (
    <span className={cn('truncate', className)}>
      {name}
      {personId === selfPersonId && (
        <span className="ms-1 text-xs font-normal text-muted">({t.common.you})</span>
      )}
    </span>
  );
}
