import {
  Car,
  Home,
  Lightbulb,
  MoreHorizontal,
  PartyPopper,
  ShoppingBasket,
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
  // Trolley for a supermarket run, basket for the smaller household top-up.
  supermarket: ShoppingCart,
  groceries: ShoppingBasket,
  food: UtensilsCrossed,
  transport: Car,
  household: Sofa,
  fun: PartyPopper,
  other: MoreHorizontal,
};
