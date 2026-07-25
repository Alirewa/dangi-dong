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
}: {
  title: string;
  back?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="min-h-dvh">
      <Header title={title} back={back} actions={actions} />

      {/*
        Bottom padding reserves room for the fixed footer, plus the fixed mobile
        nav underneath it, so the last row of content is never covered.
      */}
      <main
        className={
          hideNav
            ? 'mx-auto w-full max-w-2xl pb-[calc(2.5rem+env(safe-area-inset-bottom))]'
            : 'mx-auto w-full max-w-2xl pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-[calc(3rem+env(safe-area-inset-bottom))]'
        }
      >
        {children}
      </main>

      <Footer withNav={!hideNav} />
      {!hideNav && <BottomNav />}
    </div>
  );
}
