'use client';

import Link from 'next/link';
import { useT } from '@/hooks/useT';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber } from '@/lib/format';

export default function NotFound() {
  const { t, locale } = useT();

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <EmptyState
        // Persian digits were hardcoded here, so English mode showed ۴۰۴.
        title={formatNumber(404, locale)}
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
