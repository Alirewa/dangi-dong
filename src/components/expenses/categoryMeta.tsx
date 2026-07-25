import {
  Car,
  Home,
  Lightbulb,
  MoreHorizontal,
  PartyPopper,
  ShoppingCart,
  Sofa,
  UtensilsCrossed,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import type { ExpenseCategory } from '@/types/dong';

export const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  rent: Home,
  utilities: Lightbulb,
  internet: Wifi,
  groceries: ShoppingCart,
  food: UtensilsCrossed,
  transport: Car,
  household: Sofa,
  fun: PartyPopper,
  other: MoreHorizontal,
};
