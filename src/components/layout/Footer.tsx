export const AUTHOR_HANDLE = '@Alirewa';
export const AUTHOR_URL = 'https://github.com/Alirewa';

export function Footer() {
  return (
    <footer className="px-4 pb-4 pt-6 text-center">
      <a
        href={AUTHOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted transition-colors hover:text-primary"
      >
        by {AUTHOR_HANDLE}
      </a>
    </footer>
  );
}
