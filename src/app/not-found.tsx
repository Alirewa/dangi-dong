'use client';

import Link from 'next/link';
import { useT } from '@/hooks/useT';
import { EmptyState } from '@/components/ui/EmptyState';

export default function NotFound() {
  const { t } = useT();

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <EmptyState
        title="۴۰۴"
        description={t.appTagline}
        action={
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg"
          >
            {t.nav.groups}
          </Link>
        }
      />
    </div>
  );
}
