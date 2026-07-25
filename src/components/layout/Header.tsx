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

export function Header({
  title,
  back = false,
  actions,
}: {
  title: string;
  back?: boolean;
  actions?: ReactNode;
}) {
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
          Mobile keeps only what belongs to this screen: back on one side, the
          page's own actions on the other, title centred between them. Language
          and theme live in Settings, so repeating them in a narrow header was
          just clutter.
        */}
        {/*
          Desktop navigation sits at the start of the bar (right in Persian),
          with the page title at the far end. Language and theme are gone from
          the header entirely — both live in Settings.
        */}
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

        {/* Mobile only: back on the leading edge. */}
        <div className="flex min-w-11 shrink-0 items-center md:hidden">
          {back && (
            <IconButton label={t.common.back} onClick={() => router.back()}>
              <BackIcon className="size-5" aria-hidden="true" />
            </IconButton>
          )}
        </div>

        <h1 className="order-none min-w-0 flex-1 truncate text-center text-base font-semibold md:order-last md:text-end">
          {title}
        </h1>

        <div className="flex min-w-11 shrink-0 items-center justify-end gap-1 md:min-w-0">
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
      </div>
    </header>
  );
}
