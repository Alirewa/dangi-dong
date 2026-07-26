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

  // Top-level screens have neither a back button nor page actions, so on mobile
  // the bar would be an empty strip — navigation is the fixed bottom bar there.
  // Desktop still needs it, because that is where the nav lives.
  const emptyOnMobile = !back && !actions;

  return (
    <header
      className={cn(
        'safe-top sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur',
        emptyOnMobile && 'hidden md:block'
      )}
    >
      <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-2 px-2 py-2 md:min-h-14">
        {/*
          Leading edge — right in Persian — with back first and the page action
          immediately after it, so the two controls that belong to this screen
          read as one group. On mobile the action stays at the opposite end,
          where a thumb reaches it without covering the back button.
        */}
        {back && (
          <>
            <IconButton
              label={t.common.back}
              onClick={() => router.back()}
              className="order-1 md:hidden"
            >
              <BackIcon className="size-5" aria-hidden="true" />
            </IconButton>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              icon={<BackIcon className="size-4" aria-hidden="true" />}
              className="order-1 hidden md:inline-flex"
            >
              {t.common.back}
            </Button>
          </>
        )}

        {/*
          `order` rather than rendering `actions` twice: two copies would mean
          two focusable controls with the same label.
        */}
        <span className="order-2 flex-1 md:order-3" aria-hidden="true" />

        {actions && <span className="order-3 flex items-center md:order-2">{actions}</span>}

        <nav aria-label={t.nav.groups} className="order-4 hidden md:block">
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
      </div>
    </header>
  );
}
