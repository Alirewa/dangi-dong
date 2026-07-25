export const AUTHOR_HANDLE = '@Alirewa';
export const AUTHOR_URL = 'https://github.com/Alirewa';
export const REPO_URL = 'https://github.com/Alirewa/dangi-dong';

/**
 * Pinned to the bottom of the viewport, directly above the mobile nav.
 *
 * Laying it out in normal flow meant its position depended on how much content
 * a page had, so the credit line jumped around between screens. Fixing it keeps
 * it in exactly one place everywhere; AppShell reserves matching bottom padding
 * so nothing scrolls underneath it.
 */
export function Footer({ withNav = true }: { withNav?: boolean }) {
  return (
    <footer
      className={
        'pointer-events-none fixed inset-x-0 z-20 flex justify-center pb-2 pt-1 ' +
        (withNav
          ? 'bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-[env(safe-area-inset-bottom)]'
          : 'bottom-[env(safe-area-inset-bottom)]')
      }
    >
      <a
        href={AUTHOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto rounded-full bg-background/80 px-3 py-1 text-xs text-muted backdrop-blur transition-colors hover:text-primary"
      >
        by {AUTHOR_HANDLE}
      </a>
    </footer>
  );
}
