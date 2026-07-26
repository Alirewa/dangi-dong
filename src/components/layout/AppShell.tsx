import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

export interface Crumb {
  label: string;
  href: string;
}

export function AppShell({
  title,
  parents = [],
  back,
  actions,
  children,
  hideNav = false,
  wide = false,
}: {
  title: string;
  /**
   * Ancestors, outermost first. Every level stays a link however deep the page
   * is, so a user three screens in can jump straight back to any of them.
   */
  parents?: Crumb[];
  back?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
  /** widen the content column so a multi-column grid has room on desktop */
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh">
      <Header back={back} actions={actions} />

      {/*
        Bottom padding reserves room for the fixed footer, plus the fixed mobile
        nav underneath it, so the last row of content is never covered.
      */}
      <main
        className={[
          'mx-auto w-full',
          wide ? 'max-w-5xl' : 'max-w-2xl',
          hideNav
            ? 'pb-[calc(2.5rem+env(safe-area-inset-bottom))]'
            : 'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(3rem+env(safe-area-inset-bottom))]',
        ].join(' ')}
      >
        {/*
          The page title lives here rather than in the header bar, so the bar
          holds only controls and the title can be as long as it needs to be
          without truncating.
        */}
        <div className="px-4 pt-4">
          {parents.length > 0 && (
            <nav
              aria-label="breadcrumb"
              className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted"
            >
              {parents.map((crumb) => (
                <span key={crumb.href} className="flex items-center gap-1">
                  <Link href={crumb.href} className="transition-colors hover:text-primary">
                    {crumb.label}
                  </Link>
                  {/*
                    The chevron follows the reading direction: it already points
                    left for Persian, and is flipped for English. Rotating it in
                    RTL instead pointed it back at the parent.
                  */}
                  <ChevronLeft className="size-3.5 shrink-0 ltr:rotate-180" aria-hidden="true" />
                </span>
              ))}
              {/* The current page closes the trail; not a link, it is here. */}
              <span aria-current="page" className="truncate text-foreground">
                {title}
              </span>
            </nav>
          )}
          <h1 className={`text-center text-xl font-bold ${parents.length > 0 ? 'mt-4' : ''}`}>
            {title}
          </h1>
        </div>

        {children}
      </main>

      <Footer withNav={!hideNav} />
      {!hideNav && <BottomNav />}
    </div>
  );
}
