'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/hooks/useT';
import { cn } from '@/lib/utils';
import { isActive, navItems } from './navItems';

/**
 * Mobile and tablet only. On desktop the same destinations live in the header
 * (see Header), because a fixed three-item bar pinned to the bottom of a wide
 * window reads as a phone UI bolted onto a desktop page.
 */
export function BottomNav() {
  const { t } = useT();
  const pathname = usePathname();
  const items = navItems(t);

  return (
    <nav
      aria-label={t.nav.groups}
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted hover:text-foreground'
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
