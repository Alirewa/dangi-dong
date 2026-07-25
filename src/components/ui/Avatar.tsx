import { cn } from '@/lib/utils';

/** First grapheme of the name — works for Persian and Latin alike. */
function initial(name: string): string {
  return [...name.trim()][0] ?? '؟';
}

export function Avatar({
  name,
  color,
  size = 'md',
  className,
}: {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
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
        className
      )}
    >
      {initial(name)}
    </span>
  );
}
