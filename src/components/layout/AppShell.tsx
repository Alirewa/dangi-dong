import type { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

export function AppShell({
  title,
  back,
  actions,
  children,
  hideNav = false,
  wide = false,
}: {
  title: string;
  back?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
  /** widen the content column so a multi-column grid has room on desktop */
  wide?: boolean;
}) {
  return (
    <div className="min-h-dvh">
      <Header title={title} back={back} actions={actions} />

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
        {children}
      </main>

      <Footer withNav={!hideNav} />
      {!hideNav && <BottomNav />}
    </div>
  );
}
