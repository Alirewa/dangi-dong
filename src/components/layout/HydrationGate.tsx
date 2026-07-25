'use client';

import type { ReactNode } from 'react';
import { useDongStore } from '@/store/dongStore';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Renders a skeleton until the persisted store is available.
 *
 * Every page that reads persisted state sits inside this. Without it the first
 * client frame shows an empty-state screen ("no groups yet") and then flips to
 * real content, which reads as a bug.
 */
export function HydrationGate({ children }: { children: ReactNode }) {
  const hydrated = useDongStore((s) => s.hydrated);

  if (!hydrated) {
    return (
      <div className="space-y-3 p-4" aria-busy="true">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
