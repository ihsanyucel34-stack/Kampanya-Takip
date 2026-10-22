import {
  Fuel,
  Laptop,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Utensils,
  type LucideIcon,
} from 'lucide-react-native';

import type { CategoryId } from '../types';

const ICONS: Record<CategoryId, LucideIcon> = {
  akaryakit: Fuel,
  market: ShoppingCart,
  eticaret: ShoppingBag,
  restoran: Utensils,
  giyim: Shirt,
  elektronik: Laptop,
  seyahat: Plane,
};

export function CategoryIcon({
  category,
  color,
  size = 16,
}: {
  category: CategoryId;
  color: string;
  size?: number;
}) {
  const Icon = ICONS[category];
  return <Icon color={color} size={size} />;
}
