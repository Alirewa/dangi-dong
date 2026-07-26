'use client';

import { Avatar } from './Avatar';
import { useIsSelf } from './PersonName';

/**
 * Avatar that highlights itself when it belongs to the app owner.
 *
 * A wrapper rather than a `self` prop threaded through every call site: the
 * owner id lives in the store, and every list that renders people would
 * otherwise have to look it up.
 */
export function PersonAvatar({
  personId,
  name,
  color,
  size = 'md',
  className,
}: {
  personId: string;
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const isSelf = useIsSelf(personId);
  return <Avatar name={name} color={color} size={size} self={isSelf} className={className} />;
}
