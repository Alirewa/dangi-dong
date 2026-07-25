import type { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

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
      <main className={hideNav ? 'mx-auto max-w-2xl pb-10' : 'mx-auto max-w-2xl pb-28 md:pb-10'}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
