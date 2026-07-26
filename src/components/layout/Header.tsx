'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/utils';
import { isActive, navItems } from './navItems';

export function Header({ back = false, actions }: { back?: boolean; actions?: ReactNode }) {
  const { t, isRtl } = useT();
  const router = useRouter();
  const pathname = usePathname();

  // In RTL, "back" points right.
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  const items = navItems(t);

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      {/*
        A minimum height rather than padding alone: pages with action buttons
        were noticeably taller than pages without, so the bar appeared to
        change size as you navigated. At py-2 it was also too cramped to read.
      */}
      <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-2 px-2 py-2 md:min-h-14">
        {/*
          Page controls (back, edit) sit at the start of the bar — right in
          Persian — and navigation at the far end. The page title is no longer
          here at all: it lives in the body as a breadcrumb, which leaves the
          bar to hold only controls.
        */}
        <div className="flex shrink-0 items-center gap-1">
          {back && (
            <IconButton label={t.common.back} onClick={() => router.back()} className="md:hidden">
              <BackIcon className="size-5" aria-hidden="true" />
            </IconButton>
          )}
          {back && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              icon={<BackIcon className="size-4" aria-hidden="true" />}
              className="hidden md:inline-flex"
            >
              {t.common.back}
            </Button>
          )}
          {actions}
        </div>

        <span className="flex-1" aria-hidden="true" />

        <nav aria-label={t.nav.groups} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => {
              const active = isActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary-soft text-primary'
                        : 'text-muted hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Mobile navigation is the fixed bottom bar, so nothing more here. */}
      </div>
    </header>
  );
}
