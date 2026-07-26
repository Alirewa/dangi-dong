import { cn } from '@/lib/utils';

/** First grapheme of the name — works for Persian and Latin alike. */
function initial(name: string): string {
  return [...name.trim()][0] ?? '؟';
}

export function Avatar({
  name,
  color,
  size = 'md',
  self = false,
  className,
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  /** the app owner — gets a ring so they can find themselves in a list */
  self?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: 'size-7 text-xs',
    md: 'size-9 text-sm',
    lg: 'size-12 text-base',
  };

  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        sizes[size],
        // A ring in the brand colour, offset against the page so it reads as a
        // highlight rather than a border on the circle itself.
        self && 'ring-2 ring-primary ring-offset-2 ring-offset-surface',
        className
      )}
    >
      {initial(name)}
    </span>
  );
}
