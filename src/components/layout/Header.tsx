'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Languages, Moon, Sun, SunMoon } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { useDongStore } from '@/store/dongStore';
import { Button } from '@/components/ui/Button';
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

  const theme = useDongStore((s) => s.settings.theme);
  const setTheme = useDongStore((s) => s.setTheme);
  const locale = useDongStore((s) => s.settings.locale);
  const setLocale = useDongStore((s) => s.setLocale);

  // In RTL, "back" points right.
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  // Cycles light → dark → system, matching the three-state setting.
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const ThemeIcon = theme === 'dark' ? Sun : theme === 'system' ? SunMoon : Moon;
  const themeLabel =
    theme === 'light'
      ? t.settings.themeLight
      : theme === 'dark'
        ? t.settings.themeDark
        : t.settings.themeSystem;

  const items = navItems(t);

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-2 py-2">
        {back && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            icon={<BackIcon className="size-4" aria-hidden="true" />}
          >
            {t.common.back}
          </Button>
        )}

        <h1 className="min-w-0 flex-1 truncate px-1 text-base font-semibold">{title}</h1>

        {/* Desktop navigation. The bottom bar is hidden at this breakpoint. */}
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

        {actions}

        <span className="mx-1 hidden h-6 w-px bg-border md:inline-block" aria-hidden="true" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')}
          icon={<Languages className="size-4" aria-hidden="true" />}
        >
          {locale === 'fa' ? 'EN' : 'فا'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(nextTheme)}
          icon={<ThemeIcon className="size-4" aria-hidden="true" />}
        >
          <span className="hidden sm:inline">{themeLabel}</span>
        </Button>
      </div>
    </header>
  );
}
