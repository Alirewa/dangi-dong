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
        Bottom padding clears the fixed mobile nav plus the iOS home indicator.
        On desktop that nav is gone, so the padding goes with it.
      */}
      <main className={hideNav ? 'mx-auto max-w-2xl pb-2' : 'mx-auto max-w-2xl pb-24 md:pb-4'}>
        {children}
        <Footer />
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
