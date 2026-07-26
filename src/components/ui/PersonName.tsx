'use client';

import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import { cn } from '@/lib/utils';

/** True when this id is the app owner. */
export function useIsSelf(personId: string): boolean {
  const selfPersonId = useDongStore((s) => s.settings.selfPersonId);
  return personId === selfPersonId;
}

/**
 * A person's name, with a quiet "(you)" marker for the app's owner.
 *
 * The marker is suppressed when the name already *is* the word for "you" —
 * an un-named owner would otherwise render as "شما (شما)".
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
  const isSelf = useIsSelf(personId);
  const showMarker = isSelf && name.trim() !== t.common.you;

  return (
    <span className={cn('truncate', className)}>
      {name}
      {showMarker && <span className="ms-1 text-xs font-normal text-muted">({t.common.you})</span>}
    </span>
  );
}
