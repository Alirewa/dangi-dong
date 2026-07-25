import { Settings, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { Dict } from '@/i18n';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** path prefixes that should light this item up */
  match: string[];
}

/** Single source of truth so the mobile bar and the desktop header cannot drift. */
export function navItems(t: Dict): NavItem[] {
  return [
    { href: '/', label: t.nav.groups, icon: Wallet, match: ['/', '/group', '/settle'] },
    { href: '/people/', label: t.nav.people, icon: Users, match: ['/people'] },
    { href: '/settings/', label: t.nav.settings, icon: Settings, match: ['/settings'] },
  ];
}

export function isActive(item: NavItem, pathname: string): boolean {
  return item.match.some((m) => (m === '/' ? pathname === '/' : pathname.startsWith(m)));
}
