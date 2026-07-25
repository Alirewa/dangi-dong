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
    /*
     * Column flex with a min-height of the viewport, so the footer settles at
     * the bottom on short pages and simply follows the content on long ones.
     * Without `flex-1` on <main> the footer floats mid-screen and its position
     * shifts from page to page.
     */
    <div className="flex min-h-dvh flex-col">
      <Header title={title} back={back} actions={actions} />

      <main className="mx-auto w-full max-w-2xl flex-1">{children}</main>

      {/* Bottom padding clears the fixed mobile nav plus the iOS home
          indicator, so the footer sits just above it rather than under it. */}
      <div className={hideNav ? '' : 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0'}>
        <Footer />
      </div>

      {!hideNav && <BottomNav />}
    </div>
  );
}
