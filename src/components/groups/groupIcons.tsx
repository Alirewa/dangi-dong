import {
  Building2,
  Car,
  Clapperboard,
  Coffee,
  Home,
  PartyPopper,
  Plane,
  ShoppingCart,
  Umbrella,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import type { GroupIconKey, GroupMode } from '@/types/dong';

export const GROUP_ICONS: Record<GroupIconKey, LucideIcon> = {
  home: Home,
  utensils: UtensilsCrossed,
  plane: Plane,
  party: PartyPopper,
  car: Car,
  coffee: Coffee,
  beach: Umbrella,
  movie: Clapperboard,
  cart: ShoppingCart,
  building: Building2,
};

/**
 * Emoji values written by v1 of the store, kept so a migration (and any old
 * backup file being imported) can map them onto icon keys.
 */
const LEGACY_EMOJI_TO_ICON: Record<string, GroupIconKey> = {
  '🏠': 'home',
  '🍽️': 'utensils',
  '🍽': 'utensils',
  '✈️': 'plane',
  '✈': 'plane',
  '🎉': 'party',
  '🚗': 'car',
  '☕': 'coffee',
  '🏖️': 'beach',
  '🏖': 'beach',
  '🎬': 'movie',
  '🛒': 'cart',
  '🏢': 'building',
};

/** Accepts an icon key, a legacy emoji, or anything else, and always returns a key. */
export function toIconKey(value: unknown, mode: GroupMode = 'monthly'): GroupIconKey {
  if (typeof value === 'string') {
    if (value in GROUP_ICONS) return value as GroupIconKey;
    const mapped = LEGACY_EMOJI_TO_ICON[value];
    if (mapped) return mapped;
  }
  return defaultIconFor(mode);
}

export function defaultIconFor(mode: GroupMode): GroupIconKey {
  return mode === 'monthly' ? 'home' : 'utensils';
}

export function GroupIcon({ icon, className }: { icon: GroupIconKey; className?: string }) {
  const Icon = GROUP_ICONS[icon] ?? Home;
  return <Icon className={className} aria-hidden="true" />;
}
